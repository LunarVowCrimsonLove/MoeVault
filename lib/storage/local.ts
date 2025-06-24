import { BaseStorageProvider, type UploadResult, type StorageUsage } from "./base"
import { promises as fs } from "fs"
import path from "path"

export class LocalStorageProvider extends BaseStorageProvider {
  name = "Local Storage"
  private uploadDir: string

  constructor(uploadDir = "./public/uploads") {
    super()
    this.uploadDir = uploadDir
  }

  async upload(file: File, customPath?: string): Promise<UploadResult> {
    this.validateFile(file)

    const uploadPath = customPath || this.generatePath(file.name)
    const fullPath = path.join(this.uploadDir, uploadPath)
    const dir = path.dirname(fullPath)

    // 确保目录存在
    await fs.mkdir(dir, { recursive: true })

    // 保存文件
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(fullPath, Buffer.from(arrayBuffer))

    return {
      url: `/uploads/${uploadPath}`,
      path: uploadPath,
      size: file.size,
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath)
      await fs.unlink(fullPath)
      return true
    } catch (error) {
      return false
    }
  }

  getUrl(filePath: string): string {
    return `/uploads/${filePath}`
  }

  async getUsage(): Promise<StorageUsage> {
    try {
      const stats = await this.getDirSize(this.uploadDir)
      return {
        used: stats,
        total: 10 * 1024 * 1024 * 1024, // 10GB limit
        percentage: (stats / (10 * 1024 * 1024 * 1024)) * 100,
      }
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 }
    }
  }

  private async getDirSize(dirPath: string): Promise<number> {
    let size = 0
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true })

      for (const file of files) {
        const filePath = path.join(dirPath, file.name)
        if (file.isDirectory()) {
          size += await this.getDirSize(filePath)
        } else {
          const stats = await fs.stat(filePath)
          size += stats.size
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return size
  }
}
