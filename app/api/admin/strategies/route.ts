import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

// 获取所有存储策略
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

    // 获取所有存储策略
    const strategies = await executeQuery(`
      SELECT s.*, 
             COUNT(usa.id) as assigned_users_count,
             GROUP_CONCAT(DISTINCT u.name) as assigned_users
      FROM strategies s
      LEFT JOIN user_storage_assignments usa ON s.id = usa.strategy_id AND usa.is_active = 1
      LEFT JOIN users u ON usa.user_id = u.id
      GROUP BY s.id
      ORDER BY s.is_default DESC, s.name ASC
    `)

    return NextResponse.json({
      strategies: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        configs: typeof strategy.configs === 'string' ? JSON.parse(strategy.configs) : strategy.configs,
        isDefault: !!strategy.is_default,
        status: strategy.status,
        assignedUsersCount: strategy.assigned_users_count || 0,
        assignedUsers: strategy.assigned_users ? strategy.assigned_users.split(',') : [],
        createdAt: strategy.created_at,
        updatedAt: strategy.updated_at
      }))
    })

  } catch (error) {
    console.error("Get storage strategies error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 创建新的存储策略
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

    const { name, type, configs, isDefault = false, status = 'active' } = await request.json()

    if (!name || !type || !configs) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 验证存储类型
    const validTypes = ['local', 'onedrive', 'github', 'aliyun', 'tencent', 's3']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid storage type" }, { status: 400 })
    }

    // 如果设置为默认，先取消其他默认策略
    if (isDefault) {
      await executeQuery("UPDATE strategies SET is_default = 0")
    }

    // 创建新策略
    const result = await executeQuery(
      "INSERT INTO strategies (name, type, configs, is_default, status) VALUES (?, ?, ?, ?, ?)",
      [name, type, JSON.stringify(configs), isDefault ? 1 : 0, status]
    )

    const strategyId = (result as any).insertId

    return NextResponse.json({
      success: true,
      message: "存储策略创建成功",
      strategy: {
        id: strategyId,
        name,
        type,
        configs,
        isDefault,
        status
      }
    })

  } catch (error) {
    console.error("Create storage strategy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 更新存储策略
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

    const { strategyId, action, ...updateData } = await request.json()

    if (!strategyId || !action) {
      return NextResponse.json({ error: "Missing strategyId or action" }, { status: 400 })
    }

    // 验证策略是否存在
    const strategy = await executeQuerySingle(
      "SELECT id FROM strategies WHERE id = ?",
      [strategyId]
    )

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    switch (action) {
      case 'update':
        const { name, configs, status } = updateData
        await executeQuery(
          "UPDATE strategies SET name = ?, configs = ?, status = ? WHERE id = ?",
          [name, JSON.stringify(configs), status, strategyId]
        )
        break

      case 'toggle-status':
        const newStatus = updateData.status === 'active' ? 'inactive' : 'active'
        await executeQuery(
          "UPDATE strategies SET status = ? WHERE id = ?",
          [newStatus, strategyId]
        )
        break

      case 'set-default':
        // 先取消其他默认策略
        await executeQuery("UPDATE strategies SET is_default = 0")
        await executeQuery(
          "UPDATE strategies SET is_default = 1 WHERE id = ?",
          [strategyId]
        )
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "存储策略更新成功"
    })

  } catch (error) {
    console.error("Update storage strategy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 删除存储策略
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

    const { strategyId } = await request.json()

    if (!strategyId) {
      return NextResponse.json({ error: "Missing strategyId" }, { status: 400 })
    }

    // 检查是否有用户正在使用该策略
    const assignedUsers = await executeQuery(
      "SELECT COUNT(*) as count FROM user_storage_assignments WHERE strategy_id = ? AND is_active = 1",
      [strategyId]
    )

    if (assignedUsers[0].count > 0) {
      return NextResponse.json({ 
        error: `无法删除策略，还有 ${assignedUsers[0].count} 个用户正在使用该策略`
      }, { status: 400 })
    }

    // 检查是否为默认策略
    const strategy = await executeQuerySingle(
      "SELECT is_default FROM strategies WHERE id = ?",
      [strategyId]
    )

    if (strategy?.is_default) {
      return NextResponse.json({ 
        error: "无法删除默认存储策略"
      }, { status: 400 })
    }

    // 删除策略
    await executeQuery("DELETE FROM strategies WHERE id = ?", [strategyId])

    return NextResponse.json({
      success: true,
      message: "存储策略删除成功"
    })

  } catch (error) {
    console.error("Delete storage strategy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
