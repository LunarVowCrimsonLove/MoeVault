import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeQuerySingle } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }    // 从数据库获取用户信息
    const user = await executeQuerySingle(
      `SELECT 
        name, email, image_num, 
        is_adminer, created_at 
      FROM users WHERE id = ?`,
      [session.user.id]
    )

    console.log("User query result:", { userId: session.user.id, user })    // 获取存储使用量
    const storageUsed = await executeQuerySingle<{ total_size: number }>(
      "SELECT COALESCE(SUM(size), 0) as total_size FROM images WHERE user_id = ?",
      [session.user.id]
    );

    // 获取相册数量
    const albumCount = await executeQuerySingle<{ album_count: number }>(
      "SELECT COUNT(*) as album_count FROM albums WHERE user_id = ?",
      [session.user.id]
    );

    const userProfile = {
      id: session.user.id,
      name: user?.name || session.user.name || "萌萌用户",
      email: user?.email || session.user.email,
      avatar: session.user.image || "/placeholder-user.jpg",
      bio: "一个喜欢收集可爱图片的用户 ♡",
      joinDate: user?.created_at ? new Date(user.created_at).toISOString().split('T')[0] : "2024-01-01",
      totalImages: user?.image_num || 0,
      totalAlbums: Number(albumCount?.album_count) || 0,
      storageUsed: Number(storageUsed?.total_size) || 0,
      storageQuota: 1073741824, // 1GB default
      isPremium: Boolean(user?.is_adminer),
      isAdmin: Boolean(user?.is_adminer),
      preferences: {
        theme: "light",
        language: "zh-CN",
        emailNotifications: true,
        privateByDefault: false,
      }
    }

    console.log("User profile result:", { 
      isAdminer: user?.is_adminer, 
      isAdmin: userProfile.isAdmin,
      isPremium: userProfile.isPremium 
    })

    return NextResponse.json({
      success: true,
      profile: userProfile
    })
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, bio, preferences } = await request.json()

    // 获取当前用户配置
    const currentUser = await executeQuerySingle(
      "SELECT name, configs FROM users WHERE id = ?",
      [session.user.id]
    )

    // 解析当前配置
    let currentConfigs: any = {}
    try {
      currentConfigs = currentUser?.configs ? JSON.parse(currentUser.configs) : {}
    } catch (e) {
      currentConfigs = {}
    }

    // 更新配置
    const updatedConfigs = {
      ...currentConfigs,
      ...(bio !== undefined && { bio }),
      ...(preferences && { ...preferences })
    }

    // 更新数据库
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push("name = ?")
      values.push(name)
    }

    updates.push("configs = ?")
    values.push(JSON.stringify(updatedConfigs))

    values.push(session.user.id)

    await executeQuery(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    )    // 重新获取更新后的资料
    const updatedUser = await executeQuerySingle(
      `SELECT 
        name, email, capacity, image_num, 
        is_adminer, created_at, configs 
      FROM users WHERE id = ?`,
      [session.user.id]
    )

    const storageUsed = await executeQuerySingle<{ total_size: number }>(
      "SELECT COALESCE(SUM(size), 0) as total_size FROM images WHERE user_id = ?",
      [session.user.id]
    )

    // 获取相册数量
    const albumCount = await executeQuerySingle<{ album_count: number }>(
      "SELECT COUNT(*) as album_count FROM albums WHERE user_id = ?",
      [session.user.id]
    );

    let finalConfigs: any = {}
    try {
      finalConfigs = updatedUser?.configs ? JSON.parse(updatedUser.configs) : {}
    } catch (e) {
      finalConfigs = {}
    }    const updatedProfile = {
      id: session.user.id,
      name: updatedUser?.name || session.user.name || "萌萌用户",
      email: updatedUser?.email || session.user.email,
      avatar: session.user.image || "/placeholder-user.jpg",
      bio: finalConfigs.bio || "一个喜欢收集可爱图片的用户 ♡",
      joinDate: updatedUser?.created_at ? new Date(updatedUser.created_at).toISOString().split('T')[0] : "2024-01-01",
      totalImages: updatedUser?.image_num || 0,
      totalAlbums: Number(albumCount?.album_count) || 0,
      storageUsed: Number(storageUsed?.total_size) || 0,
      storageQuota: Number(updatedUser?.capacity) || 1073741824,
      isPremium: !!updatedUser?.is_adminer,
      isAdmin: !!updatedUser?.is_adminer,
      preferences: {
        theme: finalConfigs.theme || "light",
        language: finalConfigs.language || "zh-CN",
        emailNotifications: finalConfigs.emailNotifications !== false,
        privateByDefault: finalConfigs.privateByDefault || false,
      }
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })
  } catch (error) {
    console.error("Failed to update user profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
