import { BaseStorageProvider, type UploadResult, type StorageUsage } from "./base"
import OSS from "ali-oss"

export class AliyunOSSProvider extends BaseStorageProvider {
  name = "Aliyun OSS"
  private client: OSS

  constructor(config: {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
  }) {
    super()
    this.client = new OSS(config)
  }

  async upload(file: File, path?: string): Promise<UploadResult> {
    this.validateFile(file)

    const uploadPath = path || this.generatePath(file.name)
    const arrayBuffer = await file.arrayBuffer()

    try {
      const result = await this.client.put(uploadPath, Buffer.from(arrayBuffer), {
        headers: {
          "Content-Type": file.type,
        },
      })

      return {
        url: result.url,
        path: uploadPath,
        size: file.size,
      }
    } catch (error) {
      throw new Error("Aliyun OSS upload failed")
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      await this.client.delete(path)
      return true
    } catch (error) {
      return false
    }
  }

  getUrl(path: string): string {
    return this.client.signatureUrl(path)
  }

  async getUsage(): Promise<StorageUsage> {
    // 阿里云OSS没有直接的用量查询API，需要通过其他方式统计
    // 这里返回模拟数据
    return {
      used: 0,
      total: 0,
      percentage: 0,
    }
  }
}
