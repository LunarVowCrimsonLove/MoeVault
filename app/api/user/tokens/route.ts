import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuerySingle, executeQuery } from "@/lib/database"
import crypto from "crypto"

// 生成API Token
function generateApiToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取用户的API Token
    const user = await executeQuerySingle(
      "SELECT api_token, created_at FROM users WHERE id = ?",
      [session.user.id]
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      token: user.api_token,
      createdAt: user.created_at,
      hasToken: !!user.api_token
    })
  } catch (error) {
    console.error("Get token error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === "reset") {
      // 重置API Token
      const newToken = generateApiToken()
      
      await executeQuery(
        "UPDATE users SET api_token = ? WHERE id = ?",
        [newToken, session.user.id]
      )

      return NextResponse.json({ 
        success: true,
        token: newToken,
        message: "API Token重置成功"
      })
    } else if (action === "generate") {
      // 为没有Token的用户生成Token
      const user = await executeQuerySingle(
        "SELECT api_token FROM users WHERE id = ?",
        [session.user.id]
      )

      if (user?.api_token) {
        return NextResponse.json({ error: "用户已有API Token，请使用重置功能" }, { status: 400 })
      }

      const newToken = generateApiToken()
      
      await executeQuery(
        "UPDATE users SET api_token = ? WHERE id = ?",
        [newToken, session.user.id]
      )

      return NextResponse.json({ 
        success: true,
        token: newToken,
        message: "API Token生成成功"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Token action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}