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

    // 检查管理员权限 - 修复字段名
    const user = await executeQuerySingle("SELECT is_adminer FROM users WHERE id = ? AND is_adminer = 1", [
      session.user.id,
    ])

    if (!user) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // 获取用户统计
    const userStats = await executeQuerySingle(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premium,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as newThisMonth
      FROM users
    `)

    // 获取图片统计 - 修复字段名
    const imageStats = await executeQuerySingle(`
      SELECT 
        COUNT(*) as total,
        SUM(size) as totalSize,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as uploadedToday,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as uploadedThisMonth
      FROM images
    `)

    // 获取存储统计
    const storageStats = await executeQuery(`
      SELECT 
        strategy_id,
        SUM(size) as totalSize
      FROM images 
      GROUP BY strategy_id
    `)

    const storageByProvider = storageStats.reduce(
      (acc, item) => {
        const provider = item.strategy_id === 1 ? 'local' : 
                        item.strategy_id === 2 ? 'onedrive' : 
                        item.strategy_id === 3 ? 'aliyun' : 
                        item.strategy_id === 4 ? 'tencent' : 
                        item.strategy_id === 5 ? 'github' : 'unknown'
        acc[provider] = Number(item.totalSize) || 0
        return acc
      },
      {} as Record<string, number>,
    )

    const totalStorageUsed = Object.values(storageByProvider as Record<string, number>).reduce((sum, size) => sum + size, 0)

    return NextResponse.json({
      users: {
        total: userStats?.total || 0,
        active: userStats?.active || 0,
        premium: userStats?.premium || 0,
        newThisMonth: userStats?.newThisMonth || 0,
      },
      images: {
        total: imageStats?.total || 0,
        totalSize: imageStats?.totalSize || 0,
        uploadedToday: imageStats?.uploadedToday || 0,
        uploadedThisMonth: imageStats?.uploadedThisMonth || 0,
      },
      storage: {
        totalUsed: totalStorageUsed,
        byProvider: storageByProvider,
      },
      system: {
        uptime: process.uptime(),
        version: "1.0.0",
        lastBackup: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Admin stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
