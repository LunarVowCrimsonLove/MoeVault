import { NextRequest, NextResponse } from "next/server"
import { readFile, access } from "fs/promises"
import { join } from "path"
import { executeQuerySingle } from "@/lib/database"

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    
    // 查找图片记录
    const image = await executeQuerySingle(
      "SELECT * FROM images WHERE path = ?",
      [filePath]
    )

    if (!image) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // 构建文件完整路径 - 优先从public/uploads查找，然后从uploads查找
    let fullPath = join(process.cwd(), 'public', 'uploads', filePath)
    
    try {
      await access(fullPath)
    } catch {
      // 如果public/uploads中没有，尝试uploads目录
      fullPath = join(process.cwd(), 'uploads', filePath)
    }
    
    try {
      const fileBuffer = await readFile(fullPath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': image.mimetype || 'application/octet-stream',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
          'Last-Modified': new Date(image.created_at).toUTCString(),
          'ETag': `"${image.id}-${image.created_at}"`,
        },
      })
    } catch (fileError) {
      console.error('File read error:', fileError)
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }
  } catch (error) {
    console.error('Upload serve error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
