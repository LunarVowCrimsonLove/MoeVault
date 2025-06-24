import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageId } = await request.json()

    // 验证图片所有权（使用实际字段名）
    const image = await executeQuerySingle("SELECT * FROM images WHERE id = ? AND user_id = ?", [
      imageId,
      session.user.id,
    ])

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // 生成简单的分享码（基于图片ID和用户ID）
    const shareCode = Buffer.from(`${imageId}-${session.user.id}-${Date.now()}`).toString('base64url').slice(0, 12)

    return NextResponse.json({
      success: true,
      shareLink: {
        shareCode,
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${shareCode}`,
        imageId: image.id,
        filename: image.name,
        originalName: image.origin_name,
      },
    })
  } catch (error) {
    console.error("Share API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取用户的图片列表作为分享历史
    const images = await executeQuery(
      `SELECT id, name, origin_name, created_at 
       FROM images 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [session.user.id],
    )

    return NextResponse.json({
      shares: images.map((image: any) => ({
        id: image.id,
        imageName: image.origin_name,
        createdAt: image.created_at,
        shareCode: Buffer.from(`${image.id}-${session.user.id}-${new Date(image.created_at).getTime()}`).toString('base64url').slice(0, 12),
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${Buffer.from(`${image.id}-${session.user.id}-${new Date(image.created_at).getTime()}`).toString('base64url').slice(0, 12)}`,
      })),
    })
  } catch (error) {
    console.error("Share list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
