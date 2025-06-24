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

    // 获取用户基本信息（使用实际的数据库字段）
    const user = await executeQuerySingle(
      "SELECT image_num, is_adminer, created_at FROM users WHERE id = ?",
      [session.user.id],
    )

    // 获取图片统计
    const imageStats = await executeQuerySingle<{ total: number }>(
      "SELECT COUNT(*) as total FROM images WHERE user_id = ?",
      [session.user.id],
    )

    // 获取相册统计
    const albumStats = await executeQuerySingle<{ total: number }>(
      "SELECT COUNT(*) as total FROM albums WHERE user_id = ?",
      [session.user.id],
    )

    // 获取本月上传统计
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyStats = await executeQuerySingle<{ total: number }>(
      "SELECT COUNT(*) as total FROM images WHERE user_id = ? AND created_at >= ?",
      [session.user.id, currentMonth],
    )

    // 获取存储使用总量
    const storageUsed = await executeQuerySingle<{ total_size: number }>(
      "SELECT COALESCE(SUM(size), 0) as total_size FROM images WHERE user_id = ?",
      [session.user.id],
    )

    // 获取存储使用情况按存储类型分组
    const storageByProvider = await executeQuery(
      "SELECT strategy_id, SUM(size) as total_size FROM images WHERE user_id = ? GROUP BY strategy_id",
      [session.user.id],
    )

    const storageStats = storageByProvider.reduce(
      (acc, item) => {
        acc[`strategy_${item.strategy_id || 'default'}`] = Number(item.total_size) || 0
        return acc
      },
      {} as Record<string, number>,
    )

    // 计算使用天数
    const createdAt = new Date(user?.created_at || Date.now())
    const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      user: {
        storageQuota: 10737418240, // 10GB default
        storageUsed: Number(storageUsed?.total_size) || 0,
        isPremium: !!user?.is_adminer,
        daysSinceCreation,
      },
      stats: {
        totalImages: user?.image_num || imageStats?.total || 0,
        totalAlbums: albumStats?.total || 0,
        monthlyUploads: monthlyStats?.total || 0,
        storageByProvider: storageStats,
      },
    })
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
