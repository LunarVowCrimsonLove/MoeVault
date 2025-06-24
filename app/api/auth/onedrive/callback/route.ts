import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return new Response(`
        <html>
          <body>
            <h1>授权失败</h1>
            <p>错误: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (!code || !state) {
      return new Response(`
        <html>
          <body>
            <h1>授权失败</h1>
            <p>缺少必要参数</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const stateData = JSON.parse(state)
    const { userId, region } = stateData

    // 验证用户会话
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.id !== userId) {
      return new Response(`
        <html>
          <body>
            <h1>授权失败</h1>
            <p>会话无效</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // 交换访问令牌
    const clientId = process.env.ONEDRIVE_CLIENT_ID
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/onedrive/callback`

    if (!clientId || !clientSecret) {
      throw new Error("OneDrive credentials not configured")
    }

    const baseUrl = region === 'china' 
      ? 'https://login.partner.microsoftonline.cn' 
      : 'https://login.microsoftonline.com'

    const tokenResponse = await fetch(`${baseUrl}/common/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${errorData}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // 获取用户信息
    const graphBaseUrl = region === 'china' 
      ? 'https://microsoftgraph.chinacloudapi.cn' 
      : 'https://graph.microsoft.com'

    const userResponse = await fetch(`${graphBaseUrl}/v1.0/me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }

    const userData = await userResponse.json()

    // 保存 OneDrive 配置到数据库
    const config = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      region: region,
      userEmail: userData.mail || userData.userPrincipalName,
      displayName: userData.displayName,
      folder: '/Images', // 默认文件夹
    }

    // 检查是否已存在配置
    const existingConfig = await executeQuery(
      "SELECT id FROM storage_configs WHERE user_id = ? AND provider = 'onedrive'",
      [userId]
    )

    if (existingConfig.length > 0) {
      // 更新现有配置
      await executeQuery(
        "UPDATE storage_configs SET config = ?, is_active = 1, updated_at = NOW() WHERE user_id = ? AND provider = 'onedrive'",
        [JSON.stringify(config), userId]
      )
    } else {
      // 创建新配置
      await executeQuery(
        "INSERT INTO storage_configs (user_id, provider, name, config, is_active, created_at, updated_at) VALUES (?, 'onedrive', 'OneDrive', ?, 1, NOW(), NOW())",
        [userId, JSON.stringify(config)]
      )
    }

    return new Response(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .success { color: #28a745; }
            .info { color: #17a2b8; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ OneDrive 授权成功！</h1>
          <p>用户: ${userData.displayName}</p>
          <p>邮箱: ${userData.mail || userData.userPrincipalName}</p>
          <p>区域: ${region === 'china' ? '中国版' : '国际版'}</p>
          <p class="info">您可以关闭此窗口并返回配置页面</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error("OneDrive callback error:", error)
    return new Response(`
      <html>
        <body>
          <h1>授权失败</h1>
          <p>错误: ${error instanceof Error ? error.message : '未知错误'}</p>
          <script>window.close();</script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
