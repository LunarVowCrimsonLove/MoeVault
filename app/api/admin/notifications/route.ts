import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function POST(request: NextRequest) {
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

    const { title, message, type, userIds } = await request.json()

    if (!title || !message || !type || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 为每个用户创建通知记录
    const notificationPromises = userIds.map(async (userId) => {
      return executeQuery(
        `INSERT INTO notifications (id, user_id, type, title, message, created_at, read_status) 
         VALUES (?, ?, ?, ?, ?, NOW(), 0)`,
        [
          `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type,
          title,
          message
        ]
      )
    })

    await Promise.all(notificationPromises)

    return NextResponse.json({ 
      success: true, 
      message: `通知已发送给 ${userIds.length} 个用户` 
    })

  } catch (error) {
    console.error("Send notification error:", error)
    
    // 如果是表不存在的错误，先创建表
    if (error instanceof Error && error.message.includes("doesn't exist")) {
      try {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(255) PRIMARY KEY,
            user_id INT NOT NULL,
            type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_status TINYINT(1) DEFAULT 0,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `)
        
        return NextResponse.json({ 
          success: true, 
          message: "通知表已创建，请重试发送通知" 
        })
      } catch (createError) {
        console.error("Create notifications table error:", createError)
        return NextResponse.json({ error: "Failed to create notifications table" }, { status: 500 })
      }
    }
    
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

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

    // 获取最近的通知统计
    const stats = await executeQuerySingle(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN read_status = 0 THEN 1 END) as unread_notifications,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as today_notifications
      FROM notifications
    `)

    return NextResponse.json({ 
      success: true,
      stats: stats || { total_notifications: 0, unread_notifications: 0, today_notifications: 0 }
    })

  } catch (error) {
    console.error("Get notification stats error:", error)
    return NextResponse.json({ error: "Failed to get notification stats" }, { status: 500 })
  }
}
