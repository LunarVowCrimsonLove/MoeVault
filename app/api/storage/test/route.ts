import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuerySingle } from "@/lib/database"
import { StorageFactory } from "@/lib/storage/factory"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { configId, provider, config: testConfig, testType = 'connection' } = await request.json()

    let storageConfig
    if (configId) {
      // 测试已保存的配置
      const savedConfig = await executeQuerySingle("SELECT * FROM storage_configs WHERE id = ? AND user_id = ?", [
        configId,
        session.user.id,
      ])

      if (!savedConfig) {
        return NextResponse.json({ error: "Storage config not found" }, { status: 404 })
      }
      
      storageConfig = savedConfig
    } else if (provider && testConfig) {
      // 测试临时配置（未保存）
      storageConfig = {
        provider,
        config: typeof testConfig === 'string' ? testConfig : JSON.stringify(testConfig)
      }
    } else {
      return NextResponse.json({ error: "Missing config or configId" }, { status: 400 })
    }

    // 根据测试类型执行不同的测试
    let result = {}
    
    switch (testType) {
      case 'connection':
        // 基本连接测试
        result = await testConnection(storageConfig, session.user.id)
        break
        
      case 'upload':
        // 上传测试
        result = await testUpload(storageConfig, session.user.id)
        break
        
      case 'permissions':
        // 权限测试
        result = await testPermissions(storageConfig, session.user.id)
        break
        
      case 'oauth':
        // OAuth 授权测试 (特殊处理)
        if (provider === 'onedrive') {
          return await handleOneDriveOAuth(testConfig, session.user.id)
        }
        break
        
      default:
        result = await testConnection(storageConfig, session.user.id)
    }

    return NextResponse.json({
      success: true,
      message: "测试完成",
      result,
    })
  } catch (error) {
    console.error("Storage test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "测试失败",
      },
      { status: 500 },
    )
  }
}

async function testConnection(storageConfig: any, userId: string) {
  try {
    const storage = await StorageFactory.createProvider(userId, storageConfig.provider)
    const usage = await storage.getUsage()
    
    return {
      type: 'connection',
      status: 'success',
      usage,
      message: '连接测试成功'
    }
  } catch (error) {
    throw new Error(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

async function testUpload(storageConfig: any, userId: string) {
  try {
    const storage = await StorageFactory.createProvider(userId, storageConfig.provider)
    
    // 创建测试文件
    const testContent = 'Test file for storage connection'
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
    
    // 尝试上传
    const uploadResult = await storage.upload(testFile, 'test/connection-test.txt')
    
    // 尝试删除测试文件
    await storage.delete(uploadResult.path)
    
    return {
      type: 'upload',
      status: 'success',
      uploadResult,
      message: '上传测试成功'
    }
  } catch (error) {
    throw new Error(`上传测试失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

async function testPermissions(storageConfig: any, userId: string) {
  try {
    const storage = await StorageFactory.createProvider(userId, storageConfig.provider)
    const permissions = []
    
    // 测试读取权限
    try {
      await storage.getUsage()
      permissions.push({ permission: 'read', status: 'success' })
    } catch (error) {
      permissions.push({ permission: 'read', status: 'failed', error: error.message })
    }
    
    // 测试写入权限
    try {
      const testFile = new File(['permission test'], 'permission-test.txt', { type: 'text/plain' })
      const uploadResult = await storage.upload(testFile, 'test/permission-test.txt')
      permissions.push({ permission: 'write', status: 'success' })
      
      // 测试删除权限
      try {
        await storage.delete(uploadResult.path)
        permissions.push({ permission: 'delete', status: 'success' })
      } catch (error) {
        permissions.push({ permission: 'delete', status: 'failed', error: error.message })
      }
    } catch (error) {
      permissions.push({ permission: 'write', status: 'failed', error: error.message })
    }
    
    return {
      type: 'permissions',
      status: 'success',
      permissions,
      message: '权限测试完成'
    }
  } catch (error) {
    throw new Error(`权限测试失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

async function handleOneDriveOAuth(config: any, userId: string) {
  const region = config.region || 'global'
  const clientId = process.env.ONEDRIVE_CLIENT_ID
  
  if (!clientId) {
    throw new Error('OneDrive Client ID 未配置')
  }
  
  const baseUrl = region === 'china' 
    ? 'https://login.partner.microsoftonline.cn' 
    : 'https://login.microsoftonline.com'
  
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/onedrive/callback`
  const scope = 'Files.ReadWrite Files.ReadWrite.All User.Read offline_access'
  
  const authUrl = new URL(`${baseUrl}/common/oauth2/v2.0/authorize`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_mode', 'query')
  authUrl.searchParams.set('state', JSON.stringify({ userId, region }))

  return {
    type: 'oauth',
    status: 'redirect',
    authUrl: authUrl.toString(),
    message: '请在新窗口中完成 OneDrive 授权'
  }
}
