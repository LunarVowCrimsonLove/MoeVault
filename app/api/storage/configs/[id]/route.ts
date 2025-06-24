import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const configId = params.id

    // 验证配置是否属于当前用户
    const config = await executeQuerySingle(
      "SELECT * FROM storage_configs WHERE id = ? AND user_id = ?",
      [configId, session.user.id]
    )

    if (!config) {
      return NextResponse.json({ error: "Storage config not found" }, { status: 404 })
    }

    // 删除配置
    await executeQuery(
      "DELETE FROM storage_configs WHERE id = ? AND user_id = ?",
      [configId, session.user.id]
    )

    return NextResponse.json({
      success: true,
      message: "存储配置已删除"
    })
  } catch (error) {
    console.error("Delete storage config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const configId = params.id
    const { config, name, isActive } = await request.json()

    // 验证配置是否属于当前用户
    const existingConfig = await executeQuerySingle(
      "SELECT * FROM storage_configs WHERE id = ? AND user_id = ?",
      [configId, session.user.id]
    )

    if (!existingConfig) {
      return NextResponse.json({ error: "Storage config not found" }, { status: 404 })
    }

    // 更新配置
    await executeQuery(
      "UPDATE storage_configs SET config = ?, name = ?, is_active = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      [
        JSON.stringify(config),
        name || existingConfig.name,
        isActive !== undefined ? (isActive ? 1 : 0) : existingConfig.is_active,
        configId,
        session.user.id
      ]
    )

    return NextResponse.json({
      success: true,
      message: "存储配置已更新"
    })
  } catch (error) {
    console.error("Update storage config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
