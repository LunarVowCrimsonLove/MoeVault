import { BaseStorageProvider, type UploadResult, type StorageUsage } from "./base"

export class S3Provider extends BaseStorageProvider {
  name = "Amazon S3"
  private config: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    bucket: string
    endpoint?: string
    forcePathStyle?: boolean
    storageClass?: string
  }

  constructor(config: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    bucket: string
    endpoint?: string
    forcePathStyle?: boolean
    storageClass?: string
  }) {
    super()
    this.config = {
      storageClass: "STANDARD",
      forcePathStyle: false,
      ...config
    }
  }

  async upload(file: File, path?: string): Promise<UploadResult> {
    this.validateFile(file)

    const uploadPath = path || this.generatePath(file.name)
    const arrayBuffer = await file.arrayBuffer()

    // 构建AWS签名URL
    const url = await this.getSignedUploadUrl(uploadPath, file.type)
    
    // 上传文件
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
      body: arrayBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`S3 upload failed: ${response.status} ${errorText}`)
    }

    const fileUrl = this.getFileUrl(uploadPath)

    return {
      url: fileUrl,
      path: uploadPath,
      size: file.size,
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      const url = await this.getSignedDeleteUrl(path)
      
      const response = await fetch(url, {
        method: "DELETE",
      })

      return response.ok
    } catch (error) {
      console.error('S3 delete error:', error)
      return false
    }
  }

  getUrl(path: string): string {
    return this.getFileUrl(path)
  }

  async getUsage(): Promise<StorageUsage> {
    try {
      // S3 没有直接的存储用量API，这里返回占位符数据
      // 实际项目中可能需要通过CloudWatch API或其他方式获取
      return {
        used: 0,
        total: 0,
        percentage: 0,
      }
    } catch (error) {
      console.error('S3 usage error:', error)
      return { used: 0, total: 0, percentage: 0 }
    }
  }

  private getFileUrl(path: string): string {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    
    if (this.config.forcePathStyle) {
      return `${endpoint}/${this.config.bucket}/${path}`
    } else {
      // 虚拟主机样式
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${path}`
    }
  }

  private async getSignedUploadUrl(path: string, contentType: string): Promise<string> {
    // 这里需要实现AWS签名算法或使用AWS SDK
    // 为了简化，这里返回一个基本的URL构建
    // 实际生产环境中建议使用AWS SDK进行签名
    
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
    const date = timestamp.slice(0, 8)
    
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = this.config.forcePathStyle 
      ? `${endpoint}/${this.config.bucket}/${path}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${path}`
    
    // 注意：这是一个简化的实现，生产环境需要正确的AWS签名
    return url
  }

  private async getSignedDeleteUrl(path: string): Promise<string> {
    // 同样，这里需要实现正确的AWS签名算法
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = this.config.forcePathStyle 
      ? `${endpoint}/${this.config.bucket}/${path}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${path}`
    
    return url
  }
}
