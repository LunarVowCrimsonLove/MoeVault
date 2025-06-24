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
    const status = searchParams.get("status") || "all"

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (search) {
      whereClause += " AND (name LIKE ? OR email LIKE ?)"
      params.push(`%${search}%`, `%${search}%`)
    }

    if (status === "premium") {
      whereClause += " AND is_adminer = 1"
    } else if (status === "banned") {
      whereClause += " AND status = 'banned'"
    }    // 获取用户总数
    const countResult = await executeQuerySingle<{ total: number }>(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    )
    const total = countResult?.total || 0

    // 获取用户列表
    const offset = (page - 1) * limit
    const users = await executeQuery(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.created_at, 
        u.is_adminer, 
        u.image_num,
        COALESCE((SELECT SUM(i.size) FROM images i WHERE i.user_id = u.id), 0) as storage_used,
        u.api_token IS NOT NULL as has_token,
        COALESCE((SELECT COUNT(*) FROM albums a WHERE a.user_id = u.id), 0) as album_count,
        COALESCE((SELECT SUM(usa.quota) FROM user_storage_assignments usa WHERE usa.user_id = u.id AND usa.is_active = 1), 1024) as total_quota
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isPremium: !!user.is_adminer,
        totalImages: user.image_num || 0,
        totalAlbums: user.album_count || 0,
        storageUsed: Number(user.storage_used) || 0,
        storageQuota: (Number(user.total_quota) || 1) * 1024 * 1024 * 1024, // 转换GB为字节
        hasToken: !!user.has_token,
        joinDate: user.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const { userId, action, value } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }    switch (action) {
      case "togglePremium":
        await executeQuery(
          "UPDATE users SET is_adminer = ? WHERE id = ?",
          [value ? 1 : 0, userId]
        )
        break

      case "updateQuota":
        if (typeof value !== "number" || value < 0) {
          return NextResponse.json({ error: "Invalid quota value" }, { status: 400 })
        }
        // 更新用户存储分配中的配额
        await executeQuery(`
          UPDATE user_storage_assignments 
          SET quota = ? 
          WHERE user_id = ? AND is_default = 1
        `, [value, userId])
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin users update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
