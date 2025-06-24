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

    // 从 storage_configs 表读取用户的存储配置
    const configs = await executeQuery(
      "SELECT * FROM storage_configs WHERE user_id = ? ORDER BY created_at DESC",
      [session.user.id]
    )

    // 转换数据格式
    const configsData = configs.map(config => ({
      id: config.id,
      provider: config.provider,
      name: config.name,
      isActive: !!config.is_active,
      config: typeof config.config === 'string' ? JSON.parse(config.config) : config.config,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }))

    return NextResponse.json({
      configs: configsData,
    })
  } catch (error) {
    console.error("Storage configs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider, config, name } = await request.json()

    if (!provider || !config) {
      return NextResponse.json({ error: "Provider and config are required" }, { status: 400 })
    }

    const displayName = name || `${provider.charAt(0).toUpperCase() + provider.slice(1)} Storage`

    // 检查是否已存在相同提供商的配置
    const existingConfig = await executeQuerySingle(
      "SELECT id FROM storage_configs WHERE user_id = ? AND provider = ?",
      [session.user.id, provider]
    )

    if (existingConfig) {
      // 更新现有配置
      await executeQuery(
        "UPDATE storage_configs SET config = ?, name = ?, is_active = 1, updated_at = NOW() WHERE user_id = ? AND provider = ?",
        [JSON.stringify(config), displayName, session.user.id, provider]
      )
      
      return NextResponse.json({
        success: true,
        message: "存储配置已更新",
        config: {
          id: existingConfig.id,
          provider,
          name: displayName,
          isActive: true,
          config
        }
      })
    } else {
      // 创建新配置
      const result = await executeQuery(
        "INSERT INTO storage_configs (user_id, provider, name, config, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())",
        [session.user.id, provider, displayName, JSON.stringify(config)]
      )

      return NextResponse.json({
        success: true,
        message: "存储配置已创建",
        config: {
          id: result.insertId,
          provider,
          name: displayName,
          isActive: true,
          config
        }
      })
    }
  } catch (error) {
    console.error("Create storage config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
