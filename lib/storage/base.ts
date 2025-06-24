export interface StorageProvider {
  name: string
  upload(file: File, path: string): Promise<UploadResult>
  delete(path: string): Promise<boolean>
  getUrl(path: string): string
  getUsage(): Promise<StorageUsage>
}

export interface UploadResult {
  url: string
  path: string
  size: number
}

export interface StorageUsage {
  used: number
  total: number
  percentage: number
}

export abstract class BaseStorageProvider implements StorageProvider {
  abstract name: string

  abstract upload(file: File, path: string): Promise<UploadResult>
  abstract delete(path: string): Promise<boolean>
  abstract getUrl(path: string): string
  abstract getUsage(): Promise<StorageUsage>

  protected generatePath(filename: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const timestamp = Date.now()
    const ext = filename.split(".").pop()

    return `${year}/${month}/${day}/${timestamp}.${ext}`
  }

  protected validateFile(file: File): void {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error("不支持的文件类型")
    }

    if (file.size > maxSize) {
      throw new Error("文件大小超过限制")
    }
  }
}
