import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const albums = await executeQuery(
      `
      SELECT 
        a.*,
        COUNT(i.id) as image_count
      FROM albums a
      LEFT JOIN images i ON a.id = i.album_id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `,
      [session.user.id],
    )

    return NextResponse.json({
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        description: album.description,
        isPrivate: !album.is_public, // is_public 和 is_private 是相反的
        isEncrypted: false, // 当前数据库不支持加密
        hasPassword: false, // 当前数据库不支持密码
        coverImage: null, // 当前数据库没有封面字段
        imageCount: album.image_count || 0, // 来自 COUNT 查询
        createdAt: album.created_at,
        updatedAt: album.updated_at,
      })),
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, isPrivate } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 })
    }

    // 使用实际的数据库字段（albums 表只有 name, description, user_id, is_public）
    const result = await executeQuery(
      "INSERT INTO albums (user_id, name, description, is_public) VALUES (?, ?, ?, ?)", 
      [
        session.user.id,
        name.trim(),
        description?.trim() || "",
        isPrivate ? 0 : 1, // is_public 和 is_private 是相反的
      ]
    )

    const albumId = (result as any).insertId
    const album = await executeQuerySingle("SELECT * FROM albums WHERE id = ?", [albumId])

    return NextResponse.json({
      success: true,
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        isPrivate: !album.is_public, // is_public 和 is_private 是相反的
        isEncrypted: false, // 当前数据库不支持加密
        hasPassword: false, // 当前数据库不支持密码
        coverImage: null, // 当前数据库没有封面
        imageCount: 0, // 新创建的相册图片数为0
        createdAt: album.created_at,
        updatedAt: album.updated_at,
      },
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to create album" }, { status: 500 })
  }
}
