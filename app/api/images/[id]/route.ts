import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"
import { StorageFactory } from "@/lib/storage/factory"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 })
    }

    // 获取图片信息并验证所有权
    const image = await executeQuerySingle(
      "SELECT * FROM images WHERE id = ? AND user_id = ?",
      [id, session.user.id]
    )

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // 从存储服务删除文件
    try {
      const storage = await StorageFactory.createProviderFromStrategy(image.strategy_id)
      await storage.delete(image.path)
    } catch (error) {
      console.error(`Failed to delete file ${image.path}:`, error)
      // 即使文件删除失败，也继续删除数据库记录
    }

    // 从数据库删除记录
    await executeQuery("DELETE FROM images WHERE id = ? AND user_id = ?", [id, session.user.id])

    return NextResponse.json({
      success: true,
      message: "图片删除成功",
    })
  } catch (error) {
    console.error("Delete image error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const { action, isPublic, albumId } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 })
    }

    // 验证图片所有权
    const image = await executeQuerySingle(
      "SELECT id FROM images WHERE id = ? AND user_id = ?",
      [id, session.user.id]
    )

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // 根据操作类型更新图片
    switch (action) {
      case "toggle_visibility":
        await executeQuery(
          "UPDATE images SET is_public = ? WHERE id = ? AND user_id = ?",
          [isPublic ? 1 : 0, id, session.user.id]
        )
        break

      case "move_to_album":
        await executeQuery(
          "UPDATE images SET album_id = ? WHERE id = ? AND user_id = ?",
          [albumId || null, id, session.user.id]
        )
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "图片更新成功",
    })
  } catch (error) {
    console.error("Update image error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
