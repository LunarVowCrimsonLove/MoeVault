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

    // 检查管理员权限
    const adminUser = await executeQuerySingle(
      "SELECT is_adminer FROM users WHERE id = ? AND is_adminer = 1", 
      [session.user.id]
    )

    if (!adminUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const storage = searchParams.get("storage") || "all"

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (search) {
      whereClause += " AND (i.origin_name LIKE ? OR i.name LIKE ?)"
      params.push(`%${search}%`, `%${search}%`)
    }

    if (storage !== "all") {
      whereClause += " AND i.strategy_id = ?"
      params.push(storage)
    }

    // 获取图片总数
    const countResult = await executeQuerySingle<{ total: number }>(
      `SELECT COUNT(*) as total FROM images i ${whereClause}`,
      params
    )
    const total = countResult?.total || 0    // 获取图片列表
    const offset = (page - 1) * limit
    const images = await executeQuery(`
      SELECT 
        i.id, i.name, i.origin_name, i.path, i.size, i.mimetype, i.extension,
        i.width, i.height, i.created_at, i.strategy_id, i.user_id,
        u.name as user_name, u.email as user_email,
        a.name as album_name,
        s.name as strategy_name, s.type as storage_type
      FROM images i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN albums a ON i.album_id = a.id
      LEFT JOIN strategies s ON i.strategy_id = s.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    return NextResponse.json({
      images: images.map(img => ({
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
        userId: img.user_id,
        userName: img.user_name,
        userEmail: img.user_email,
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
    console.error("Admin images API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 检查管理员权限
    const adminUser = await executeQuerySingle(
      "SELECT is_adminer FROM users WHERE id = ? AND is_adminer = 1", 
      [session.user.id]
    )

    if (!adminUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { imageIds } = await request.json()

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: "No images specified" }, { status: 400 })
    }

    // 获取要删除的图片信息
    const placeholders = imageIds.map(() => "?").join(",")
    const images = await executeQuery(
      `SELECT id, path, user_id FROM images WHERE id IN (${placeholders})`,
      imageIds
    )

    if (images.length === 0) {
      return NextResponse.json({ error: "Images not found" }, { status: 404 })
    }

    // 删除数据库记录
    await executeQuery(
      `DELETE FROM images WHERE id IN (${placeholders})`,
      imageIds
    )

    // 更新用户图片计数
    const userImageCounts = await executeQuery(`
      SELECT user_id, COUNT(*) as count 
      FROM images 
      WHERE user_id IN (${images.map(img => img.user_id).join(",")})
      GROUP BY user_id
    `)

    for (const userCount of userImageCounts) {
      await executeQuery(
        "UPDATE users SET image_num = ? WHERE id = ?",
        [userCount.count, userCount.user_id]
      )
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: images.length 
    })
  } catch (error) {
    console.error("Admin delete images error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
