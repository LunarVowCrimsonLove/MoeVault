import { NextRequest, NextResponse } from 'next/server'
import { decryptImageId } from '@/lib/crypto-utils'
import { executeQuerySingle } from '@/lib/database'
import path from 'path'
import fs from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { encryptedId: string } }
) {
  try {
    const { encryptedId } = params
    
    // 解密图片ID
    const imageId = decryptImageId(encryptedId)
    
    if (!imageId) {
      return new NextResponse('Invalid or expired link', { status: 404 })
    }

    // 从数据库获取图片信息
    const image = await executeQuerySingle(
      'SELECT * FROM images WHERE id = ?',
      [imageId]
    )

    if (!image) {
      return new NextResponse('Image not found', { status: 404 })
    }

    // 检查图片是否为私有且用户无权访问
    if (!image.is_public) {
      // 这里可以添加更复杂的权限检查逻辑
      // 比如检查是否是图片所有者或有分享权限
      return new NextResponse('Access denied', { status: 403 })
    }

    // 构建本地文件路径
    const filePath = path.join(process.cwd(), 'uploads', image.path)
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(filePath)
    
    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', image.mimetype)
    headers.set('Content-Length', fileBuffer.length.toString())
    headers.set('Cache-Control', 'public, max-age=31536000') // 缓存1年
    headers.set('ETag', `"${image.id}-${image.updated_at}"`)
    
    // 支持条件请求
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === `"${image.id}-${image.updated_at}"`) {
      return new NextResponse(null, { status: 304 })
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error('Image view error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
