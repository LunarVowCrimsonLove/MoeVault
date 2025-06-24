import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { StorageFactory } from "@/lib/storage/factory"
import { ImageProcessor } from "@/lib/image-processor"
import { executeQuery, executeQuerySingle } from "@/lib/database"
import { calculateFileHashes, getFileBuffer } from "@/lib/file-utils"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const storageProvider = (formData.get("storage") as string) || "local"
    const albumId = formData.get("albumId") as string
    const isPrivate = formData.get("isPrivate") === "true"
    const compress = formData.get("compress") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 验证用户存储配额（使用实际字段）
    const user = await executeQuerySingle("SELECT capacity FROM users WHERE id = ?", [
      session.user.id,
    ])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 计算当前已使用的存储空间
    const usageResult = await executeQuerySingle("SELECT SUM(size) as total_size FROM images WHERE user_id = ?", [
      session.user.id,
    ])
    const currentUsage = Number.parseFloat(usageResult?.total_size || "0")

    if (currentUsage + file.size > user.capacity) {
      return NextResponse.json({ error: "存储空间不足" }, { status: 413 })
    }

    // 处理图片
    let processedFile = file
    let processedSize = file.size

    if (compress) {
      const { buffer, metadata } = await ImageProcessor.processImage(file, {
        compress: true,
        quality: 85,
      })

      processedFile = new File([buffer], file.name, { type: file.type })
      processedSize = buffer.length
    }

    // 计算文件哈希
    const fileBuffer = await getFileBuffer(processedFile)
    const { md5, sha1 } = calculateFileHashes(fileBuffer)

    // 上传到存储服务
    const storage = await StorageFactory.createProvider(session.user.id, storageProvider as any)
    const uploadPath = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Date.now()}-${file.name}`
    const uploadResult = await storage.upload(processedFile, uploadPath)

    // 保存到数据库（使用实际的字段结构，包含所有必需字段）
    const result = await executeQuery(
      `INSERT INTO images (
        user_id, album_id, \`key\`, path, name, origin_name, 
        size, mimetype, extension, md5, sha1, width, height, uploaded_ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.user.id,
        albumId || null,
        uploadResult.path.split("/").pop()?.split(".")[0] || "",
        uploadResult.path,
        uploadResult.path.split("/").pop() || file.name,
        file.name,
        processedSize / 1024, // 转换为 KB，因为数据库字段是 decimal
        file.type,
        file.name.split(".").pop() || "",
        md5,
        sha1,
        0, // width 临时设为 0
        0, // height 临时设为 0
        request.ip || "127.0.0.1",
      ],
    )

    const imageId = (result as any).insertId
    // 获取保存的图片信息
    const image = await executeQuerySingle("SELECT * FROM images WHERE id = ?", [imageId])

    // 更新用户图片数量
    await executeQuery("UPDATE users SET image_num = image_num + 1 WHERE id = ?", [
      session.user.id,
    ])

    // 如果有相册ID，更新相册的图片数量
    if (albumId) {
      await executeQuery("UPDATE albums SET image_num = image_num + 1 WHERE id = ?", [albumId])
    }

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        filename: image.name,
        originalName: image.origin_name,
        url: uploadResult.url,
        size: image.size,
        width: image.width,
        height: image.height,
        md5: image.md5,
        sha1: image.sha1,
        createdAt: image.created_at,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
