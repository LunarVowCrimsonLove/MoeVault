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

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const albumId = searchParams.get("albumId")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // 构建查询条件
    let whereClause = "WHERE i.user_id = ?"
    const params: any[] = [session.user.id]

    if (albumId) {
      whereClause += " AND i.album_id = ?"
      params.push(albumId)
    }

    if (search) {
      whereClause += " AND (i.origin_name LIKE ? OR i.name LIKE ?)"
      params.push(`%${search}%`, `%${search}%`)
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM images i 
      ${whereClause}
    `
    const countResult = await executeQuerySingle<{ total: number }>(countQuery, params)
    const total = countResult?.total || 0

    // 获取图片列表（包含存储策略信息）
    const offset = (page - 1) * limit
    const imagesQuery = `
      SELECT 
        i.*,
        a.name as album_name,
        s.name as strategy_name, 
        s.type as storage_type
      FROM images i
      LEFT JOIN albums a ON i.album_id = a.id
      LEFT JOIN strategies s ON i.strategy_id = s.id
      ${whereClause}
      ORDER BY i.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `

    const images = await executeQuery(imagesQuery, [...params, limit, offset])

    return NextResponse.json({
      images: images.map((img) => ({
        id: img.id,
        filename: img.name,
        originalName: img.origin_name,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/uploads/${img.path}`,
        size: img.size,
        width: img.width,
        height: img.height,
        mimetype: img.mimetype,
        extension: img.extension,
        storage: img.storage_type || 'local',
        strategyName: img.strategy_name || '本地存储',
        createdAt: img.created_at,
        albumName: img.album_name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageIds } = await request.json()

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: "Invalid image IDs" }, { status: 400 })
    }

    // 获取要删除的图片信息
    const placeholders = imageIds.map(() => "?").join(",")
    const images = await executeQuery(`SELECT * FROM images WHERE user_id = ? AND id IN (${placeholders})`, [
      session.user.id,
      ...imageIds,
    ])

    if (images.length === 0) {
      return NextResponse.json({ error: "No images found" }, { status: 404 })
    }

    // 从存储服务删除文件
    for (const image of images) {
      try {
        const { StorageFactory } = await import("@/lib/storage/factory")
        // 使用策略ID获取存储服务
        const storage = await StorageFactory.createProviderFromStrategy(image.strategy_id)
        await storage.delete(image.path)
      } catch (error) {
        console.error(`Failed to delete file ${image.path}:`, error)
        // 即使文件删除失败，也继续删除数据库记录
      }
    }

    // 从数据库删除记录
    await executeQuery(`DELETE FROM images WHERE user_id = ? AND id IN (${placeholders})`, [
      session.user.id,
      ...imageIds,
    ])

    // 更新用户图片计数（通过触发器自动处理）
    // 无需手动更新 storage_used，因为它可能不存在于用户表中

    return NextResponse.json({
      success: true,
      deletedCount: images.length,
    })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
