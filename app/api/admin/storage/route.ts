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

    // 获取存储策略配置
    const strategies = await executeQuery(`
      SELECT 
        id, name, type, configs, is_default, status,
        created_at, updated_at
      FROM strategies
      ORDER BY is_default DESC, created_at ASC
    `)

    // 获取各存储的使用统计
    const storageStats = await executeQuery(`
      SELECT 
        strategy_id,
        COUNT(*) as file_count,
        SUM(size) as total_size
      FROM images 
      GROUP BY strategy_id
    `)

    const statsMap = storageStats.reduce((acc, stat) => {
      acc[stat.strategy_id] = {
        fileCount: stat.file_count,
        totalSize: Number(stat.total_size) || 0
      }
      return acc
    }, {} as Record<number, { fileCount: number; totalSize: number }>)

    // 获取系统配置
    const systemConfigs = await executeQuery(`
      SELECT config_key, config_value 
      FROM configs 
      WHERE config_key IN ('max_file_size', 'allowed_extensions', 'compression_quality')
    `)

    const configMap = systemConfigs.reduce((acc, config) => {
      acc[config.config_key] = config.config_value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      strategies: strategies.map(strategy => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        isDefault: !!strategy.is_default,
        status: strategy.status || "active",
        configs: JSON.parse(strategy.configs || "{}"),
        stats: statsMap[strategy.id] || { fileCount: 0, totalSize: 0 },
        createdAt: strategy.created_at,
        updatedAt: strategy.updated_at,
      })),
      systemConfigs: {
        maxFileSize: Number(configMap.max_file_size) || 10485760, // 10MB
        allowedExtensions: configMap.allowed_extensions ? 
          configMap.allowed_extensions.split(",") : 
          ["jpg", "jpeg", "png", "gif", "webp"],
        compressionQuality: Number(configMap.compression_quality) || 80,
      }
    })
  } catch (error) {
    console.error("Admin storage API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const { name, type, configs, isDefault } = await request.json()

    if (!name || !type || !configs) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 如果设为默认，取消其他默认策略
    if (isDefault) {
      await executeQuery("UPDATE strategies SET is_default = 0")
    }

    const result = await executeQuery(
      "INSERT INTO strategies (name, type, configs, is_default, status) VALUES (?, ?, ?, ?, ?)",
      [name, type, JSON.stringify(configs), isDefault ? 1 : 0, "active"]
    )

    return NextResponse.json({ 
      success: true, 
      strategyId: (result as any).insertId 
    })
  } catch (error) {
    console.error("Create storage strategy error:", error)
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

    const { strategyId, action, data } = await request.json()

    if (!strategyId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    switch (action) {
      case "update":
        const { name, configs, isDefault } = data
        if (isDefault) {
          await executeQuery("UPDATE strategies SET is_default = 0")
        }
        await executeQuery(
          "UPDATE strategies SET name = ?, configs = ?, is_default = ? WHERE id = ?",
          [name, JSON.stringify(configs), isDefault ? 1 : 0, strategyId]
        )
        break

      case "toggleStatus":
        const newStatus = data.status === "active" ? "inactive" : "active"
        await executeQuery(
          "UPDATE strategies SET status = ? WHERE id = ?",
          [newStatus, strategyId]
        )
        break

      case "setDefault":
        await executeQuery("UPDATE strategies SET is_default = 0")
        await executeQuery(
          "UPDATE strategies SET is_default = 1 WHERE id = ?",
          [strategyId]
        )
        break

      case "updateSystemConfig":
        const { configKey, configValue } = data
        await executeQuery(
          "INSERT INTO configs (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?",
          [configKey, configValue, configValue]
        )
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update storage strategy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
