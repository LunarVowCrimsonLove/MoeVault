import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserAvailableStorages } from "@/lib/user-storage"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }    // 使用新的工具函数获取用户可用存储
    const storages = await getUserAvailableStorages(session.user.id)    // 如果用户没有分配任何存储，返回本地存储作为默认
    if (storages.length === 0) {
      return NextResponse.json({
        storages: [{
          id: 'local',
          strategyId: 1,
          name: '本地存储',
          type: 'local',
          isDefault: true,
          quota: null,
          configs: {}
        }]
      })
    }    return NextResponse.json({ storages })

  } catch (error) {
    console.error("Get user available storages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
