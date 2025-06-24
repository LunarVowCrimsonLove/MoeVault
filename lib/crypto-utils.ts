import { sha3_256 } from 'js-sha3'
import CryptoJS from 'crypto-js'

// 加密密钥 - 在生产环境中应该使用环境变量
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'moe-vault-secret-key-2024'

/**
 * 计算文件的SHA3-256哈希值
 */
export async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)
        const hash = sha3_256(uint8Array)
        resolve(hash)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 计算Buffer的SHA3-256哈希值
 */
export function calculateBufferHash(buffer: Buffer): string {
  const uint8Array = new Uint8Array(buffer)
  return sha3_256(uint8Array)
}

/**
 * 生成基于SHA3的文件名
 */
export function generateSecureFileName(hash: string, extension: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${hash.substring(0, 16)}_${timestamp}_${randomSuffix}.${extension}`
}

/**
 * 加密图片ID生成安全链接
 */
export function encryptImageId(imageId: string | number): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(imageId.toString(), ENCRYPTION_KEY).toString()
    // 使用URL安全的Base64编码
    return encodeURIComponent(encrypted)
  } catch (error) {
    console.error('Failed to encrypt image ID:', error)
    return imageId.toString()
  }
}

/**
 * 解密图片ID
 */
export function decryptImageId(encryptedId: string): string | null {
  try {
    const decrypted = CryptoJS.AES.decrypt(decodeURIComponent(encryptedId), ENCRYPTION_KEY)
    const imageId = decrypted.toString(CryptoJS.enc.Utf8)
    return imageId || null
  } catch (error) {
    console.error('Failed to decrypt image ID:', error)
    return null
  }
}

/**
 * 生成安全的分享链接 - 使用SHA3哈希前32位
 */
export function generateSecureShareUrl(hash: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const shortHash = hash.substring(0, 32)
  return `${base}/${shortHash}`
}

/**
 * 生成直接访问链接
 */
export function generateDirectUrl(imagePath: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  // 如果路径以/uploads开头，直接返回完整URL，否则加上/uploads前缀
  if (imagePath.startsWith('/uploads')) {
    return `${base}${imagePath}`
  } else if (imagePath.startsWith('uploads/')) {
    return `${base}/${imagePath}`
  } else {
    return `${base}/uploads/${imagePath}`
  }
}

/**
 * 生成各种格式的链接
 */
export function generateImageLinks(hash: string, imagePath: string, baseUrl?: string) {
  const secureUrl = generateSecureShareUrl(hash, baseUrl)
  const directUrl = generateDirectUrl(imagePath, baseUrl)
  
  return {
    // 安全分享链接（SHA3哈希前32位）
    secure: secureUrl,
    // 直接访问链接
    direct: directUrl,
    // HTML格式
    html: `<img src="${secureUrl}" alt="Image" />`,
    // Markdown格式
    markdown: `![Image](${secureUrl})`,
    // BBCode格式
    bbcode: `[img]${secureUrl}[/img]`,
    // 链接格式
    link: secureUrl
  }
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  return allowedTypes.includes(file.type)
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * 生成唯一的相册ID
 */
export function generateAlbumId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  return sha3_256(timestamp + random).substring(0, 16)
}

/**
 * 生成API Token
 */
export function generateApiToken(userId: string): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  const data = `${userId}_${timestamp}_${random}`
  return sha3_256(data)
}

/**
 * 验证API Token格式
 */
export function validateApiToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token)
}
