import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { StorageFactory } from "@/lib/storage/factory"
import { ImageProcessor } from "@/lib/image-processor"
import { executeQuery, executeQuerySingle } from "@/lib/database"
import { 
  calculateBufferHash, 
  generateSecureFileName, 
  generateImageLinks,
  validateFileType,
  validateFileSize 
} from "@/lib/crypto-utils"

// 配置 API 路由以支持文件上传
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')
    console.log('Content-Type:', request.headers.get('content-type'))
    console.log('Authorization:', request.headers.get('authorization'))
    
    // 首先尝试 Bearer Token 验证
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('Attempting API token authentication...')
      
      // 验证 API Token
      const user = await executeQuerySingle(
        'SELECT id FROM users WHERE api_token = ? AND api_token IS NOT NULL',
        [token]
      )
      
      if (user) {
        userId = user.id.toString()
        console.log('API token authentication successful, userId:', userId)
      } else {
        console.log('API token authentication failed')
      }
    }
    
    // 如果 Token 验证失败，尝试 Session 验证
    if (!userId) {
      console.log('Attempting session authentication...')
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        userId = session.user.id
        console.log('Session authentication successful, userId:', userId)
      } else {
        console.log('Session authentication failed')
      }
    }
    
    // 如果两种验证都失败，返回未授权错误
    if (!userId) {
      console.log('Authentication failed')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 尝试解析 FormData，使用不同的方法
    let formData: FormData
    let file: File
    let strategyId: string | null = null
    let albumId: string | null = null
    let isPrivate = false
    let compress = false

    try {
      console.log('Attempting to parse FormData...')
      
      // 方法1：直接解析
      try {
        formData = await request.formData()
        console.log('FormData parsed successfully using direct method')
      } catch (directError) {
        console.log('Direct FormData parsing failed, trying alternative method...')
        
        // 方法2：使用 clone() 
        const clonedRequest = request.clone()
        formData = await clonedRequest.formData()
        console.log('FormData parsed successfully using clone method')
      }
      
      // 打印所有表单字段用于调试
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`FormData field: ${key} = File(${value.name}, ${value.size} bytes, ${value.type})`)
        } else {
          console.log(`FormData field: ${key} = ${value}`)
        }
      }
      
      // 提取参数
      file = formData.get("file") as File
      strategyId = formData.get("strategyId") as string
      albumId = formData.get("albumId") as string
      isPrivate = formData.get("isPrivate") === "true"
      compress = formData.get("compress") === "true"
      
    } catch (error) {
      console.error('All FormData parsing methods failed:', error)
      return NextResponse.json({ 
        error: "表单数据解析失败。请确保使用正确的 multipart/form-data 格式发送请求。",
        details: error instanceof Error ? error.message : '未知错误'
      }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: "未找到文件。请确保表单中包含名为 'file' 的文件字段。" }, { status: 400 })
    }

    // 验证文件类型和大小
    if (!validateFileType(file)) {
      return NextResponse.json({ 
        error: "不支持的文件类型，仅支持 JPEG、PNG、GIF、WebP 格式" 
      }, { status: 400 })
    }

    if (!validateFileSize(file, 50)) { // 最大50MB
      return NextResponse.json({ 
        error: "文件大小超过限制，最大支持50MB" 
      }, { status: 400 })
    }

    // 如果没有指定策略ID，默认使用本地存储（策略ID为1）
    if (!strategyId) {
      console.log('No strategyId provided, using default local storage (ID: 1)')
      strategyId = "1"
      
      // 验证默认策略是否可用
      const defaultStrategy = await executeQuerySingle(
        "SELECT type, configs, name FROM strategies WHERE id = 1 AND status = 'active'",
        []
      )
      if (!defaultStrategy) {
        return NextResponse.json({ 
          error: "默认本地存储不可用。请在请求中添加 strategyId 参数，例如：strategyId=1（本地存储）" 
        }, { status: 400 })
      }
    }

    // 验证用户是否有权使用此存储策略
    const userStorageAssignment = await executeQuerySingle(
      `SELECT usa.*, s.type, s.configs, s.name
       FROM user_storage_assignments usa
       JOIN strategies s ON usa.strategy_id = s.id
       WHERE usa.user_id = ? AND usa.strategy_id = ? AND usa.is_active = 1 AND s.status = 'active'`,
      [userId, strategyId]
    )

    if (!userStorageAssignment) {
      // 如果用户没有分配特定策略，检查是否是默认本地存储
      if (strategyId === "1") {
        const defaultStrategy = await executeQuerySingle(
          "SELECT type, configs, name FROM strategies WHERE id = 1 AND status = 'active'",
          []
        )
        if (!defaultStrategy) {
          return NextResponse.json({ error: "Default storage not available" }, { status: 500 })
        }
        // 允许使用默认本地存储
      } else {
        return NextResponse.json({ error: "您没有权限使用此存储方式" }, { status: 403 })
      }
    }

    // 检查用户配额（如果设置了）
    const user = await executeQuerySingle("SELECT id FROM users WHERE id = ?", [
      userId,
    ])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 检查用户分配的存储配额
    if (userStorageAssignment?.quota) {
      const usageResult = await executeQuerySingle("SELECT SUM(size) as total_size FROM images WHERE user_id = ?", [
        userId,
      ])
      const currentUsageBytes = Number.parseFloat(usageResult?.total_size || "0")
      const quotaBytes = userStorageAssignment.quota * 1024 * 1024 * 1024 // GB转字节

      if (currentUsageBytes + file.size > quotaBytes) {
        return NextResponse.json({ error: "存储配额不足" }, { status: 413 })
      }
    }

    // 计算文件的SHA3哈希值
    let fileHash: string
    try {
      // 将File对象转换为Buffer进行哈希计算
      const buffer = Buffer.from(await file.arrayBuffer())
      fileHash = calculateBufferHash(buffer)
    } catch (error) {
      console.error('Failed to calculate file hash:', error)
      return NextResponse.json({ error: "文件处理失败" }, { status: 500 })
    }

    // 检查是否已存在相同哈希的文件（去重）
    const existingImage = await executeQuerySingle(
      "SELECT * FROM images WHERE user_id = ? AND name LIKE ?",
      [userId, `${fileHash.substring(0, 16)}%`]
    )
    
    if (existingImage) {
      // 获取基础URL
      const baseUrl = request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
        : request.headers.get('host')
        ? `${request.url.includes('https') ? 'https' : 'http'}://${request.headers.get('host')}`
        : 'http://localhost:3000'

      // 如果文件已存在，返回现有图片信息和加密链接
      const links = generateImageLinks(fileHash, existingImage.path, baseUrl)
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        message: "检测到重复文件，返回已有图片 ♡",
        image: {
          id: existingImage.id,
          filename: existingImage.name,
          originalName: existingImage.origin_name,
          url: links.secure, // 使用安全链接作为主要URL
          secureUrl: links.secure,
          links: links,
          size: existingImage.size,
          width: existingImage.width,
          height: existingImage.height,
          storage: userStorageAssignment?.type || 'local',
          strategyId: Number(strategyId),
          isPublic: Boolean(existingImage.is_public),
          createdAt: existingImage.created_at,
        },
      })
    }

    // 处理图片
    let processedFile = file
    let processedSize = file.size
    let imageMetadata = { width: 0, height: 0 }

    try {
      if (compress && file.type.startsWith('image/')) {
        const { buffer, metadata } = await ImageProcessor.processImage(file, {
          compress: true,
          quality: 85,
        })

        processedFile = new File([buffer], file.name, { type: file.type })
        processedSize = buffer.length
        imageMetadata = metadata
      } else if (file.type.startsWith('image/')) {
        // 即使不压缩也获取图片尺寸
        const { metadata } = await ImageProcessor.processImage(file, {
          compress: false,
        })
        imageMetadata = metadata
      }
    } catch (error) {
      console.warn('Image processing failed, using original file:', error)
      // 继续使用原文件
    }

    // 生成安全的文件名（基于SHA3哈希）
    const fileExtension = file.name.split('.').pop() || 'unknown'
    const secureFileName = generateSecureFileName(fileHash, fileExtension)
    
    // 上传到存储服务
    let uploadResult
    try {
      const storage = await StorageFactory.createProviderFromStrategy(Number(strategyId))
      const uploadPath = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${secureFileName}`
      uploadResult = await storage.upload(processedFile, uploadPath)
    } catch (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ 
        error: `存储上传失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }, { status: 500 })
    }

    // 保存到数据库（使用新的数据库结构）
    const result = await executeQuery(
      `INSERT INTO images (
        user_id, album_id, path, name, origin_name, 
        size, mimetype, extension, width, height, strategy_id, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        albumId && albumId !== 'none' ? albumId : null,
        uploadResult.path,
        secureFileName,
        file.name,
        processedSize,
        file.type,
        fileExtension,
        imageMetadata.width || 0,
        imageMetadata.height || 0,
        Number(strategyId),
        isPrivate ? 0 : 1, // is_public: 0=私有, 1=公开
      ]
    )

    const imageId = (result as any).insertId
    
    // 获取保存的图片信息
    const image = await executeQuerySingle("SELECT * FROM images WHERE id = ?", [imageId])

    // 获取基础URL（从请求头中获取）
    const baseUrl = request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
      : request.headers.get('host')
      ? `${request.url.includes('https') ? 'https' : 'http'}://${request.headers.get('host')}`
      : 'http://localhost:3000' // 默认值

    // 生成各种格式的链接
    const links = generateImageLinks(fileHash, uploadResult.path, baseUrl)

    return NextResponse.json({
      success: true,
      message: "图片上传成功 ♡",
      image: {
        id: image.id,
        filename: image.name,
        originalName: image.origin_name,
        url: links.secure, // 使用安全链接作为主要URL
        secureUrl: links.secure,
        links: links,
        size: image.size,
        width: image.width,
        height: image.height,
        storage: userStorageAssignment?.type || 'local',
        strategyId: Number(strategyId),
        isPublic: Boolean(image.is_public),
        albumId: image.album_id,
        createdAt: image.created_at,
        hash: fileHash.substring(0, 32), // 返回哈希前32位用于标识
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: `上传失败: ${error instanceof Error ? error.message : '未知错误'}` 
    }, { status: 500 })
  }
}
