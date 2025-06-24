import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 模拟通知数据，实际应用中从数据库获取
    const notifications = [
      {
        id: "notif_001",
        type: "success",
        title: "图片上传成功",
        message: "您的图片 'cute-anime.png' 已成功上传到OneDrive",
        timestamp: new Date(Date.now() - 300000), // 5分钟前
        read: false,
      },
      {
        id: "notif_002",
        type: "warning",
        title: "存储空间警告",
        message: "您的存储空间已使用85%，建议及时清理",
        timestamp: new Date(Date.now() - 3600000), // 1小时前
        read: false,
        action: {
          label: "查看详情",
          onClick: () => (window.location.href = "/settings"),
        },
      },
      {
        id: "notif_003",
        type: "info",
        title: "新功能上线",
        message: "图片分享功能已上线，快来体验吧！",
        timestamp: new Date(Date.now() - 86400000), // 1天前
        read: true,
      },
    ]

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
