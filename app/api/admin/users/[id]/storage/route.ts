import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id

    // 获取用户分配的存储配置
    const assignedStorages = await executeQuery(
      `SELECT usa.*, s.name, s.type, s.configs, s.status 
       FROM user_storage_assignments usa
       JOIN strategies s ON usa.strategy_id = s.id
       WHERE usa.user_id = ? AND usa.is_active = 1`,
      [userId]
    )

    // 获取所有可用的存储策略
    const availableStrategies = await executeQuery(
      `SELECT id, name, type, status 
       FROM strategies 
       WHERE status = 'active'
       ORDER BY name`
    )

    return NextResponse.json({
      assignedStorages: assignedStorages.map(storage => ({
        id: storage.id,
        strategyId: storage.strategy_id,
        name: storage.name,
        type: storage.type,
        isDefault: !!storage.is_default,
        quota: storage.quota || null,
        assignedAt: storage.created_at
      })),
      availableStrategies: availableStrategies.map(strategy => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status
      }))
    })

  } catch (error) {
    console.error("Get user storage assignments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id
    const { strategyId, isDefault, quota } = await request.json()

    if (!strategyId) {
      return NextResponse.json({ error: "Strategy ID is required" }, { status: 400 })
    }

    // 验证存储策略是否存在
    const strategy = await executeQuerySingle(
      "SELECT id, name, type FROM strategies WHERE id = ? AND status = 'active'",
      [strategyId]
    )

    if (!strategy) {
      return NextResponse.json({ error: "Storage strategy not found" }, { status: 404 })
    }

    // 检查是否已经分配了这个存储策略
    const existingAssignment = await executeQuerySingle(
      "SELECT id FROM user_storage_assignments WHERE user_id = ? AND strategy_id = ?",
      [userId, strategyId]
    )

    if (existingAssignment) {
      return NextResponse.json({ error: "Storage already assigned to user" }, { status: 400 })
    }

    // 如果设置为默认存储，取消其他默认存储
    if (isDefault) {
      await executeQuery(
        "UPDATE user_storage_assignments SET is_default = 0 WHERE user_id = ?",
        [userId]
      )
    }

    // 分配存储给用户
    await executeQuery(
      `INSERT INTO user_storage_assignments 
       (user_id, strategy_id, is_default, quota, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [userId, strategyId, isDefault ? 1 : 0, quota || null]
    )

    return NextResponse.json({
      success: true,
      message: `${strategy.name} 已分配给用户`
    })

  } catch (error) {
    console.error("Assign storage to user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id
    const { assignmentId } = await request.json()

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    // 删除存储分配
    await executeQuery(
      "DELETE FROM user_storage_assignments WHERE id = ? AND user_id = ?",
      [assignmentId, userId]
    )

    return NextResponse.json({
      success: true,
      message: "存储分配已移除"
    })

  } catch (error) {
    console.error("Remove storage assignment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
