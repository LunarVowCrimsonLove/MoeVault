import { type NextRequest, NextResponse } from "next/server"
import { executeQuerySingle } from "@/lib/database"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params    // 验证哈希格式（支持32位或64位十六进制字符）
    if (!hash || !/^[a-f0-9]{32,64}$/i.test(hash)) {
      return NextResponse.json({ error: "Invalid hash format" }, { status: 400 })
    }

    // 根据哈希查找图片（支持前32位匹配）
    let image
    if (hash.length === 64) {
      // 完整哈希查找
      image = await executeQuerySingle(
        "SELECT * FROM images WHERE hash = ? LIMIT 1",
        [hash]
      )
    } else {
      // 前32位哈希查找
      image = await executeQuerySingle(
        "SELECT * FROM images WHERE hash LIKE ? LIMIT 1",
        [`${hash}%`]
      )
    }

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // 检查图片是否为公开或者用户有权限访问
    if (!image.is_public) {
      // 这里可以添加更多的权限检查逻辑
      // 比如检查用户是否为图片所有者等
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }    try {
      // 构建文件路径 - 尝试多个可能的位置
      let filePath
      let fileBuffer
      
      // 首先尝试数据库中存储的路径
      try {
        filePath = path.join(process.cwd(), "public", "uploads", image.path)
        await fs.access(filePath)
        fileBuffer = await fs.readFile(filePath)
      } catch (error) {
        // 如果失败，尝试直接在 uploads 根目录查找
        const fileName = image.filename || image.name
        filePath = path.join(process.cwd(), "public", "uploads", fileName)
        try {
          await fs.access(filePath)
          fileBuffer = await fs.readFile(filePath)
        } catch (error2) {
          // 最后尝试使用哈希作为文件名
          const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
          let found = false
          for (const ext of possibleExtensions) {
            try {
              filePath = path.join(process.cwd(), "public", "uploads", `${image.hash}.${ext}`)
              await fs.access(filePath)
              fileBuffer = await fs.readFile(filePath)
              found = true
              break
            } catch (e) {
              continue
            }
          }
          if (!found) {
            throw new Error('File not found in any location')
          }
        }
      }
      
      // 设置适当的Content-Type - 使用正确的字段名
      const contentType = image.mime_type || 'application/octet-stream'
      
      // 返回文件内容，设置为内联显示而不是下载
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': 'inline', // 关键：设置为内联显示
          'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
          'Last-Modified': new Date(image.created_at).toUTCString(),
          'ETag': `"${hash}"`,
        },
      })
    } catch (fileError) {
      console.error('File access error:', fileError)
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }
  } catch (error) {
    console.error("Hash image access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
