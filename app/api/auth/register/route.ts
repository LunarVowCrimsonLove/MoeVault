import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { executeQuery, executeQuerySingle } from "@/lib/database"
import { assignDefaultStorageToUser } from "@/lib/user-storage"

// 生成API Token
function generateApiToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 为新用户分配默认存储策略
async function assignDefaultStorageToUserLegacy(userId: string) {
  try {
    // 获取默认存储策略
    const defaultStrategy = await executeQuerySingle(
      "SELECT id, name, type FROM strategies WHERE is_default = 1 AND status = 'active' LIMIT 1"
    )

    if (!defaultStrategy) {
      console.log("No default storage strategy found")
      return
    }

    // 检查是否已经分配过
    const existing = await executeQuerySingle(
      "SELECT id FROM user_storage_assignments WHERE user_id = ? AND strategy_id = ?",
      [userId, defaultStrategy.id]
    )

    if (!existing) {
      // 分配默认存储策略给用户
      await executeQuery(
        `INSERT INTO user_storage_assignments 
         (user_id, strategy_id, is_default, is_active) 
         VALUES (?, ?, 1, 1)`,
        [userId, defaultStrategy.id]
      )

      console.log(`✅ Assigned default storage strategy "${defaultStrategy.name}" to user ${userId}`)
    }
  } catch (error) {
    console.error("Error in assignDefaultStorageToUser:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    // 验证输入
    if (!username || !email || !password) {
      return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度至少6位" }, { status: 400 })
    }

    // 检查用户是否已存在
    const existingUser = await executeQuerySingle("SELECT id FROM users WHERE email = ? OR name = ?", [
      email,
      username,
    ])

    if (existingUser) {
      return NextResponse.json({ error: "用户名或邮箱已存在" }, { status: 400 })
    }

    // 检查是否是第一个用户（决定是否设为管理员）
    const userCount = await executeQuerySingle("SELECT COUNT(*) as count FROM users")
    const isFirstUser = userCount?.count === 0

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12)

    // 生成API Token
    const apiToken = generateApiToken()

    // 生成用户ID
    const userId = crypto.randomUUID()

    // 创建用户
    await executeQuery(
      `INSERT INTO users (id, name, email, password, api_token, image_num, is_adminer) 
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        userId,
        username,
        email,
        passwordHash,
        apiToken,
        isFirstUser ? 1 : 0  // 第一个用户自动成为管理员
      ],
    )

    // 自动分配默认存储策略给新用户
    try {
      await assignDefaultStorageToUserLegacy(userId)
    } catch (storageError) {
      console.error("Failed to assign default storage to user:", storageError)
      // 即使存储分配失败，也不要阻塞注册成功
    }

    // 获取创建的用户信息
    const user = await executeQuerySingle("SELECT id, name, email, is_adminer FROM users WHERE id = ?", [userId])

    return NextResponse.json({
      success: true,
      message: isFirstUser ? "注册成功！您已被设为管理员。" : "注册成功！",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_adminer
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
