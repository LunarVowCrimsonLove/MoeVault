import { type NextRequest, NextResponse } from "next/server"
import { executeQuerySingle } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  try {
    // 解析分享码（简单的base64解码）
    const decoded = Buffer.from(params.code, 'base64url').toString()
    const [imageId, userId] = decoded.split('-')

    if (!imageId || !userId) {
      return NextResponse.json({ error: "无效的分享链接" }, { status: 400 })
    }

    // 查找图片信息
    const image = await executeQuerySingle(
      `SELECT i.*, u.name as username 
       FROM images i 
       JOIN users u ON i.user_id = u.id 
       WHERE i.id = ? AND i.user_id = ?`,
      [imageId, userId],
    )

    if (!image) {
      return NextResponse.json({ error: "图片不存在或已被删除" }, { status: 404 })
    }

    return NextResponse.json({
      image: {
        id: image.id,
        name: image.name,
        originalName: image.origin_name,
        size: image.size,
        width: image.width,
        height: image.height,
        mimetype: image.mimetype,
        extension: image.extension,
        createdAt: image.created_at,
        username: image.username,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/uploads/${image.path}`,
      },
    })
  } catch (error) {
    console.error("Share view API error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
        imageUrl: share.public_url,
        thumbnailUrl: share.thumbnail_url,
        fileSize: share.file_size,
        viewCount: share.view_count + 1,
        maxViews: share.max_views,
        expiresAt: share.expires_at,
        hasPassword: !!share.password,
        uploaderName: share.username,
        uploadedAt: share.created_at,
      },
    })
  } catch (error) {
    console.error("Share access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
