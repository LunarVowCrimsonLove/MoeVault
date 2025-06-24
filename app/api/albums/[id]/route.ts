import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const album = await executeQuerySingle(
      `SELECT a.*, COUNT(i.id) as image_count 
       FROM albums a 
       LEFT JOIN images i ON a.id = i.album_id 
       WHERE a.id = ? AND a.user_id = ? 
       GROUP BY a.id`,
      [params.id, session.user.id],
    )

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    return NextResponse.json({
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverImageId: null, // 当前数据库没有封面字段
        isPrivate: !album.is_public, // is_public 和 is_private 是相反的
        createdAt: album.created_at,
        imageCount: album.image_count,
      },
    })
  } catch (error) {
    console.error("Album API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, isPrivate } = await request.json()

    // 验证相册所有权
    const album = await executeQuerySingle("SELECT id FROM albums WHERE id = ? AND user_id = ?", [
      params.id,
      session.user.id,
    ])

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    await executeQuery("UPDATE albums SET name = ?, description = ?, is_public = ? WHERE id = ?", [
      name,
      description || null,
      isPrivate ? 0 : 1, // is_public 和 is_private 是相反的
      params.id,
    ])

    const updatedAlbum = await executeQuerySingle("SELECT * FROM albums WHERE id = ?", [params.id])

    return NextResponse.json({
      success: true,
      album: {
        id: updatedAlbum.id,
        name: updatedAlbum.name,
        description: updatedAlbum.description,
        isPrivate: !updatedAlbum.is_public, // is_public 和 is_private 是相反的
        updatedAt: updatedAlbum.updated_at,
      },
    })
  } catch (error) {
    console.error("Album update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 验证相册所有权
    const album = await executeQuerySingle("SELECT id FROM albums WHERE id = ? AND user_id = ?", [
      params.id,
      session.user.id,
    ])

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    // 将相册中的图片移到未分类
    await executeQuery("UPDATE images SET album_id = NULL WHERE album_id = ?", [params.id])

    // 删除相册
    await executeQuery("DELETE FROM albums WHERE id = ?", [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Album delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
