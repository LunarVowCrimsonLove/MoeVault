"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  ImageIcon,
  Folder,
  Search,
  Settings,
  Cloud,
  Grid3X3,
  List,
  Filter,
  Copy,
  Eye,
  EyeOff,
  Key,
  BookOpen,
  BarChart3,
  Zap,
  Terminal,
  Trash2,
  Plus,
  User,
  LogOut,
  Edit,
  Lock,
  Unlock,
  Shield,
  RefreshCw,
} from "lucide-react"
import NotificationSystem from "@/components/notification-system"
import UploadZone from "@/components/upload-zone"
import ImageGallery from "@/components/image-gallery"
import { useImages } from "@/hooks/use-images"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"

interface UserStats {
  storageQuota: number
  storageUsed: number
  isPremium: boolean
  daysSinceCreation: number
}

interface Stats {
  totalImages: number
  totalAlbums: number
  monthlyUploads: number
  storageByProvider: Record<string, number>
}

interface StorageStrategy {
  id: number
  name: string
  type: string
  status: string
  is_user_default: boolean
}

interface ApiToken {
  id: string
  name: string
  token: string
  permissions: string[]
  lastUsed?: string
  createdAt: string
  isActive: boolean
}

interface Album {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  isEncrypted: boolean
  hasPassword: boolean
  coverImage?: string
  imageCount: number
  createdAt: string
  updatedAt: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinDate: string
  totalImages: number
  totalAlbums: number
  storageUsed: number
  storageQuota: number
  isPremium: boolean
  isAdmin: boolean
  preferences: {
    theme: string
    language: string
    emailNotifications: boolean
    privateByDefault: boolean
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [showToken, setShowToken] = useState<boolean>(false)
  const [albums, setAlbums] = useState<Album[]>([])
  const [storageStrategies, setStorageStrategies] = useState<StorageStrategy[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null)
  const [newAlbum, setNewAlbum] = useState({
    name: "",
    description: "",
    isPrivate: false,
    isEncrypted: false,
    password: ""
  })

  // 解析搜索参数来确定是否在查看特定相册
  const albumIdFromSearch = searchTerm?.startsWith('album:') ? searchTerm.slice(6) : undefined
  const actualSearchTerm = searchTerm?.startsWith('album:') ? undefined : searchTerm

  const {
    images,
    loading: imagesLoading,
    deleteImages,
    uploadImage,
    refresh: refreshImages,
  } = useImages({
    albumId: albumIdFromSearch,
    search: actualSearchTerm,
    sortBy: "created_at",
    sortOrder: "desc",
  })

  // 自动刷新状态
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  useEffect(() => {
    fetchUserStats()
    fetchUserProfile()
    fetchAlbums()
    fetchStorageStrategies()
    fetchApiToken()

    // 设置5秒自动刷新
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // 根据当前活跃标签页只刷新对应的数据
      switch (activeTab) {
        case "overview":
          fetchUserStats()
          break
        case "gallery":
          refreshImages()
          break
        case "albums":
          fetchAlbums()
          break
        case "profile":
          fetchUserProfile()
          break
        case "tokens":
          fetchApiToken()
          break
        default:
          // 概览页默认刷新统计数据
          fetchUserStats()
          break
      }
      setLastRefreshTime(new Date())
    }, 5000) // 5秒刷新一次

    return () => clearInterval(interval)
  }, [activeTab, refreshImages, autoRefresh])

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/user/stats")
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.user)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    }
  }

  const fetchAlbums = async () => {
    try {
      const response = await fetch("/api/albums")
      if (response.ok) {
        const data = await response.json()
        setAlbums(data.albums || [])
      }
    } catch (error) {
      console.error("Failed to fetch albums:", error)
    }
  }

  const fetchStorageStrategies = async () => {
    try {
      const response = await fetch("/api/storage/strategies")
      if (response.ok) {
        const data = await response.json()
        setStorageStrategies(data.strategies || [])
      }
    } catch (error) {
      console.error("Failed to fetch storage strategies:", error)
    }
  }

  const handleDeleteImages = async (imageIds: string[]) => {
    const success = await deleteImages(imageIds)
    if (success) {
      setSelectedImages([])
      fetchUserStats()
    }
  }

  // Token管理函数
  const fetchApiToken = async () => {
    try {
      const response = await fetch("/api/user/tokens")
      if (response.ok) {
        const data = await response.json()
        setApiToken(data.token)
        setHasToken(data.hasToken)
      }
    } catch (error) {
      console.error("Failed to fetch API token:", error)
    }
  }

  const generateApiToken = async () => {
    try {
      const response = await fetch("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      })

      if (response.ok) {
        const data = await response.json()
        setApiToken(data.token)
        setHasToken(true)
        toast.success(data.message || "API Token生成成功")
      } else {
        const error = await response.json()
        toast.error(error.error || "生成Token失败")
      }
    } catch (error) {
      toast.error("生成Token失败")
    }
  }

  const resetApiToken = async () => {
    if (!confirm("确定要重置API Token吗？重置后旧Token将失效。")) {
      return
    }

    try {
      const response = await fetch("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })

      if (response.ok) {
        const data = await response.json()
        setApiToken(data.token)
        setHasToken(true)
        toast.success(data.message || "API Token重置成功")
      } else {
        toast.error("重置Token失败")
      }
    } catch (error) {
      toast.error("重置Token失败")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制到剪贴板")
    } catch (error) {
      toast.error("复制失败")
    }
  }

  // 相册管理函数
  const createAlbum = async () => {
    if (!newAlbum.name.trim()) {
      toast.error("请输入相册名称")
      return
    }

    if (newAlbum.isEncrypted && !newAlbum.password) {
      toast.error("加密相册需要设置密码")
      return
    }

    try {
      const url = editingAlbum ? `/api/albums/${editingAlbum.id}` : "/api/albums"
      const method = editingAlbum ? "PATCH" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlbum),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (editingAlbum) {
          // 更新现有相册
          setAlbums(prev => prev.map(album => 
            album.id === editingAlbum.id ? data.album : album
          ))
          toast.success("相册更新成功 ♡")
        } else {
          // 添加新相册
          setAlbums(prev => [data.album, ...prev])
          toast.success("相册创建成功 ♡")
        }
        
        // 重置表单
        setNewAlbum({
          name: "",
          description: "",
          isPrivate: false,
          isEncrypted: false,
          password: ""
        })
        setEditingAlbum(null)
        setShowCreateAlbum(false)
      } else {
        toast.error(editingAlbum ? "更新相册失败" : "创建相册失败")
      }
    } catch (error) {
      toast.error(editingAlbum ? "更新相册失败" : "创建相册失败")
    }
  }

  useEffect(() => {
    if (activeTab === "tokens") {
      fetchApiToken()
    }
  }, [activeTab])

  const handleUploadComplete = () => {
    refreshImages()
    fetchUserStats()
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" })
      toast.success("已退出登录")
    } catch (error) {
      toast.error("退出登录失败")
    }
  }

  // 相册编辑和删除功能
  const editAlbum = (album: Album) => {
    setEditingAlbum(album)
    setNewAlbum({
      name: album.name,
      description: album.description || "",
      isPrivate: album.isPrivate,
      isEncrypted: album.isEncrypted,
      password: ""
    })
    setShowCreateAlbum(true)
  }

  const deleteAlbum = async (albumId: string) => {
    if (!confirm("确定要删除这个相册吗？此操作不可撤销。")) {
      return
    }

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAlbums(prev => prev.filter(album => album.id !== albumId))
        toast.success("相册删除成功")
      } else {
        toast.error("删除相册失败")
      }
    } catch (error) {
      toast.error("删除相册失败")
    }
  }

  // 个人资料编辑功能
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        toast.success("资料更新成功 ♡")
        setEditingProfile(false)
      } else {
        toast.error("更新资料失败")
      }
    } catch (error) {
      toast.error("更新资料失败")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const storagePercentage = userStats ? (userStats.storageUsed / userStats.storageQuota) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-blue-200 rounded-full opacity-35 animate-bounce delay-1000"></div>
        <div className="absolute bottom-40 right-1/3 w-24 h-24 bg-pink-100 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>
      
      {/* 导航栏 */}
      <nav className="relative z-10 flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            MoeVault Dashboard ♡
          </h1>
          <Badge className="bg-pink-100 text-pink-700 border-pink-200">
            萌萌控制台
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* 自动刷新控制 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs ${autoRefresh ? 'text-green-600 hover:text-green-700' : 'text-gray-500 hover:text-gray-600'}`}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? '自动刷新' : '已暂停'}
            </Button>
            {lastRefreshTime && (
              <span className="text-xs text-gray-500">
                {lastRefreshTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <Badge className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
            <Zap className="w-3 h-3 mr-1" />
            {userStats?.isPremium ? "Pro ♡" : "Free"}
          </Badge>
          <NotificationSystem />
          
          {/* 用户头像和菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar || session?.user?.image || "/placeholder-user.jpg"} alt="用户头像" />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                    {userProfile?.name?.[0] || session?.user?.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-pink-700">
                    {userProfile?.name || session?.user?.name || "萌萌用户"}
                  </p>
                  <p className="w-[200px] truncate text-sm text-gray-500">
                    {userProfile?.email || session?.user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab("profile")} className="text-pink-600">
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("albums")} className="text-purple-600">
                <Folder className="mr-2 h-4 w-4" />
                <span>我的相册</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-blue-600">
                <Settings className="mr-2 h-4 w-4" />
                <span>设置</span>
              </DropdownMenuItem>
              {/* 管理员后台入口 */}
              {userProfile?.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => window.open("/admin", "_blank")} 
                    className="text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>管理后台</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* 主内容区域 */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white/80 backdrop-blur-sm border border-pink-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              概览
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <Upload className="w-4 h-4 mr-2" />
              上传
            </TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <ImageIcon className="w-4 h-4 mr-2" />
              图库
            </TabsTrigger>
            <TabsTrigger value="albums" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <Folder className="w-4 h-4 mr-2" />
              相册
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <User className="w-4 h-4 mr-2" />
              资料
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <Key className="w-4 h-4 mr-2" />
              API Token
            </TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <BookOpen className="w-4 h-4 mr-2" />
              API文档
            </TabsTrigger>
          </TabsList>

          {/* 概览面板 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-pink-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-pink-700">总图片数</CardTitle>
                  <ImageIcon className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600">{stats?.totalImages || 0}</div>
                  <p className="text-xs text-gray-500">本月上传: {stats?.monthlyUploads || 0}</p>
                </CardContent>
              </Card>

              <Card className="border-blue-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">存储使用</CardTitle>
                  <Cloud className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {userStats ? formatFileSize(userStats.storageUsed) : "0 B"}
                  </div>
                  <Progress value={storagePercentage} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(storagePercentage)}% / {userStats ? formatFileSize(userStats.storageQuota) : "0 B"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">本月上传</CardTitle>
                  <Upload className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.monthlyUploads || 0}</div>
                  <p className="text-xs text-gray-500">较上月 +23%</p>
                </CardContent>
              </Card>

              <Card className="border-purple-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">相册数量</CardTitle>
                  <Folder className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats?.totalAlbums || 0}</div>
                  <p className="text-xs text-gray-500">使用天数: {userStats?.daysSinceCreation || 0}天</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-pink-100 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-pink-700">快速操作 ♡</CardTitle>
                <CardDescription className="text-gray-600">常用功能快捷入口</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveTab("upload")} 
                  className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg transform hover:scale-105 transition-all"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传图片 ♡
                </Button>
                <Button 
                  onClick={() => setActiveTab("tokens")} 
                  className="bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white shadow-lg transform hover:scale-105 transition-all"
                >
                  <Key className="w-4 h-4 mr-2" />
                  管理API Token
                </Button>
                <Button 
                  onClick={() => setActiveTab("docs")} 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg transform hover:scale-105 transition-all"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  查看API文档
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 上传面板 */}
          <TabsContent value="upload" className="space-y-6">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </TabsContent>

          {/* 图库面板 */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="border-pink-100 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    {viewingAlbum ? (
                      <>
                        <CardTitle className="text-pink-700 flex items-center gap-2">
                          <Folder className="w-5 h-5" />
                          {viewingAlbum.name} ♡
                          {viewingAlbum.isPrivate && <Lock className="w-4 h-4 text-gray-500" />}
                          {viewingAlbum.isEncrypted && <Shield className="w-4 h-4 text-blue-500" />}
                        </CardTitle>
                        <CardDescription className="text-gray-600 flex items-center gap-2">
                          {viewingAlbum.description || "相册中的图片"}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setViewingAlbum(null)
                              setSearchTerm("")
                            }}
                            className="text-pink-500 hover:text-pink-700 p-1"
                          >
                            返回全部图片
                          </Button>
                        </CardDescription>
                      </>
                    ) : (
                      <>
                        <CardTitle className="text-pink-700">我的图片 ♡</CardTitle>
                        <CardDescription className="text-gray-600">管理你的所有可爱图片</CardDescription>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索图片..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white border-pink-200 focus:border-pink-400"
                      />
                    </div>
                    <Button variant="outline" size="icon" className="border-pink-200 text-pink-600 hover:bg-pink-50">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <div className="flex border border-pink-200 rounded-md">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewMode("grid")}
                        className={viewMode === "grid" ? "bg-pink-500 text-white" : "text-pink-600"}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewMode("list")}
                        className={viewMode === "list" ? "bg-pink-500 text-white" : "text-pink-600"}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ImageGallery
                  images={images}
                  viewMode={viewMode}
                  selectedImages={selectedImages}
                  onSelectionChange={setSelectedImages}
                  onDelete={handleDeleteImages}
                  onRefresh={refreshImages}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Token面板 */}
          <TabsContent value="tokens" className="space-y-6">
            {/* API Token管理 */}
            <Card className="border-pink-100 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-pink-700">API Token管理 ♡</CardTitle>
                <CardDescription className="text-gray-600">
                  管理你的API Token用于程序化访问图床API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!hasToken ? (
                  <div className="text-center py-8">
                    <Key className="w-16 h-16 mx-auto mb-4 text-pink-300" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">还没有API Token</h3>
                    <p className="text-gray-600 mb-4">生成一个API Token开始使用图床API</p>
                    <Button 
                      onClick={generateApiToken} 
                      className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      生成API Token
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-800 mb-1">你的API Token</h3>
                          <p className="text-sm text-gray-600">用于API访问的身份验证</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">活跃</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                          {showToken ? apiToken : "•".repeat(48)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowToken(!showToken)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(apiToken || "");
                            toast.success("Token已复制到剪贴板");
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={resetApiToken}
                          variant="outline"
                          className="border-orange-200 text-orange-600 hover:bg-orange-50"
                        >
                          重置Token
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">使用说明</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 在API请求中添加Header: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer your_token</code></li>
                        <li>• Token具有完整的上传、删除、读取权限</li>
                        <li>• 重置Token后，旧Token将立即失效</li>
                        <li>• 请妥善保管你的Token，不要泄露给他人</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 相册面板 */}
          <TabsContent value="albums" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-pink-700">我的相册 ♡</h2>
                <p className="text-gray-600">管理你的图片相册，支持加密和私有设置</p>
              </div>
              <Dialog open={showCreateAlbum} onOpenChange={(open) => {
                setShowCreateAlbum(open)
                if (!open) {
                  setEditingAlbum(null)
                  setNewAlbum({
                    name: "",
                    description: "",
                    isPrivate: false,
                    isEncrypted: false,
                    password: ""
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    创建相册
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-pink-700">
                      {editingAlbum ? "编辑相册 ♡" : "创建新相册 ♡"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAlbum ? "修改相册信息" : "创建一个新的相册来组织你的图片"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="albumName" className="text-gray-700">相册名称</Label>
                      <Input
                        id="albumName"
                        placeholder="输入相册名称..."
                        value={newAlbum.name}
                        onChange={(e) => setNewAlbum(prev => ({ ...prev, name: e.target.value }))}
                        className="border-pink-200 focus:border-pink-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="albumDescription" className="text-gray-700">相册描述</Label>
                      <Textarea
                        id="albumDescription"
                        placeholder="输入相册描述..."
                        value={newAlbum.description}
                        onChange={(e) => setNewAlbum(prev => ({ ...prev, description: e.target.value }))}
                        className="border-pink-200 focus:border-pink-400"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isPrivate"
                          checked={newAlbum.isPrivate}
                          onCheckedChange={(checked) => setNewAlbum(prev => ({ ...prev, isPrivate: checked }))}
                        />
                        <Label htmlFor="isPrivate" className="text-gray-700">私有相册</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isEncrypted"
                          checked={newAlbum.isEncrypted}
                          onCheckedChange={(checked) => setNewAlbum(prev => ({ ...prev, isEncrypted: checked }))}
                        />
                        <Label htmlFor="isEncrypted" className="text-gray-700">加密相册</Label>
                      </div>
                      {newAlbum.isEncrypted && (
                        <div className="space-y-2">
                          <Label htmlFor="albumPassword" className="text-gray-700">访问密码</Label>
                          <Input
                            id="albumPassword"
                            type="password"
                            placeholder="设置访问密码..."
                            value={newAlbum.password}
                            onChange={(e) => setNewAlbum(prev => ({ ...prev, password: e.target.value }))}
                            className="border-pink-200 focus:border-pink-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowCreateAlbum(false)}>
                      取消
                    </Button>
                    <Button 
                      onClick={createAlbum}
                      className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                    >
                      {editingAlbum ? "更新相册" : "创建相册"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* 相册列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Folder className="w-16 h-16 mx-auto mb-4 text-pink-300 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">暂无相册</h3>
                  <p className="text-gray-500 mb-4">创建你的第一个相册开始整理图片吧</p>
                  <Button 
                    onClick={() => setShowCreateAlbum(true)}
                    className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    创建相册
                  </Button>
                </div>
              ) : (
                albums.map((album) => (
                  <Card key={album.id} className="border-pink-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="relative">
                      <div className="absolute top-4 right-4 flex gap-1">
                        {album.isPrivate && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            <Lock className="w-3 h-3 mr-1" />
                            私有
                          </Badge>
                        )}
                        {album.isEncrypted && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                            <Shield className="w-3 h-3 mr-1" />
                            加密
                          </Badge>
                        )}
                      </div>
                      <div className="w-full h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                        {album.coverImage ? (
                          <img 
                            src={album.coverImage} 
                            alt={album.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-pink-400" />
                        )}
                      </div>
                      <CardTitle className="text-pink-700">{album.name}</CardTitle>
                      {album.description && (
                        <CardDescription className="text-gray-600">
                          {album.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{album.imageCount} 张图片</span>
                        <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                          onClick={() => {
                            setViewingAlbum(album)
                            setActiveTab("gallery")
                            setSearchTerm(`album:${album.id}`)
                          }}
                        >
                          查看
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => editAlbum(album)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => deleteAlbum(album.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* 个人资料管理面板 */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-pink-100 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-pink-700">个人资料 ♡</CardTitle>
                <CardDescription className="text-gray-600">
                  管理你的个人信息和偏好设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 基本信息 */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userProfile?.avatar || session?.user?.image || "/placeholder-user.jpg"} alt="用户头像" />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-2xl">
                      {userProfile?.name?.[0] || session?.user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {userProfile?.name || session?.user?.name || "萌萌用户"}
                    </h3>
                    <p className="text-gray-600">{userProfile?.email || session?.user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      加入时间: {userProfile?.joinDate || "2024-01-01"}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-pink-200 text-pink-600 hover:bg-pink-50"
                    onClick={() => setEditingProfile(!editingProfile)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editingProfile ? "取消编辑" : "编辑资料"}
                  </Button>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-pink-50 p-4 rounded-lg text-center border border-pink-100">
                    <div className="text-2xl font-bold text-pink-600">{userProfile?.totalImages || 0}</div>
                    <div className="text-sm text-gray-600">上传图片</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
                    <div className="text-2xl font-bold text-purple-600">{userProfile?.totalAlbums || 0}</div>
                    <div className="text-sm text-gray-600">创建相册</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">
                      {userProfile ? formatFileSize(userProfile.storageUsed) : "0 B"}
                    </div>
                    <div className="text-sm text-gray-600">已用存储</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                    <div className="text-2xl font-bold text-green-600">
                      {userProfile?.isPremium ? "Pro ♡" : "Free"}
                    </div>
                    <div className="text-sm text-gray-600">账户类型</div>
                  </div>
                </div>

                {/* 个人简介 */}
                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">个人简介</Label>
                  {editingProfile ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="介绍一下你自己..."
                        value={userProfile?.bio || ""}
                        onChange={(e) => setUserProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                        className="border-pink-200 focus:border-pink-400"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => updateProfile({ bio: userProfile?.bio })}
                          className="bg-pink-500 hover:bg-pink-600 text-white"
                        >
                          保存
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingProfile(false)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                      <p className="text-gray-700">
                        {userProfile?.bio || "这个用户很懒，什么都没有留下..."}
                      </p>
                    </div>
                  )}
                </div>

                {/* 偏好设置 */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">偏好设置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-800">邮件通知</div>
                        <div className="text-sm text-gray-600">接收系统通知邮件</div>
                      </div>
                      <Switch 
                        checked={userProfile?.preferences?.emailNotifications}
                        onCheckedChange={(checked) => {
                          if (userProfile) {
                            const updatedProfile = {
                              ...userProfile,
                              preferences: {
                                ...userProfile.preferences,
                                emailNotifications: checked
                              }
                            }
                            setUserProfile(updatedProfile)
                            updateProfile({ preferences: updatedProfile.preferences })
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-800">默认私有</div>
                        <div className="text-sm text-gray-600">上传图片默认设为私有</div>
                      </div>
                      <Switch 
                        checked={userProfile?.preferences?.privateByDefault}
                        onCheckedChange={(checked) => {
                          if (userProfile) {
                            const updatedProfile = {
                              ...userProfile,
                              preferences: {
                                ...userProfile.preferences,
                                privateByDefault: checked
                              }
                            }
                            setUserProfile(updatedProfile)
                            updateProfile({ preferences: updatedProfile.preferences })
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 存储配额 */}
                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">存储配额</Label>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700">存储使用情况</span>
                      <span className="text-blue-600 font-medium">
                        {userProfile ? `${formatFileSize(userProfile.storageUsed)} / ${formatFileSize(userProfile.storageQuota)}` : "0 B / 0 B"}
                      </span>
                    </div>
                    <Progress 
                      value={userProfile ? (userProfile.storageUsed / userProfile.storageQuota) * 100 : 0} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>已使用 {userProfile ? Math.round((userProfile.storageUsed / userProfile.storageQuota) * 100) : 0}%</span>
                      {!userProfile?.isPremium && (
                        <Button size="sm" className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
                          升级 Pro ♡
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API文档面板 */}
          <TabsContent value="docs" className="space-y-6">
            <Card className="border-pink-100 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-pink-700">API 文档 ♡</CardTitle>
                <CardDescription className="text-gray-600">
                  图床API接口使用说明
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 基础信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pink-700">基础信息</h3>
                  <div className="bg-pink-50 p-4 rounded-lg space-y-2 border border-pink-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">API Base URL:</span>
                      <code className="text-pink-600 bg-white px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">认证方式:</span>
                      <code className="text-pink-600 bg-white px-2 py-1 rounded">Bearer Token</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">内容类型:</span>
                      <code className="text-pink-600 bg-white px-2 py-1 rounded">multipart/form-data</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">用户类型:</span>
                      <Badge className={userProfile?.isPremium ? "bg-gradient-to-r from-pink-400 to-purple-500 text-white" : "bg-gray-100 text-gray-700"}>
                        {userProfile?.isPremium ? "Pro ♡" : "Free"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 可用存储策略 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pink-700">可用存储策略 ♡</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {storageStrategies.length > 0 ? (
                        storageStrategies.map((strategy) => (
                          <div key={strategy.id} className="bg-white p-3 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-800">{strategy.name}</span>
                              </div>
                              {strategy.is_user_default && (
                                <Badge className="bg-green-100 text-green-700 text-xs">默认</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-blue-600">ID: {strategy.id}</code>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-purple-600">{strategy.type}</code>
                              <Badge variant="outline" className={strategy.status === 'active' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-500'}>
                                {strategy.status === 'active' ? '可用' : '不可用'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-4">
                          <Cloud className="w-8 h-8 mx-auto mb-2 text-blue-300" />
                          <p className="text-gray-600 text-sm">暂无可用的存储策略</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 使用 <code className="bg-blue-200 px-1 rounded">strategyId</code> 参数指定存储策略，如：<code className="bg-blue-200 px-1 rounded">strategyId=1</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 上传接口 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pink-700">上传图片</h3>
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4 border border-purple-100">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-500 text-white">POST</Badge>
                        <code className="text-purple-600 bg-white px-2 py-1 rounded">/api/upload</code>
                      </div>
                      <p className="text-gray-600 text-sm">上传图片到图床</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">请求头</h4>
                      <div className="bg-gray-800 p-3 rounded text-white">
                        <pre className="text-sm">
{`Authorization: Bearer YOUR_API_TOKEN
Content-Type: multipart/form-data`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">请求参数</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-100">
                          <code className="text-purple-600">file</code>
                          <span className="text-gray-600">文件 (必需)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-100">
                          <code className="text-purple-600">strategyId</code>
                          <span className="text-gray-600">存储策略ID (可选，默认: 1)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-100">
                          <code className="text-purple-600">albumId</code>
                          <span className="text-gray-600">相册ID (可选)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border border-purple-100">
                          <code className="text-purple-600">isPrivate</code>
                          <span className="text-gray-600">是否私有 (可选，默认: false)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                      <div className="bg-gray-800 p-3 rounded text-white">
                        <pre className="text-sm overflow-x-auto">
{`{
  "success": true,
  "image": {
    "id": "12345",
    "filename": "image.jpg",
    "originalName": "my-image.jpg",
    "url": "https://your-domain.com/uploads/2024/01/image.jpg",
    "size": 102400,
    "width": 1920,
    "height": 1080,
    "md5": "abcd1234...",
    "sha1": "efgh5678...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 示例代码 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pink-700">示例代码 ♡</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">JavaScript (fetch)</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('strategyId', '${storageStrategies.find(s => s.is_user_default)?.id || '1'}');

fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiToken || 'YOUR_API_TOKEN'}'
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('上传成功:', data.image.url);
})
.catch(error => {
  console.error('上传失败:', error);
});`;
                            navigator.clipboard.writeText(code);
                            toast.success("代码已复制到剪贴板 ♡");
                          }}
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-gray-800 p-3 rounded text-white">
                        <pre className="text-sm overflow-x-auto">
{`const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('strategyId', '${storageStrategies.find(s => s.is_user_default)?.id || '1'}');

fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiToken || 'YOUR_API_TOKEN'}'
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('上传成功:', data.image.url);
})
.catch(error => {
  console.error('上传失败:', error);
});`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">Python (requests)</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = `import requests

url = "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload"
headers = {
    "Authorization": "Bearer ${apiToken || 'YOUR_API_TOKEN'}"
}
files = {
    "file": open("image.jpg", "rb")
}
data = {
    "strategyId": "${storageStrategies.find(s => s.is_user_default)?.id || '1'}"
}

response = requests.post(url, headers=headers, files=files, data=data)
result = response.json()

if result["success"]:
    print(f"上传成功: {result['image']['url']}")
else:
    print(f"上传失败: {result.get('error', '未知错误')}")`;
                            navigator.clipboard.writeText(code);
                            toast.success("代码已复制到剪贴板 ♡");
                          }}
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-gray-800 p-3 rounded text-white">
                        <pre className="text-sm overflow-x-auto">
{`import requests

url = "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload"
headers = {
    "Authorization": "Bearer ${apiToken || 'YOUR_API_TOKEN'}"
}
files = {
    "file": open("image.jpg", "rb")
}
data = {
    "strategyId": "${storageStrategies.find(s => s.is_user_default)?.id || '1'}"
}

response = requests.post(url, headers=headers, files=files, data=data)
result = response.json()

if result["success"]:
    print(f"上传成功: {result['image']['url']}")
else:
    print(f"上传失败: {result.get('error', '未知错误')}")`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">cURL</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload \\
  -H "Authorization: Bearer ${apiToken || 'YOUR_API_TOKEN'}" \\
  -F "file=@image.jpg" \\
  -F "strategyId=${storageStrategies.find(s => s.is_user_default)?.id || '1'}"`;
                            navigator.clipboard.writeText(code);
                            toast.success("代码已复制到剪贴板 ♡");
                          }}
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-gray-800 p-3 rounded text-white">
                        <pre className="text-sm overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/upload \\
  -H "Authorization: Bearer ${apiToken || 'YOUR_API_TOKEN'}" \\
  -F "file=@image.jpg" \\
  -F "strategyId=${storageStrategies.find(s => s.is_user_default)?.id || '1'}"`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 错误码说明 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pink-700">错误码说明</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <code className="text-red-600">400</code>
                        <span className="text-gray-700">请求参数错误</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <code className="text-red-600">401</code>
                        <span className="text-gray-700">未授权或Token无效</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <code className="text-red-600">413</code>
                        <span className="text-gray-700">文件过大</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <code className="text-red-600">415</code>
                        <span className="text-gray-700">不支持的文件类型</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <code className="text-red-600">500</code>
                        <span className="text-gray-700">服务器内部错误</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
