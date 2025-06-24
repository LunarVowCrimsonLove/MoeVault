import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || 'global' // global or china
    
    // OneDrive OAuth 配置
    const clientId = process.env.ONEDRIVE_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/onedrive/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: "OneDrive Client ID not configured" }, { status: 400 })
    }

    // 根据区域选择正确的端点
    const baseUrl = region === 'china' 
      ? 'https://login.partner.microsoftonline.cn' 
      : 'https://login.microsoftonline.com'
    
    const tenant = region === 'china' ? 'common' : 'common'
    const scope = 'Files.ReadWrite Files.ReadWrite.All User.Read offline_access'
    
    const authUrl = new URL(`${baseUrl}/${tenant}/oauth2/v2.0/authorize`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('response_mode', 'query')
    authUrl.searchParams.set('state', JSON.stringify({ userId: session.user.id, region }))

    return NextResponse.json({ 
      authUrl: authUrl.toString(),
      message: "请在新窗口中完成 OneDrive 授权"
    })

  } catch (error) {
    console.error("OneDrive auth error:", error)
    return NextResponse.json({ error: "Failed to initiate OneDrive authorization" }, { status: 500 })
  }
}
