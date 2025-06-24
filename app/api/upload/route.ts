import { type NextRequest, NextResponse } from "next/server"
import { ImageProcessor } from "@/lib/image-processor"
import { StorageFactory } from "@/lib/storage/factory"
import { executeQuery, executeQuerySingle } from "@/lib/database"
import { calculateBufferHash, generateSecureShareUrl } from "@/lib/crypto-utils"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import busboy from 'busboy'
import { Readable } from 'stream'

// 使用 busboy 解析 multipart/form-data
async function parseFormWithBusboy(request: NextRequest) {
  return new Promise<{
    fields: Record<string, string>
    files: Array<{
      fieldname: string
      filename: string
      encoding: string
      mimeType: string
      buffer: Buffer
    }>
  }>((resolve, reject) => {
    const fields: Record<string, string> = {}
    const files: Array<{
      fieldname: string
      filename: string
      encoding: string
      mimeType: string
      buffer: Buffer
    }> = []

    try {
      // 获取请求体
      request.arrayBuffer().then(buffer => {
        const body = Buffer.from(buffer)
        
        // 创建可读流
        const readable = new Readable({
          read() {
            this.push(body)
            this.push(null)
          }
        })

        // 设置 headers
        const contentType = request.headers.get('content-type')
        if (!contentType) {
          return reject(new Error('Missing content-type header'))
        }

        // 创建 busboy 实例
        const bb = busboy({
          headers: { 'content-type': contentType },
          limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
            files: 10, // 最多10个文件
            fields: 20 // 最多20个字段
          }
        })

        // 处理字段
        bb.on('field', (fieldname, val) => {
          fields[fieldname] = val
        })

        // 处理文件
        bb.on('file', (fieldname, file, info) => {
          const { filename, encoding, mimeType } = info
          const chunks: Buffer[] = []
          
          file.on('data', (chunk) => {
            chunks.push(chunk)
          })
          
          file.on('end', () => {
            const buffer = Buffer.concat(chunks)
            files.push({
              fieldname,
              filename: filename || 'unknown',
              encoding,
              mimeType,
              buffer
            })
          })
        })

        // 处理错误
        bb.on('error', (err) => {
          reject(err)
        })

        // 处理完成
        bb.on('close', () => {
          resolve({ fields, files })
        })

        // 将数据管道传输到 busboy
        readable.pipe(bb)
        
      }).catch(reject)
    } catch (error) {
      reject(error)
    }
  })
}

// 验证API Token
async function validateBearerToken(authorization: string | null): Promise<{ userId: string; isValid: boolean }> {
  if (!authorization?.startsWith('Bearer ')) {
    return { userId: '', isValid: false }
  }

  const token = authorization.substring(7) // 移除 "Bearer " 前缀
  
  try {
    const user = await executeQuerySingle(
      "SELECT id FROM users WHERE api_token = ? AND api_token IS NOT NULL",
      [token]
    )
    
    return {
      userId: user?.id || '',
      isValid: !!user
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return { userId: '', isValid: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload API Started ===')
    
    // 验证认证
    let userId: string = ''
    
    // 优先检查Bearer Token
    const authorization = request.headers.get('authorization')
    if (authorization) {
      console.log('Found Authorization header, validating Bearer token...')
      const { userId: tokenUserId, isValid } = await validateBearerToken(authorization)
      
      if (!isValid) {
        console.log('Invalid Bearer token')
        return NextResponse.json({ error: "Invalid or expired Bearer token" }, { status: 401 })
      }
      
      userId = tokenUserId
      console.log(`Bearer token valid for user: ${userId}`)
    } else {
      // 回退到会话认证
      console.log('No Authorization header, checking session...')
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        console.log('No valid session found')
        return NextResponse.json({ error: "Unauthorized - No valid authentication found" }, { status: 401 })
      }
      
      userId = session.user.id
      console.log(`Session valid for user: ${userId}`)
    }

    // 解析表单数据
    console.log('Parsing form data with busboy...')
    
    // 检查请求头
    const contentType = request.headers.get('content-type')
    const contentLength = request.headers.get('content-length')
    console.log('Request headers:', {
      contentType,
      contentLength,
      method: request.method
    })
    
    // 验证Content-Type
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error('Invalid Content-Type:', contentType)
      return NextResponse.json({ 
        error: "Invalid Content-Type. Expected multipart/form-data",
        received: contentType || 'none'
      }, { status: 400 })
    }
    
    let fields: Record<string, string>
    let files: Array<{
      fieldname: string
      filename: string
      encoding: string
      mimeType: string
      buffer: Buffer
    }>
    
    try {
      const parseResult = await parseFormWithBusboy(request)
      fields = parseResult.fields
      files = parseResult.files
      console.log('FormData parsed successfully with busboy')
      
      // 调试：记录所有表单字段
      console.log('Parsed fields:', Object.keys(fields))
      console.log('Parsed files:', files.map(f => `${f.fieldname}: ${f.filename} (${f.buffer.length} bytes)`))
      
    } catch (parseError) {
      console.error('Form parsing failed:', parseError)
      console.error('Parse error details:', {
        message: parseError instanceof Error ? parseError.message : 'Unknown error',
        stack: parseError instanceof Error ? parseError.stack : 'No stack trace'
      })
      
      return NextResponse.json({ 
        error: "Failed to parse multipart form data",
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        contentType,
        contentLength
      }, { status: 400 })
    }

    console.log('Form parsed successfully')

    // 获取上传的文件
    const uploadedFiles: File[] = []
    
    // 处理 busboy 的文件对象
    console.log('Processing busboy files...')
    for (const busboyFile of files) {
      if (busboyFile && busboyFile.buffer.length > 0) {
        // 直接使用 busboy 解析的 buffer 创建 File 对象
        const file = new File([busboyFile.buffer], busboyFile.filename || 'unknown', {
          type: busboyFile.mimeType || 'application/octet-stream'
        })
        
        uploadedFiles.push(file)
        console.log(`Found file: ${file.name}, size: ${file.size} bytes`)
      }
    }

    if (uploadedFiles.length === 0) {
      console.log('No files found in upload')
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    console.log(`Processing ${uploadedFiles.length} file(s)`)

    // 获取可选参数 - 使用 busboy 的 fields
    const getFieldValue = (fieldName: string): string | undefined => {
      return fields[fieldName]
    }
    
    let strategyId = getFieldValue('strategyId') || getFieldValue('strategy_id')
    const albumId = getFieldValue('albumId') || getFieldValue('album_id')
    const compress = getFieldValue('compress') === 'true' || getFieldValue('compress') === '1'
    const qualityValue = getFieldValue('quality')
    const quality = qualityValue ? parseInt(qualityValue) : undefined

    console.log('Upload parameters:', { strategyId, albumId, compress, quality })

    // 如果没有指定策略ID，使用默认的本地存储（策略ID为1）
    if (!strategyId) {
      console.log('No strategyId provided, using default local storage (ID: 1)')
      strategyId = "1"
      
      // 验证默认策略是否可用
      const defaultStrategy = await executeQuerySingle(
        "SELECT type, configs, name FROM strategies WHERE id = 1 AND status = 'active'",
        []
      )
      if (!defaultStrategy) {
        console.error('Default local storage strategy not available')
        return NextResponse.json({ 
          error: "默认本地存储不可用，请指定有效的存储策略ID" 
        }, { status: 500 })
      }
      console.log(`Using default strategy: ${defaultStrategy.name}`)
    }

    // 验证存储策略
    const strategy = await executeQuerySingle(
      "SELECT type, configs, name FROM strategies WHERE id = ? AND status = 'active'",
      [strategyId]
    )

    if (!strategy) {
      console.error(`Invalid strategy ID: ${strategyId}`)
      return NextResponse.json({ 
        error: `存储策略不存在或已禁用: ${strategyId}` 
      }, { status: 400 })
    }

    console.log(`Using storage strategy: ${strategy.name} (${strategy.type})`)

    // 验证相册（如果指定）
    if (albumId) {
      const album = await executeQuerySingle(
        "SELECT id FROM albums WHERE id = ? AND user_id = ?",
        [albumId, userId]
      )
      if (!album) {
        console.error(`Invalid album ID: ${albumId}`)
        return NextResponse.json({ 
          error: "相册不存在或无权限访问" 
        }, { status: 400 })
      }
      console.log(`Uploading to album: ${albumId}`)
    }

    // 创建存储提供者
    let storageProvider
    try {
      storageProvider = await StorageFactory.createProviderFromStrategy(parseInt(strategyId))
    } catch (error) {
      console.error('Failed to create storage provider:', error)
      return NextResponse.json({ 
        error: "存储配置错误",
        details: error instanceof Error ? error.message : 'Unknown storage error'
      }, { status: 500 })
    }

    const results = []

    // 处理每个文件
    for (const file of uploadedFiles) {
      try {
        console.log(`Processing file: ${file.name}`)
        
        // 读取文件内容
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const fileName = file.name || 'unknown'
        const fileSize = file.size
        const mimeType = file.type || 'application/octet-stream'

        console.log(`File details: ${fileName}, ${fileSize} bytes, ${mimeType}`)

        // 验证文件类型
        if (!mimeType.startsWith('image/')) {
          console.log(`Skipping non-image file: ${fileName}`)
          results.push({
            filename: fileName,
            success: false,
            error: '只支持图片文件'
          })
          continue
        }

        // 处理图片
        console.log('Processing image with Sharp...')
        const processResult = await ImageProcessor.processImage(file, {
          compress,
          quality,
          format: compress ? 'jpeg' : undefined
        })

        const { buffer: processedBuffer, metadata } = processResult
        console.log(`Image processed: ${metadata.width}x${metadata.height}, format: ${metadata.format}`)

        // 生成文件信息
        const hash = calculateBufferHash(processedBuffer)
        const fileExtension = metadata.format || mimeType.split('/')[1] || 'jpg'
        const finalFileName = `${hash}.${fileExtension}`        // 检查是否已存在相同文件
        const existingImage = await executeQuerySingle(
          "SELECT hash, path, share_url FROM images WHERE hash = ?",
          [hash]
        )

        let imagePath: string
        let shareUrl: string

        if (existingImage) {
          console.log(`File already exists with hash: ${hash}`)
          imagePath = existingImage.path
          shareUrl = existingImage.share_url || generateSecureShareUrl(hash)
        } else {
          // 上传到存储
          console.log('Uploading to storage provider...')
          // 创建一个新的File对象用于上传
          const uploadFile = new File([processedBuffer], finalFileName, { type: mimeType })
          const uploadResult = await storageProvider.upload(uploadFile, finalFileName)
          imagePath = uploadResult.path
          shareUrl = generateSecureShareUrl(hash)
          console.log(`File uploaded to: ${imagePath}`)
        }        // 保存到数据库
        console.log('Saving to database...')
        await executeQuery(
          `INSERT INTO images (
            user_id, album_id, hash, filename, original_filename, share_url,
            name, origin_name, path, size, width, height, mime_type, 
            extension, storage, strategy_id, is_public, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            userId,
            albumId || null,
            hash,
            finalFileName,
            fileName,
            shareUrl,
            finalFileName, // name 字段 - 使用处理后的文件名
            fileName, // origin_name 字段 - 使用原始文件名
            imagePath,
            processedBuffer.length,
            metadata.width || 0,
            metadata.height || 0,
            mimeType,
            fileExtension || 'jpg', // extension 字段 - 确保有默认值
            'local', // storage 字段
            strategyId,
            1 // is_public 字段，默认为公开
          ]
        )        // 生成完整的图片链接信息
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
        const secureUrl = `${baseUrl}/${hash.substring(0, 32)}`
        const directUrl = `${baseUrl}/uploads/${imagePath}`
        
        const imageLinks = {
          secure: secureUrl,
          direct: directUrl,
          html: `<img src="${secureUrl}" alt="${fileName}" />`,
          markdown: `![${fileName}](${secureUrl})`,
          bbcode: `[img]${secureUrl}[/img]`
        }

        results.push({
          filename: fileName,
          success: true,
          hash,
          shareUrl,
          size: processedBuffer.length,
          width: metadata.width || 0,
          height: metadata.height || 0,
          path: imagePath,
          url: secureUrl,
          secureUrl: secureUrl,
          links: imageLinks
        })

        console.log(`File processed successfully: ${fileName}`)

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        results.push({
          filename: file.name || 'unknown',
          success: false,
          error: fileError instanceof Error ? fileError.message : 'File processing failed'
        })
      }
    }    console.log('=== Upload API Completed ===')
    console.log(`Processed ${results.length} files, ${results.filter(r => r.success).length} successful`)

    // 获取第一个成功上传的结果
    const firstSuccess = results.find(r => r.success)
    
    if (firstSuccess) {
      // 兼容前端期望的格式：单文件上传响应
      return NextResponse.json({
        success: true,
        message: results.length === 1 
          ? `${firstSuccess.filename} 上传成功` 
          : `成功上传 ${results.filter(r => r.success).length} 个文件`,
        image: {
          id: 'temp-id', // 临时ID，前端通常不需要
          filename: firstSuccess.filename,
          url: firstSuccess.url,
          secureUrl: firstSuccess.secureUrl,
          links: firstSuccess.links,
          hash: firstSuccess.hash,
          size: firstSuccess.size,
          width: firstSuccess.width,
          height: firstSuccess.height
        },
        isDuplicate: false, // TODO: 实现重复检测逻辑
        results, // 保留完整结果供调试
        strategy: strategy.name,
        totalFiles: results.length,
        successfulFiles: results.filter(r => r.success).length
      })
    } else {
      // 没有成功上传的文件
      return NextResponse.json({
        success: false,
        error: "所有文件上传失败",
        results,
        totalFiles: results.length,
        successfulFiles: 0
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({
      error: "上传过程中发生错误",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}