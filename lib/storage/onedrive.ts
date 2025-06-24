import { BaseStorageProvider, type UploadResult, type StorageUsage } from "./base"

export class OneDriveProvider extends BaseStorageProvider {
  name = "OneDrive"
  private accessToken: string
  private refreshToken: string
  private region: 'global' | 'china'
  private folder: string
  private expiresAt: number
  private graphBaseUrl: string

  constructor(config: { 
    accessToken: string
    refreshToken: string
    region?: 'global' | 'china'
    folder?: string
    expiresAt?: number
  }) {
    super()
    this.accessToken = config.accessToken
    this.refreshToken = config.refreshToken
    this.region = config.region || 'global'
    this.folder = config.folder || '/Images'
    this.expiresAt = config.expiresAt || 0
    
    // 根据区域设置正确的 Graph API 端点
    this.graphBaseUrl = this.region === 'china' 
      ? 'https://microsoftgraph.chinacloudapi.cn' 
      : 'https://graph.microsoft.com'
  }

  private async ensureValidToken(): Promise<string> {
    // 检查 token 是否即将过期（提前 5 分钟刷新）
    if (this.expiresAt && Date.now() > (this.expiresAt - 5 * 60 * 1000)) {
      await this.refreshAccessToken()
    }
    return this.accessToken
  }

  private async refreshAccessToken(): Promise<void> {
    const clientId = process.env.ONEDRIVE_CLIENT_ID
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error("OneDrive credentials not configured")
    }

    const baseUrl = this.region === 'china' 
      ? 'https://login.partner.microsoftonline.cn' 
      : 'https://login.microsoftonline.com'

    const response = await fetch(`${baseUrl}/common/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh OneDrive token')
    }

    const tokenData = await response.json()
    this.accessToken = tokenData.access_token
    if (tokenData.refresh_token) {
      this.refreshToken = tokenData.refresh_token
    }
    this.expiresAt = Date.now() + (tokenData.expires_in * 1000)
  }

  async upload(file: File, path?: string): Promise<UploadResult> {
    this.validateFile(file)

    const token = await this.ensureValidToken()
    const uploadPath = path || this.generatePath(file.name)
    const fullPath = `${this.folder}/${uploadPath}`.replace(/\/+/g, '/')
    const arrayBuffer = await file.arrayBuffer()

    // 对于大文件使用上传会话，小文件直接上传
    if (file.size > 4 * 1024 * 1024) { // 4MB
      return await this.uploadLargeFile(file, fullPath, token)
    }

    // 小文件直接上传
    const response = await fetch(`${this.graphBaseUrl}/v1.0/me/drive/root:${fullPath}:/content`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
      },
      body: arrayBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OneDrive upload failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    return {
      url: result.webUrl || result['@microsoft.graph.downloadUrl'],
      path: fullPath,
      size: file.size,
    }
  }

  private async uploadLargeFile(file: File, path: string, token: string): Promise<UploadResult> {
    // 创建上传会话
    const sessionResponse = await fetch(`${this.graphBaseUrl}/v1.0/me/drive/root:${path}:/createUploadSession`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace'
        }
      })
    })

    if (!sessionResponse.ok) {
      throw new Error('Failed to create upload session')
    }

    const sessionData = await sessionResponse.json()
    const uploadUrl = sessionData.uploadUrl

    // 分块上传
    const chunkSize = 320 * 1024 // 320KB chunks
    const arrayBuffer = await file.arrayBuffer()
    let start = 0

    while (start < arrayBuffer.byteLength) {
      const end = Math.min(start + chunkSize, arrayBuffer.byteLength)
      const chunk = arrayBuffer.slice(start, end)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${arrayBuffer.byteLength}`,
          'Content-Length': chunk.byteLength.toString(),
        },
        body: chunk,
      })

      if (uploadResponse.status === 201 || uploadResponse.status === 200) {
        // 上传完成
        const result = await uploadResponse.json()
        return {
          url: result.webUrl || result['@microsoft.graph.downloadUrl'],
          path: path,
          size: file.size,
        }
      } else if (uploadResponse.status !== 202) {
        throw new Error(`Upload chunk failed: ${uploadResponse.status}`)
      }

      start = end
    }

    throw new Error('Upload completed but no final response received')
  }

  async delete(path: string): Promise<boolean> {
    try {
      const token = await this.ensureValidToken()
      const fullPath = path.startsWith(this.folder) ? path : `${this.folder}/${path}`.replace(/\/+/g, '/')

      const response = await fetch(`${this.graphBaseUrl}/v1.0/me/drive/root:${fullPath}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error('OneDrive delete error:', error)
      return false
    }
  }

  getUrl(path: string): string {
    // OneDrive 文件需要通过 Graph API 获取共享链接
    // 这里返回一个占位符，实际使用时应该通过 API 获取
    const fullPath = path.startsWith(this.folder) ? path : `${this.folder}/${path}`.replace(/\/+/g, '/')
    return `${this.graphBaseUrl}/v1.0/me/drive/root:${fullPath}:/content`
  }

  async getUsage(): Promise<StorageUsage> {
    try {
      const token = await this.ensureValidToken()
      
      const response = await fetch(`${this.graphBaseUrl}/v1.0/me/drive`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to get OneDrive usage")
      }

      const driveData = await response.json()
      const quota = driveData.quota

      return {
        used: quota.used || 0,
        total: quota.total || 0,
        percentage: quota.total ? (quota.used / quota.total) * 100 : 0,
      }
    } catch (error) {
      console.error('OneDrive usage error:', error)
      return { used: 0, total: 0, percentage: 0 }
    }
  }

  // 获取文件的直接下载链接
  async getDirectUrl(path: string): Promise<string> {
    try {
      const token = await this.ensureValidToken()
      const fullPath = path.startsWith(this.folder) ? path : `${this.folder}/${path}`.replace(/\/+/g, '/')

      const response = await fetch(`${this.graphBaseUrl}/v1.0/me/drive/root:${fullPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to get file info")
      }

      const fileData = await response.json()
      return fileData['@microsoft.graph.downloadUrl'] || fileData.webUrl
    } catch (error) {
      throw new Error(`Failed to get direct URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 创建共享链接
  async createShareLink(path: string, type: 'view' | 'edit' = 'view'): Promise<string> {
    try {
      const token = await this.ensureValidToken()
      const fullPath = path.startsWith(this.folder) ? path : `${this.folder}/${path}`.replace(/\/+/g, '/')

      const response = await fetch(`${this.graphBaseUrl}/v1.0/me/drive/root:${fullPath}:/createLink`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          scope: 'anonymous'
        })
      })

      if (!response.ok) {
        throw new Error("Failed to create share link")
      }

      const linkData = await response.json()
      return linkData.link.webUrl
    } catch (error) {
      throw new Error(`Failed to create share link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
