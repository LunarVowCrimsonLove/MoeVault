"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Users, ImageIcon, HardDrive, Activity, Shield, Settings, 
  ArrowLeft, Search, Filter, MoreHorizontal, Trash2, Edit, 
  Eye, Ban, Plus, RefreshCw, Database, Monitor,
  FileText, Code, Cloud, Home, Clock, Calendar, 
  Mail, Phone, MapPin, Star, Crown, AlertTriangle,
  CheckCircle, XCircle, Loader2, UserPlus, Send,
  TrendingUp, Upload, Download, Server, Key
} from "lucide-react"
import { toast } from "sonner"
import AdminGuard from "@/components/admin-guard"
import { useRouter } from "next/navigation"

interface AdminStats {
  users: {
    total: number
    active: number
    premium: number
    newThisMonth: number
  }
  images: {
    total: number
    totalSize: number
    uploadedToday: number
    uploadedThisMonth: number
  }
  storage: {
    totalUsed: number
    byProvider: Record<string, number>
  }
  system: {
    uptime: number
    version: string
    lastBackup: string
  }
}

interface User {
  id: string
  username: string
  email: string
  isAdmin: boolean
  isPremium: boolean
  quota: number
  used: number
  status: string
  createdAt: string
}

interface ImageItem {
  id: string
  filename: string
  url: string
  size: number
  userId: string
  userName: string
  userEmail: string
  createdAt: string
}

const sidebarItems = [
  { id: "overview", label: "概览", icon: Home },
  { id: "users", label: "用户管理", icon: Users },
  { id: "images", label: "图片管理", icon: ImageIcon },
  { id: "storage", label: "存储管理", icon: HardDrive },
  { id: "framework", label: "框架配置", icon: Settings },
  { id: "system", label: "系统设置", icon: Shield },
]

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<AdminStats>({
    users: { total: 0, active: 0, premium: 0, newThisMonth: 0 },
    images: { total: 0, totalSize: 0, uploadedToday: 0, uploadedThisMonth: 0 },
    storage: { totalUsed: 0, byProvider: {} },
    system: { uptime: 0, version: "1.0.0", lastBackup: "" }
  })
  const [users, setUsers] = useState<User[]>([])
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const [bulkNotificationOpen, setBulkNotificationOpen] = useState(false)
  const [notificationTarget, setNotificationTarget] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // 存储配置相关状态
  const [storageConfigs, setStorageConfigs] = useState<Record<string, any>>({})
  const [testingStorage, setTestingStorage] = useState<string | null>(null)
  
  // 配额调整相关状态
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [quotaUser, setQuotaUser] = useState<User | null>(null)
  
  // 存储分配相关状态
  const [storageAssignmentDialogOpen, setStorageAssignmentDialogOpen] = useState(false)
  const [storageAssignmentUser, setStorageAssignmentUser] = useState<User | null>(null)
  const [availableStrategies, setAvailableStrategies] = useState<any[]>([])
  const [userStorageAssignments, setUserStorageAssignments] = useState<any[]>([])
  const [loadingStorageData, setLoadingStorageData] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 加载用户数据
      const usersRes = await fetch("/api/admin/users")
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      // 加载图片数据
      const imagesRes = await fetch("/api/admin/images")
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json()
        setImages(imagesData.images || [])
      }

      // 更新统计数据
      setStats({
        users: {
          total: users.length,
          active: users.filter(u => u.status === "active").length,
          premium: users.filter(u => u.isPremium).length,
          newThisMonth: users.filter(u => new Date(u.createdAt).getMonth() === new Date().getMonth()).length
        },
        images: {
          total: images.length,
          totalSize: images.reduce((sum, img) => sum + img.size, 0),
          uploadedToday: images.filter(img => new Date(img.createdAt).toDateString() === new Date().toDateString()).length,
          uploadedThisMonth: images.filter(img => new Date(img.createdAt).getMonth() === new Date().getMonth()).length
        },
        storage: {
          totalUsed: images.reduce((sum, img) => sum + img.size, 0),
          byProvider: { local: 100, aliyun: 200, tencent: 150 }
        },
        system: {
          uptime: Date.now() - new Date("2024-01-01").getTime(),
          version: "1.0.0",
          lastBackup: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error("加载数据失败:", error)
      toast.error("加载数据失败")
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        toast.success(`用户${action}成功`)
        loadData() // 重新加载数据
      } else {
        toast.error(`用户${action}失败`)
      }
    } catch (error) {
      console.error('用户操作失败:', error)
      toast.error('操作失败')
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setUserDetailOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditUserOpen(true)
  }

  const handleAddUser = () => {
    setAddUserOpen(true)
  }

  const handleCreateUser = async (userData: any) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        toast.success("用户创建成功")
        setAddUserOpen(false)
        loadData() // 重新加载数据
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || "用户创建失败")
      }
    } catch (error) {
      console.error('创建用户失败:', error)
      toast.error('创建用户失败')
    }
  }

  const handleQuotaAdjustment = (user: User) => {
    setQuotaUser(user)
    setQuotaDialogOpen(true)
  }

  const handleStorageAssignment = async (user: User) => {
    setStorageAssignmentUser(user)
    setLoadingStorageData(true)
    setStorageAssignmentDialogOpen(true)
    
    try {
      // 获取用户的存储分配情况和可用策略
      const response = await fetch(`/api/admin/users/${user.id}/storage`)
      if (response.ok) {
        const data = await response.json()
        setUserStorageAssignments(data.assignedStorages || [])
        setAvailableStrategies(data.availableStrategies || [])
      } else {
        toast.error('获取存储数据失败')
      }
    } catch (error) {
      console.error('获取存储数据失败:', error)
      toast.error('获取存储数据失败')
    } finally {
      setLoadingStorageData(false)
    }
  }

  const handleAssignStorage = async (strategyId: number, isDefault: boolean = false, quota?: number) => {
    if (!storageAssignmentUser) return

    try {
      const response = await fetch(`/api/admin/users/${storageAssignmentUser.id}/storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategyId,
          isDefault,
          quota
        })
      })

      if (response.ok) {
        toast.success('存储分配成功')
        // 重新获取分配数据
        handleStorageAssignment(storageAssignmentUser)
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || '存储分配失败')
      }
    } catch (error) {
      console.error('存储分配失败:', error)
      toast.error('存储分配失败')
    }
  }

  const handleRemoveStorageAssignment = async (assignmentId: string) => {
    if (!storageAssignmentUser) return

    try {
      const response = await fetch(`/api/admin/users/${storageAssignmentUser.id}/storage`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignmentId
        })
      })

      if (response.ok) {
        toast.success('存储分配已移除')
        // 重新获取分配数据
        handleStorageAssignment(storageAssignmentUser)
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || '移除存储分配失败')
      }
    } catch (error) {
      console.error('移除存储分配失败:', error)
      toast.error('移除存储分配失败')
    }
  }

  const handleUpdateQuota = async (newQuota: number) => {
    if (!quotaUser) return

    try {
      const response = await fetch(`/api/admin/users`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: quotaUser.id,
          action: 'updateQuota',
          value: newQuota
        })
      })

      if (response.ok) {
        toast.success("配额更新成功")
        setQuotaDialogOpen(false)
        setQuotaUser(null)
        loadData() // 重新加载数据
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || "配额更新失败")
      }
    } catch (error) {
      console.error('配额更新失败:', error)
      toast.error('配额更新失败')
    }
  }

  const handleImagePreview = (image: ImageItem) => {
    setSelectedImage(image)
    setImagePreviewOpen(true)
  }

  const handleImageAction = async (imageId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/images/${imageId}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: action !== 'delete' ? JSON.stringify({ action }) : undefined
      })

      if (response.ok) {
        toast.success(`图片${action}成功`)
        loadData() // 重新加载数据
      } else {
        toast.error(`图片${action}失败`)
      }
    } catch (error) {
      console.error('图片操作失败:', error)
      toast.error('操作失败')
    }
  }

  const handleSendNotification = (user: User) => {
    setNotificationTarget(user)
    setNotificationDialogOpen(true)
  }

  const handleBulkNotification = () => {
    setBulkNotificationOpen(true)
  }

  const sendNotification = async (data: {
    title: string
    message: string
    type: 'info' | 'warning' | 'success' | 'error'
    userIds?: string[]
  }) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        toast.success('通知发送成功')
        setNotificationDialogOpen(false)
        setBulkNotificationOpen(false)
        setNotificationTarget(null)
      } else {
        toast.error('通知发送失败')
      }
    } catch (error) {
      console.error('发送通知失败:', error)
      toast.error('发送通知失败')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.status === "active") ||
                         (statusFilter === "inactive" && user.status !== "active") ||
                         (statusFilter === "admin" && user.isAdmin) ||
                         (statusFilter === "premium" && user.isPremium)
    return matchesSearch && matchesStatus
  })

  // 存储配置处理函数
  const handleStorageTest = async (provider: string, config?: any, testType: string = 'connection') => {
    setTestingStorage(provider)
    try {
      const response = await fetch('/api/storage/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          config,
          testType
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // 根据测试类型显示不同的成功消息
        let message = `${provider} ${getTestTypeLabel(testType)}成功`
        
        if (testType === 'connection' && result.result.usage) {
          const usage = result.result.usage
          const usedGB = (usage.used / (1024 * 1024 * 1024)).toFixed(2)
          const totalGB = (usage.total / (1024 * 1024 * 1024)).toFixed(2)
          message += `\n已用: ${usedGB}GB / ${totalGB}GB (${usage.percentage.toFixed(1)}%)`
        }
        
        if (testType === 'permissions' && result.result.permissions) {
          const permissions = result.result.permissions
          const successCount = permissions.filter((p: any) => p.status === 'success').length
          message += `\n权限检查: ${successCount}/${permissions.length} 项通过`
          
          // 显示详细权限信息
          permissions.forEach((perm: any) => {
            const status = perm.status === 'success' ? '✅' : '❌'
            console.log(`${status} ${perm.permission}: ${perm.status}`)
          })
        }
        
        if (testType === 'upload' && result.result.uploadResult) {
          const size = (result.result.uploadResult.size / 1024).toFixed(2)
          message += `\n测试文件上传成功 (${size}KB)`
        }
        
        toast.success(message)
      } else {
        const errorMsg = `${provider} ${getTestTypeLabel(testType)}失败: ${result.error}`
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error(`${provider} ${testType} 测试失败:`, error)
      toast.error(`${provider} ${getTestTypeLabel(testType)}失败`)
    } finally {
      setTestingStorage(null)
    }
  }

  const getTestTypeLabel = (testType: string): string => {
    switch (testType) {
      case 'connection': return '连接测试'
      case 'upload': return '上传测试'
      case 'permissions': return '权限测试'
      case 'oauth': return 'OAuth授权'
      default: return '测试'
    }
  }

  const handleOneDriveOAuth = async (region: 'global' | 'china' = 'global') => {
    try {
      const response = await fetch(`/api/auth/onedrive?region=${region}`, {
        method: 'GET'
      })

      const result = await response.json()
      
      if (result.authUrl) {
        // 在新窗口打开授权页面
        const authWindow = window.open(
          result.authUrl, 
          'onedrive-auth', 
          'width=600,height=700,scrollbars=yes,resizable=yes'
        )
        
        toast.success('请在新窗口中完成 OneDrive 授权')
        
        // 监听授权完成
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed)
            toast.success('授权窗口已关闭，请检查配置状态')
            // 可以在这里重新加载存储配置状态
          }
        }, 1000)
      } else {
        toast.error('无法启动 OneDrive 授权')
      }
    } catch (error) {
      console.error('OneDrive OAuth 失败:', error)
      toast.error('OneDrive 授权失败')
    }
  }

  const handleStorageConfigSave = async (provider: string, config: any) => {
    try {
      const response = await fetch('/api/storage/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          config,
          name: getProviderDisplayName(provider)
        })
      })

      if (response.ok) {
        toast.success(`${getProviderDisplayName(provider)} 配置保存成功`)
        // 更新本地状态
        setStorageConfigs(prev => ({
          ...prev,
          [provider]: { ...config, enabled: true }
        }))
      } else {
        const errorData = await response.json()
        toast.error(`配置保存失败: ${errorData.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('保存存储配置失败:', error)
      toast.error('配置保存失败')
    }
  }

  const getProviderDisplayName = (provider: string): string => {
    const names: Record<string, string> = {
      local: '本地存储',
      aliyun: '阿里云OSS',
      tencent: '腾讯云COS',
      github: 'GitHub',
      onedrive: 'Microsoft OneDrive',
      s3: 'Amazon S3'
    }
    return names[provider] || provider
  }

  const OverviewContent = () => (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <Card className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-pink-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">欢迎回来，管理员！</h1>
              <p className="text-gray-600">今天是 {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">系统运行时间</div>
              <div className="text-lg font-semibold text-purple-700">
                {Math.floor((Date.now() - new Date("2024-01-01").getTime()) / (1000 * 60 * 60 * 24))} 天
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => setActiveTab("users")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              用户统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.users.total}</div>
            <p className="text-xs text-blue-600 mb-3">
              活跃用户: {stats.users.active} | 高级用户: {stats.users.premium}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(stats.users.active / stats.users.total) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-500 mt-1">
              活跃率: {stats.users.total > 0 ? ((stats.users.active / stats.users.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab("images")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center">
              <ImageIcon className="w-4 h-4 mr-2" />
              图片统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.images.total}</div>
            <p className="text-xs text-green-600 mb-3">
              今日上传: {stats.images.uploadedToday} | 本月: {stats.images.uploadedThisMonth}
            </p>
            <div className="flex justify-between text-xs text-green-600">
              <span>增长趋势</span>
              <span className="text-green-800 font-semibold">↗ +12%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab("storage")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center">
              <HardDrive className="w-4 h-4 mr-2" />
              存储统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{formatFileSize(stats.storage.totalUsed)}</div>
            <p className="text-xs text-purple-600 mb-3">
              已使用存储空间
            </p>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: "78%" }}
              ></div>
            </div>
            <div className="text-xs text-purple-500 mt-1">
              使用率: 78%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              系统状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">正常</div>
            <p className="text-xs text-orange-600 mb-3">
              版本: {stats.system.version}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">所有服务运行正常</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作和活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-purple-600" />
              快速操作
            </CardTitle>
            <CardDescription>常用管理功能快速入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" size="sm" onClick={() => setActiveTab("users")} 
                      className="h-16 flex flex-col hover:bg-blue-50 hover:border-blue-200">
                <Users className="w-6 h-6 mb-1 text-blue-600" />
                <span className="text-xs">用户管理</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("images")}
                      className="h-16 flex flex-col hover:bg-green-50 hover:border-green-200">
                <ImageIcon className="w-6 h-6 mb-1 text-green-600" />
                <span className="text-xs">图片管理</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("storage")}
                      className="h-16 flex flex-col hover:bg-purple-50 hover:border-purple-200">
                <HardDrive className="w-6 h-6 mb-1 text-purple-600" />
                <span className="text-xs">存储配置</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("framework")}
                      className="h-16 flex flex-col hover:bg-orange-50 hover:border-orange-200">
                <Code className="w-6 h-6 mb-1 text-orange-600" />
                <span className="text-xs">框架配置</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("system")}
                      className="h-16 flex flex-col hover:bg-red-50 hover:border-red-200">
                <Shield className="w-6 h-6 mb-1 text-red-600" />
                <span className="text-xs">系统设置</span>
              </Button>
              <Button variant="outline" size="sm"
                      className="h-16 flex flex-col hover:bg-cyan-50 hover:border-cyan-200">
                <RefreshCw className="w-6 h-6 mb-1 text-cyan-600" />
                <span className="text-xs">数据同步</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              实时活动
            </CardTitle>
            <CardDescription>系统实时状态监控</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">新用户注册</span>
                <span className="text-green-600 font-semibold">+{stats.users.newThisMonth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">今日图片上传</span>
                <span className="text-blue-600 font-semibold">{stats.images.uploadedToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">存储使用率</span>
                <span className="text-purple-600 font-semibold">78%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">在线用户</span>
                <span className="text-orange-600 font-semibold flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  24
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">系统负载</span>
                <span className="text-cyan-600 font-semibold">低</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表和趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
              上传趋势
            </CardTitle>
            <CardDescription>过去7天的图片上传统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end justify-between gap-2">
              {[12, 19, 8, 15, 23, 18, 25].map((value, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="bg-gradient-to-t from-blue-400 to-blue-600 rounded-t w-8 transition-all duration-500 hover:from-blue-500 hover:to-blue-700"
                    style={{ height: `${(value / 25) * 100}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">
                    {['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              用户活跃度
            </CardTitle>
            <CardDescription>用户注册和活跃情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">总用户</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">{stats.users.total}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">活跃用户</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">{stats.users.active}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">高级用户</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">{stats.users.premium}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">本月新增</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                  <span className="text-sm font-semibold">+{stats.users.newThisMonth}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const UsersContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
        <div className="flex gap-2">
          <Input 
            placeholder="搜索用户..." 
            className="w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            搜索
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">暂停</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="premium">高级用户</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 用户统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">总用户数</p>
                <p className="text-2xl font-bold text-blue-700">{stats.users.total}</p>
                <p className="text-xs text-blue-500 mt-1">
                  较上月 +{Math.floor(Math.random() * 20)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">活跃用户</p>
                <p className="text-2xl font-bold text-green-700">{stats.users.active}</p>
                <p className="text-xs text-green-500 mt-1">
                  活跃率 {stats.users.total > 0 ? ((stats.users.active / stats.users.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">高级用户</p>
                <p className="text-2xl font-bold text-purple-700">{stats.users.premium}</p>
                <p className="text-xs text-purple-500 mt-1">
                  占比 {stats.users.total > 0 ? ((stats.users.premium / stats.users.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Crown className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">本月新增</p>
                <p className="text-2xl font-bold text-orange-700">{stats.users.newThisMonth}</p>
                <p className="text-xs text-orange-500 mt-1">
                  平均每日 +{Math.ceil(stats.users.newThisMonth / 30)}
                </p>
              </div>
              <Plus className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 批量操作栏 */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">批量操作:</span>
              <Button variant="outline" size="sm" className="hover:bg-purple-50 hover:border-purple-200">
                <Crown className="w-4 h-4 mr-2" />
                设为高级用户
              </Button>
              <Button variant="outline" size="sm" className="hover:bg-orange-50 hover:border-orange-200">
                <Ban className="w-4 h-4 mr-2" />
                批量暂停
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                批量删除
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-200" onClick={handleBulkNotification}>
                <Send className="w-4 h-4 mr-2" />
                群发通知
              </Button>
              <Button 
                onClick={handleAddUser}
                className="bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:from-pink-500 hover:to-purple-600 shadow-md">
                <UserPlus className="w-4 h-4 mr-2" />
                添加用户
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-semibold">
                  <Checkbox />
                </TableHead>
                <TableHead className="font-semibold">用户信息</TableHead>
                <TableHead className="font-semibold">状态</TableHead>
                <TableHead className="font-semibold">存储配额</TableHead>
                <TableHead className="font-semibold">上传统计</TableHead>
                <TableHead className="font-semibold">注册时间</TableHead>
                <TableHead className="font-semibold">最后活跃</TableHead>
                <TableHead className="font-semibold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 15).map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                          {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <Crown className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {user.isPremium && !user.isAdmin && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Star className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {user.username || '未知用户'}
                          {user.status === "active" && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 max-w-40 truncate flex items-center gap-1" title={user.email}>
                          <Mail className="w-3 h-3" />
                          {user.email || '无邮箱'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={user.status === "active" ? "default" : "secondary"} 
                        className={`w-fit ${user.status === "active" ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                      >
                        {user.status === "active" ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />活跃</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />暂停</>
                        )}
                      </Badge>
                      <div className="flex gap-1">
                        {user.isAdmin && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            管理员
                          </Badge>
                        )}
                        {user.isPremium && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                            <Crown className="w-3 h-3 mr-1" />
                            高级
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">已用:</span>
                        <span className="font-medium">{formatFileSize(user.used)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">总额:</span>
                        <span className="font-medium">{formatFileSize(user.quota)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((user.used / user.quota) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{((user.used / user.quota) * 100).toFixed(1)}% 已使用</span>
                        <span className={`${(user.used / user.quota) > 0.8 ? 'text-red-500' : 'text-green-500'}`}>
                          {(user.used / user.quota) > 0.8 ? '⚠️ 接近上限' : '✅ 正常'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">图片:</span>
                        <span className="font-medium">{Math.floor(Math.random() * 200) + 50}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">本月:</span>
                        <span className="text-green-600 font-medium flex items-center">
                          <Plus className="w-3 h-3 mr-1" />
                          {Math.floor(Math.random() * 50) + 5}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">今日:</span>
                        <span className="text-blue-600 font-medium">{Math.floor(Math.random() * 10)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} 天前
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(Math.random() * 24)} 小时前
                      </div>
                      <div className="text-xs text-gray-400">
                        在线时长: {Math.floor(Math.random() * 10) + 1}h
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="w-4 h-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑用户
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuotaAdjustment(user)}>
                          <Shield className="w-4 h-4 mr-2" />
                          调整配额
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStorageAssignment(user)}>
                          <Database className="w-4 h-4 mr-2" />
                          存储分配
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendNotification(user)}>
                          <Mail className="w-4 h-4 mr-2" />
                          发送通知
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, user.status === "active" ? "suspend" : "activate")}>
                          <Ban className="w-4 h-4 mr-2" />
                          {user.status === "active" ? "暂停账户" : "激活账户"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleUserAction(user.id, "delete")}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除用户
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页组件 */}
      <div className="flex justify-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            上一页
          </Button>
          <Button variant="outline" size="sm" className="bg-pink-100 text-pink-700 border-pink-200">
            1
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-pink-50">
            2
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-pink-50">
            3
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-pink-50">
            下一页
          </Button>
        </div>
      </div>

      {/* 用户详情对话框 */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {selectedUser?.username ? selectedUser.username.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div className="text-xl font-bold">{selectedUser?.username || '未知用户'}</div>
                <div className="text-sm text-gray-500">{selectedUser?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">用户名:</span>
                      <span className="font-medium">{selectedUser.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">邮箱:</span>
                      <span className="font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">状态:</span>
                      <Badge variant={selectedUser.status === "active" ? "default" : "secondary"}>
                        {selectedUser.status === "active" ? "活跃" : "暂停"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">权限:</span>
                      <div className="flex gap-2">
                        {selectedUser.isAdmin && (
                          <Badge variant="destructive">管理员</Badge>
                        )}
                        {selectedUser.isPremium && (
                          <Badge variant="outline">高级用户</Badge>
                        )}
                        {!selectedUser.isAdmin && !selectedUser.isPremium && (
                          <Badge variant="secondary">普通用户</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">注册时间:</span>
                      <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">存储统计</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">已用空间:</span>
                      <span className="font-medium">{formatFileSize(selectedUser.used)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总配额:</span>
                      <span className="font-medium">{formatFileSize(selectedUser.quota)}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">使用率:</span>
                        <span className="font-medium">{((selectedUser.used / selectedUser.quota) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-pink-400 to-purple-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((selectedUser.used / selectedUser.quota) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">剩余空间:</span>
                      <span className="font-medium text-green-600">{formatFileSize(selectedUser.quota - selectedUser.used)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 活动统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">活动统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{Math.floor(Math.random() * 200) + 50}</div>
                      <div className="text-sm text-blue-600">总图片数</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{Math.floor(Math.random() * 50) + 10}</div>
                      <div className="text-sm text-green-600">本月上传</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.floor(Math.random() * 10) + 1}</div>
                      <div className="text-sm text-purple-600">今日上传</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{Math.floor(Math.random() * 1000) + 100}</div>
                      <div className="text-sm text-orange-600">总访问量</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUserDetailOpen(false)}>
                  关闭
                </Button>
                <Button onClick={() => handleEditUser(selectedUser)}>
                  编辑用户
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input defaultValue={selectedUser.username} />
                </div>
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input defaultValue={selectedUser.email} />
                </div>
                <div className="space-y-2">
                  <Label>存储配额 (MB)</Label>
                  <Input type="number" defaultValue={selectedUser.quota / (1024 * 1024)} />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select defaultValue={selectedUser.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="suspended">暂停</SelectItem>
                      <SelectItem value="banned">封禁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>管理员权限</Label>
                  <Switch defaultChecked={selectedUser.isAdmin} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>高级用户</Label>
                  <Switch defaultChecked={selectedUser.isPremium} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                  取消
                </Button>
                <Button>
                  保存更改
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 添加新用户对话框 */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              添加新用户
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            const userData = {
              username: formData.get('username') as string,
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              quota: parseInt(formData.get('quota') as string) * 1024 * 1024, // 转换为字节
              status: formData.get('status') as string,
              isAdmin: formData.get('isAdmin') === 'on',
              isPremium: formData.get('isPremium') === 'on',
              sendWelcomeEmail: formData.get('sendWelcomeEmail') === 'on'
            }
            handleCreateUser(userData)
          }}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名 *</Label>
                  <Input 
                    id="username"
                    name="username" 
                    placeholder="输入用户名" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input 
                    id="email"
                    name="email" 
                    type="email" 
                    placeholder="user@example.com" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">初始密码 *</Label>
                  <Input 
                    id="password"
                    name="password" 
                    type="password" 
                    placeholder="设置初始密码" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quota">存储配额 (MB)</Label>
                  <Input 
                    id="quota"
                    name="quota" 
                    type="number" 
                    placeholder="100" 
                    defaultValue="100" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">账户状态</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="suspended">暂停</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>用户类型</Label>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="isAdmin" name="isAdmin" />
                      <Label htmlFor="isAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        管理员权限
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="isPremium" name="isPremium" />
                      <Label htmlFor="isPremium" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        高级用户
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-gray-700">通知设置</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sendWelcomeEmail" name="sendWelcomeEmail" defaultChecked />
                  <Label htmlFor="sendWelcomeEmail" className="text-sm">
                    发送欢迎邮件 (包含登录信息)
                  </Label>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>提示:</strong> 系统将自动为新用户生成API令牌，用户可在设置页面查看和管理。
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                  取消
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  创建用户
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 发送通知对话框 */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              发送通知
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            const notificationData = {
              title: formData.get('title') as string,
              message: formData.get('message') as string,
              type: formData.get('type') as 'info' | 'warning' | 'success' | 'error',
              userIds: notificationTarget ? [notificationTarget.id] : []
            }
            sendNotification(notificationData)
          }}>
            <div className="space-y-4">
              {notificationTarget && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">发送给:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {notificationTarget.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{notificationTarget.username}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="title">通知标题</Label>
                <Input 
                  id="title"
                  name="title" 
                  placeholder="输入通知标题" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">通知内容</Label>
                <Textarea 
                  id="message"
                  name="message" 
                  placeholder="输入通知内容..." 
                  rows={3}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">通知类型</Label>
                <Select name="type" defaultValue="info">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setNotificationDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                  <Send className="w-4 h-4 mr-2" />
                  发送
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 群发通知对话框 */}
      <Dialog open={bulkNotificationOpen} onOpenChange={setBulkNotificationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              群发通知
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            const target = formData.get('target') as string
            let userIds: string[] = []
            
            if (target === 'all') {
              userIds = users.map(u => u.id)
            } else if (target === 'active') {
              userIds = users.filter(u => u.status === 'active').map(u => u.id)
            } else if (target === 'premium') {
              userIds = users.filter(u => u.isPremium).map(u => u.id)
            }
            
            const notificationData = {
              title: formData.get('title') as string,
              message: formData.get('message') as string,
              type: formData.get('type') as 'info' | 'warning' | 'success' | 'error',
              userIds
            }
            sendNotification(notificationData)
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target">发送对象</Label>
                <Select name="target" defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有用户 ({users.length}人)</SelectItem>
                    <SelectItem value="active">活跃用户 ({users.filter(u => u.status === 'active').length}人)</SelectItem>
                    <SelectItem value="premium">高级用户 ({users.filter(u => u.isPremium).length}人)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">通知标题</Label>
                <Input 
                  id="title"
                  name="title" 
                  placeholder="输入通知标题" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">通知内容</Label>
                <Textarea 
                  id="message"
                  name="message" 
                  placeholder="输入通知内容..." 
                  rows={3}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">通知类型</Label>
                <Select name="type" defaultValue="info">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  群发通知会发送给所有选中的用户，请谨慎操作。
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setBulkNotificationOpen(false)}>
                  取消
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
                  <Send className="w-4 h-4 mr-2" />
                  群发
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 配额调整对话框 */}
      <Dialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              调整存储配额
            </DialogTitle>
          </DialogHeader>
          
          {quotaUser && (
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const newQuota = parseInt(formData.get('quota') as string) * 1024 * 1024 // 转换为字节
              handleUpdateQuota(newQuota)
            }}>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {quotaUser.username ? quotaUser.username.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">{quotaUser.username}</p>
                      <p className="text-sm text-blue-600">{quotaUser.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">当前配额:</span>
                      <span className="font-medium">{formatFileSize(quotaUser.quota)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">已使用:</span>
                      <span className="font-medium">{formatFileSize(quotaUser.used)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">使用率:</span>
                      <span className={`font-medium ${(quotaUser.used / quotaUser.quota) > 0.8 ? 'text-red-600' : 'text-green-600'}`}>
                        {((quotaUser.used / quotaUser.quota) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quota">新配额 (MB) *</Label>
                  <Input 
                    id="quota"
                    name="quota" 
                    type="number" 
                    min="1"
                    step="1"
                    defaultValue={(quotaUser.quota / (1024 * 1024)).toString()}
                    placeholder="输入新的配额大小"
                    required 
                  />
                  <p className="text-xs text-gray-500">
                    建议配额大小：100MB (普通用户)、500MB (活跃用户)、1GB (高级用户)
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    <strong>注意:</strong> 如果新配额小于已使用空间，用户将无法上传新文件直到释放空间。
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setQuotaDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    更新配额
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 存储分配对话框 */}
      <Dialog open={storageAssignmentDialogOpen} onOpenChange={setStorageAssignmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              用户存储分配管理
            </DialogTitle>
          </DialogHeader>
          
          {storageAssignmentUser && (
            <div className="space-y-6">
              {/* 用户信息 */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {storageAssignmentUser.username ? storageAssignmentUser.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="font-medium text-purple-800">{storageAssignmentUser.username}</p>
                    <p className="text-sm text-purple-600">{storageAssignmentUser.email}</p>
                  </div>
                </div>
              </div>

              {loadingStorageData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
                    <p className="text-gray-600">加载存储数据中...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 已分配的存储 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      已分配存储
                    </h3>
                    
                    {userStorageAssignments.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>用户尚未分配任何存储</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userStorageAssignments.map((assignment: any) => (
                          <div key={assignment.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                  <Database className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{assignment.name}</p>
                                  <p className="text-sm text-gray-500">类型: {assignment.type}</p>
                                  {assignment.quota && (
                                    <p className="text-sm text-blue-600">配额: {assignment.quota}GB</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {assignment.isDefault && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">默认</Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveStorageAssignment(assignment.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              分配时间: {new Date(assignment.assignedAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 可分配的存储 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      分配新存储
                    </h3>
                    
                    {availableStrategies.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>暂无可用的存储策略</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableStrategies.map((strategy: any) => {
                          const isAssigned = userStorageAssignments.some((a: any) => a.strategyId === strategy.id)
                          return (
                            <div key={strategy.id} className={`p-4 rounded-lg border ${isAssigned ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-purple-300 cursor-pointer'} transition-colors`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAssigned ? 'bg-gray-300' : 'bg-gradient-to-br from-green-400 to-blue-500'}`}>
                                    <Database className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isAssigned ? 'text-gray-500' : 'text-gray-800'}`}>
                                      {strategy.name}
                                    </p>
                                    <p className={`text-sm ${isAssigned ? 'text-gray-400' : 'text-gray-500'}`}>
                                      类型: {strategy.type} | 状态: {strategy.status}
                                    </p>
                                  </div>
                                </div>
                                
                                {isAssigned ? (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-500">已分配</Badge>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAssignStorage(strategy.id, false)}
                                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                      分配
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAssignStorage(strategy.id, true)}
                                      className="bg-gradient-to-r from-purple-400 to-blue-500 text-white"
                                    >
                                      设为默认
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setStorageAssignmentDialogOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  const ImagesContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">图片管理</h2>
        <div className="flex gap-2">
          <Input 
            placeholder="搜索图片..." 
            className="w-64"
          />
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            搜索
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            筛选
          </Button>
        </div>
      </div>

      {/* 图片统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">总图片数</p>
                <p className="text-2xl font-bold text-blue-700">{images.length}</p>
              </div>
              <ImageIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">今日上传</p>
                <p className="text-2xl font-bold text-green-700">{stats.images.uploadedToday}</p>
              </div>
              <Plus className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">存储占用</p>
                <p className="text-2xl font-bold text-purple-700">{formatFileSize(stats.storage.totalUsed)}</p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">本月上传</p>
                <p className="text-2xl font-bold text-orange-700">{stats.images.uploadedThisMonth}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>图片</TableHead>
                <TableHead>上传者</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>尺寸</TableHead>
                <TableHead>存储位置</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.slice(0, 15).map((image) => (
                <TableRow key={image.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative group cursor-pointer" onClick={() => handleImagePreview(image)}>
                        <img 
                          src={image.url} 
                          alt={image.filename}
                          className="w-16 h-16 object-cover rounded-lg shadow-sm border transition-transform hover:scale-105"
                        />
                        {/* 图片预览悬浮效果 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm max-w-32 truncate" title={image.filename}>
                          {image.filename}
                        </div>
                        <div className="text-xs text-gray-500">
                          {image.filename.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{image.userName}</div>
                      <div className="text-xs text-gray-500 max-w-32 truncate" title={image.userEmail}>
                        {image.userEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {formatFileSize(image.size)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {/* 这里应该从API获取实际尺寸，暂时使用占位符 */}
                      1920×1080
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {/* 根据strategy_id显示存储位置 */}
                      本地存储
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {new Date(image.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(image.createdAt).toLocaleTimeString('zh-CN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleImagePreview(image)}>
                          <Eye className="w-4 h-4 mr-2" />
                          预览图片
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新生成链接
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          下载原图
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleImageAction(image.id, 'delete')}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除图片
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页组件占位 */}
      <div className="flex justify-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            上一页
          </Button>
          <Button variant="outline" size="sm" className="bg-pink-100 text-pink-700">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            下一页
          </Button>
        </div>
      </div>

      {/* 图片预览对话框 */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              图片详情
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              {/* 图片预览 */}
              <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.filename}
                  className="max-w-full max-h-96 object-contain rounded-lg shadow-md"
                />
              </div>
              
              {/* 图片信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">文件名:</span>
                      <span className="font-medium max-w-48 truncate" title={selectedImage.filename}>
                        {selectedImage.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">文件大小:</span>
                      <span className="font-medium">{formatFileSize(selectedImage.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">文件类型:</span>
                      <span className="font-medium uppercase">
                        {selectedImage.filename.split('.').pop()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">上传时间:</span>
                      <span className="font-medium">
                        {new Date(selectedImage.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">上传者信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">用户名:</span>
                      <span className="font-medium">{selectedImage.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">邮箱:</span>
                      <span className="font-medium max-w-48 truncate" title={selectedImage.userEmail}>
                        {selectedImage.userEmail}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">存储位置:</span>
                      <Badge variant="outline">本地存储</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">访问次数:</span>
                      <span className="font-medium text-green-600">
                        {Math.floor(Math.random() * 1000) + 1}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 图片链接 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">分享链接</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input 
                        value={selectedImage.url} 
                        readOnly 
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedImage.url)
                          toast.success('链接已复制到剪贴板')
                        }}
                      >
                        复制链接
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      点击复制按钮可以将图片链接复制到剪贴板
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    下载原图
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成链接
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImagePreviewOpen(false)}>
                    关闭
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleImageAction(selectedImage.id, 'delete')
                      setImagePreviewOpen(false)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除图片
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  const StorageContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">存储管理</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            测试连接
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
            保存配置
          </Button>
        </div>
      </div>

      {/* 存储统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">总存储使用</p>
                <p className="text-2xl font-bold text-blue-700">{formatFileSize(stats.storage.totalUsed)}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">活跃存储源</p>
                <p className="text-2xl font-bold text-green-700">3</p>
              </div>
              <Cloud className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">存储可用率</p>
                <p className="text-2xl font-bold text-purple-700">98.5%</p>
              </div>
              <Monitor className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 存储配置卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 本地存储 */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center">
              <HardDrive className="w-5 h-5 mr-2" />
              本地存储
            </CardTitle>
            <CardDescription>服务器本地文件系统存储</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用本地存储</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>存储路径</Label>
              <Input placeholder="/uploads" defaultValue="/uploads" />
            </div>
            <div className="space-y-2">
              <Label>最大文件大小 (MB)</Label>
              <Input type="number" placeholder="10" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label>自动清理过期文件</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择清理策略" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">永不清理</SelectItem>
                  <SelectItem value="30d">30天</SelectItem>
                  <SelectItem value="90d">90天</SelectItem>
                  <SelectItem value="365d">1年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-green-600 font-medium">已连接</span>
            </div>
          </CardContent>
        </Card>

        {/* 阿里云OSS */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center">
              <Cloud className="w-5 h-5 mr-2" />
              阿里云 OSS
            </CardTitle>
            <CardDescription>阿里云对象存储服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用OSS</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>AccessKey ID</Label>
              <Input placeholder="输入AccessKey ID" />
            </div>
            <div className="space-y-2">
              <Label>AccessKey Secret</Label>
              <Input type="password" placeholder="输入AccessKey Secret" />
            </div>
            <div className="space-y-2">
              <Label>Bucket名称</Label>
              <Input placeholder="输入Bucket名称" />
            </div>
            <div className="space-y-2">
              <Label>地域/端点</Label>
              <Input placeholder="例如: oss-cn-hangzhou 或自定义端点" />
            </div>
            <div className="space-y-2">
              <Label>自定义域名 (可选)</Label>
              <Input placeholder="https://your-custom-domain.com" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('aliyun', {}, 'connection')}
                disabled={testingStorage === 'aliyun'}
              >
                {testingStorage === 'aliyun' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                连接
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('aliyun', {}, 'upload')}
                disabled={testingStorage === 'aliyun'}
              >
                {testingStorage === 'aliyun' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                上传
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('aliyun', {}, 'permissions')}
                disabled={testingStorage === 'aliyun'}
              >
                {testingStorage === 'aliyun' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1" />
                )}
                权限
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-gray-600 font-medium">未配置</span>
            </div>
          </CardContent>
        </Card>

        {/* 腾讯云COS */}
        <Card className="bg-white/80 backdrop-blur-sm border-cyan-100">
          <CardHeader>
            <CardTitle className="text-cyan-700 flex items-center">
              <Cloud className="w-5 h-5 mr-2" />
              腾讯云 COS
            </CardTitle>
            <CardDescription>腾讯云对象存储服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用COS</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>SecretId</Label>
              <Input placeholder="输入SecretId" />
            </div>
            <div className="space-y-2">
              <Label>SecretKey</Label>
              <Input type="password" placeholder="输入SecretKey" />
            </div>
            <div className="space-y-2">
              <Label>存储桶名称</Label>
              <Input placeholder="输入存储桶名称" />
            </div>
            <div className="space-y-2">
              <Label>地域</Label>
              <Input placeholder="例如: ap-beijing 或自定义地域" />
            </div>
            <div className="space-y-2">
              <Label>加速域名 (可选)</Label>
              <Input placeholder="https://your-cdn-domain.com" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('tencent', {}, 'connection')}
                disabled={testingStorage === 'tencent'}
              >
                {testingStorage === 'tencent' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                连接
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('tencent', {}, 'upload')}
                disabled={testingStorage === 'tencent'}
              >
                {testingStorage === 'tencent' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                上传
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('tencent', {}, 'permissions')}
                disabled={testingStorage === 'tencent'}
              >
                {testingStorage === 'tencent' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1" />
                )}
                权限
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-gray-600 font-medium">未配置</span>
            </div>
          </CardContent>
        </Card>

        {/* Amazon S3 */}
        <Card className="bg-white/80 backdrop-blur-sm border-yellow-100">
          <CardHeader>
            <CardTitle className="text-yellow-700 flex items-center">
              <Cloud className="w-5 h-5 mr-2" />
              Amazon S3
            </CardTitle>
            <CardDescription>亚马逊简单存储服务，支持兼容 S3 API 的服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用S3</Label>
              <Switch />
            </div>
            
            <div className="space-y-2">
              <Label>服务类型</Label>
              <Select defaultValue="aws">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">Amazon S3</SelectItem>
                  <SelectItem value="minio">MinIO</SelectItem>
                  <SelectItem value="digital-ocean">DigitalOcean Spaces</SelectItem>
                  <SelectItem value="linode">Linode Object Storage</SelectItem>
                  <SelectItem value="custom">自定义 S3 兼容服务</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input placeholder="输入Access Key ID" />
            </div>
            
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <Input type="password" placeholder="输入Secret Access Key" />
            </div>
            
            <div className="space-y-2">
              <Label>Bucket名称</Label>
              <Input placeholder="输入Bucket名称" />
            </div>
            
            <div className="space-y-2">
              <Label>地域</Label>
              <Select defaultValue="us-east-1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">美国东部 (弗吉尼亚北部)</SelectItem>
                  <SelectItem value="us-west-2">美国西部 (俄勒冈)</SelectItem>
                  <SelectItem value="eu-west-1">欧洲 (爱尔兰)</SelectItem>
                  <SelectItem value="ap-southeast-1">亚太区域 (新加坡)</SelectItem>
                  <SelectItem value="ap-northeast-1">亚太区域 (东京)</SelectItem>
                  <SelectItem value="custom">自定义地域</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>自定义端点 (可选)</Label>
              <Input placeholder="https://s3.amazonaws.com 或自定义端点" />
            </div>
            
            <div className="space-y-2">
              <Label>CDN 加速域名 (可选)</Label>
              <Input placeholder="https://your-cdn-domain.com" />
            </div>
            
            <div className="space-y-2">
              <Label>存储类别</Label>
              <Select defaultValue="STANDARD">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">标准存储</SelectItem>
                  <SelectItem value="STANDARD_IA">标准-不频繁访问</SelectItem>
                  <SelectItem value="ONEZONE_IA">单区域-不频繁访问</SelectItem>
                  <SelectItem value="REDUCED_REDUNDANCY">低冗余存储</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>启用服务端加密</Label>
              <Switch />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('s3', {}, 'connection')}
                disabled={testingStorage === 's3'}
              >
                {testingStorage === 's3' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                连接
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('s3', {}, 'upload')}
                disabled={testingStorage === 's3'}
              >
                {testingStorage === 's3' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                上传
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('s3', {}, 'permissions')}
                disabled={testingStorage === 's3'}
              >
                {testingStorage === 's3' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1" />
                )}
                权限
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-gray-600 font-medium">未配置</span> | 
              权限: <span className="text-orange-600 font-medium">需要 s3:PutObject, s3:GetObject, s3:DeleteObject</span>
            </div>
          </CardContent>
        </Card>

        {/* Microsoft OneDrive */}
        <Card className="bg-white/80 backdrop-blur-sm border-indigo-100">
          <CardHeader>
            <CardTitle className="text-indigo-700 flex items-center">
              <Cloud className="w-5 h-5 mr-2" />
              Microsoft OneDrive
            </CardTitle>
            <CardDescription>微软云存储服务，支持国际版和中国版</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用OneDrive</Label>
              <Switch />
            </div>
            
            <div className="space-y-2">
              <Label>OneDrive 版本</Label>
              <Select defaultValue="global">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">国际版 (OneDrive)</SelectItem>
                  <SelectItem value="china">中国版 (世纪互联)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                选择对应的 OneDrive 版本以确保正确的 API 端点
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>应用程序ID (Client ID)</Label>
              <Input placeholder="输入应用程序ID" />
              <p className="text-xs text-gray-500">
                在 <a href="https://portal.azure.com/" target="_blank" className="text-blue-600 hover:underline">Azure Portal</a> 中注册应用获取
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>客户端密钥 (Client Secret)</Label>
              <Input type="password" placeholder="输入客户端密钥" />
            </div>
            
            <div className="space-y-2">
              <Label>重定向URI</Label>
              <Input placeholder="https://yourdomain.com/api/auth/onedrive/callback" />
              <p className="text-xs text-gray-500">
                需要在 Azure 应用注册中配置相同的重定向 URI
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>存储文件夹</Label>
              <Input placeholder="/Images" defaultValue="/Images" />
            </div>
            
            <div className="space-y-2">
              <Label>权限范围</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Files.ReadWrite</Badge>
                <Badge variant="outline" className="text-xs">Files.ReadWrite.All</Badge>
                <Badge variant="outline" className="text-xs">User.Read</Badge>
              </div>
              <p className="text-xs text-gray-500">
                建议的最小权限范围
              </p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => handleOneDriveOAuth('global')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={testingStorage === 'onedrive'}
              >
                {testingStorage === 'onedrive' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在授权...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    OneDrive OAuth 授权
                  </>
                )}
              </Button>
              <p className="text-xs text-blue-600 text-center">
                点击进行 OneDrive OAuth 授权以获取访问令牌
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('onedrive', { region: 'global' }, 'connection')}
                disabled={testingStorage === 'onedrive'}
              >
                {testingStorage === 'onedrive' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                连接
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('onedrive', { region: 'global' }, 'upload')}
                disabled={testingStorage === 'onedrive'}
              >
                {testingStorage === 'onedrive' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                上传
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('onedrive', { region: 'global' }, 'permissions')}
                disabled={testingStorage === 'onedrive'}
              >
                {testingStorage === 'onedrive' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1" />
                )}
                权限
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-gray-600 font-medium">未授权</span> | 
              存储空间: <span className="text-blue-600 font-medium">5GB 免费</span>
            </div>
          </CardContent>
        </Card>

        {/* GitHub */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-800/20">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center">
              <Code className="w-5 h-5 mr-2" />
              GitHub
            </CardTitle>
            <CardDescription>使用 GitHub 仓库作为免费图床存储</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用GitHub存储</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>Personal Access Token</Label>
              <Input type="password" placeholder="输入 GitHub Token" />
              <p className="text-xs text-gray-500">
                需要 'repo' 权限的 Token，<a href="https://github.com/settings/tokens" target="_blank" className="text-blue-600 hover:underline">前往创建</a>
              </p>
            </div>
            <div className="space-y-2">
              <Label>用户名/组织名</Label>
              <Input placeholder="例如: yourusername" />
            </div>
            <div className="space-y-2">
              <Label>仓库名</Label>
              <Input placeholder="例如: image-hosting" />
            </div>
            <div className="space-y-2">
              <Label>分支名</Label>
              <Input placeholder="main" defaultValue="main" />
            </div>
            <div className="space-y-2">
              <Label>存储路径</Label>
              <Input placeholder="uploads" defaultValue="uploads" />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 提示：GitHub 免费账户提供 1GB 存储空间，适合小型图床使用。请确保仓库为 Public 以正常访问图片。
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('github', {}, 'connection')}
                disabled={testingStorage === 'github'}
              >
                {testingStorage === 'github' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                连接
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('github', {}, 'upload')}
                disabled={testingStorage === 'github'}
              >
                {testingStorage === 'github' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                上传
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => handleStorageTest('github', {}, 'permissions')}
                disabled={testingStorage === 'github'}
              >
                {testingStorage === 'github' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1" />
                )}
                权限
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              状态: <span className="text-gray-600 font-medium">未配置</span>
            </div>
          </CardContent>
        </Card>

        {/* 全局存储设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-pink-100 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-pink-700 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              全局存储设置
            </CardTitle>
            <CardDescription>影响所有存储提供商的通用设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">存储策略</h4>
                <div className="space-y-2">
                  <Label>主存储提供商</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择主存储" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">本地存储</SelectItem>
                      <SelectItem value="aliyun">阿里云OSS</SelectItem>
                      <SelectItem value="tencent">腾讯云COS</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="onedrive">Microsoft OneDrive</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>备份存储提供商</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择备份存储" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无备份</SelectItem>
                      <SelectItem value="local">本地存储</SelectItem>
                      <SelectItem value="aliyun">阿里云OSS</SelectItem>
                      <SelectItem value="tencent">腾讯云COS</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>启用自动备份</Label>
                  <Switch />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">文件处理</h4>
                <div className="flex items-center justify-between">
                  <Label>自动图片压缩</Label>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>压缩质量</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择质量" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高质量 (90%)</SelectItem>
                      <SelectItem value="medium">中等质量 (75%)</SelectItem>
                      <SelectItem value="low">低质量 (60%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>生成缩略图</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>EXIF数据清理</Label>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const SystemContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">系统设置</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Database className="w-4 h-4 mr-2" />
            备份数据
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            重启服务
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
            保存设置
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              基础设置
            </CardTitle>
            <CardDescription>网站基本信息配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>网站名称</Label>
              <Input placeholder="萌系图床" defaultValue="萌系图床" />
            </div>
            <div className="space-y-2">
              <Label>网站标语</Label>
              <Input placeholder="可爱到爆炸的图床服务" defaultValue="可爱到爆炸的图床服务" />
            </div>
            <div className="space-y-2">
              <Label>网站描述</Label>
              <Input placeholder="一个可爱的图片托管服务" />
            </div>
            <div className="space-y-2">
              <Label>网站关键词</Label>
              <Input placeholder="图床,图片托管,萌系,可爱" />
            </div>
            <div className="space-y-2">
              <Label>联系邮箱</Label>
              <Input placeholder="admin@example.com" />
            </div>
            <div className="space-y-2">
              <Label>备案号</Label>
              <Input placeholder="粤ICP备xxxxxxxx号" />
            </div>
          </CardContent>
        </Card>

        {/* 用户设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-green-100">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              用户设置
            </CardTitle>
            <CardDescription>用户注册和权限配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>允许用户注册</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>需要邮箱验证</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>需要管理员审核</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>默认用户配额 (MB)</Label>
              <Input type="number" placeholder="100" defaultValue="100" />
            </div>
            <div className="space-y-2">
              <Label>高级用户配额 (MB)</Label>
              <Input type="number" placeholder="1000" defaultValue="1000" />
            </div>
            <div className="space-y-2">
              <Label>用户等级制度</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择等级制度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">禁用</SelectItem>
                  <SelectItem value="simple">简单 (普通/高级)</SelectItem>
                  <SelectItem value="advanced">高级 (多级制度)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 上传设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardHeader>
            <CardTitle className="text-purple-700 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              上传设置
            </CardTitle>
            <CardDescription>文件上传相关配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>最大文件大小 (MB)</Label>
              <Input type="number" placeholder="10" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label>允许的文件类型</Label>
              <Input placeholder="jpg,jpeg,png,gif,webp,svg" defaultValue="jpg,jpeg,png,gif,webp" />
            </div>
            <div className="space-y-2">
              <Label>图片命名规则</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择命名规则" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">随机字符串</SelectItem>
                  <SelectItem value="timestamp">时间戳</SelectItem>
                  <SelectItem value="original">保持原名</SelectItem>
                  <SelectItem value="uuid">UUID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>启用图片压缩</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>允许匿名上传</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>生成缩略图</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>缩略图大小</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择缩略图大小" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小 (150x150)</SelectItem>
                  <SelectItem value="medium">中 (300x300)</SelectItem>
                  <SelectItem value="large">大 (500x500)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 安全设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-red-100">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              安全设置
            </CardTitle>
            <CardDescription>系统安全和防护配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用防火墙</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用DDoS防护</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用IP白名单</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>登录失败限制 (次)</Label>
              <Input type="number" placeholder="5" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>锁定时间 (分钟)</Label>
              <Input type="number" placeholder="30" defaultValue="30" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用二步验证</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>强制HTTPS</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* 性能设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              性能设置
            </CardTitle>
            <CardDescription>系统性能优化配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用Redis缓存</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>缓存过期时间 (秒)</Label>
              <Input type="number" placeholder="3600" defaultValue="3600" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用数据库连接池</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>最大并发连接数</Label>
              <Input type="number" placeholder="100" defaultValue="100" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用静态资源压缩</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>图片压缩质量 (%)</Label>
              <Input type="number" placeholder="85" defaultValue="85" />
            </div>
          </CardContent>
        </Card>

        {/* 监控设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-cyan-100">
          <CardHeader>
            <CardTitle className="text-cyan-700 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              监控设置
            </CardTitle>
            <CardDescription>系统监控和日志配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用系统监控</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用访问日志</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用错误日志</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>日志保留时间 (天)</Label>
              <Input type="number" placeholder="30" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label>监控检查间隔 (分钟)</Label>
              <Input type="number" placeholder="5" defaultValue="5" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用邮件告警</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>告警邮箱</Label>
              <Input placeholder="alert@example.com" />
            </div>
          </CardContent>
        </Card>

        {/* 备份设置 */}
        <Card className="bg-white/80 backdrop-blur-sm border-indigo-100">
          <CardHeader>
            <CardTitle className="text-indigo-700 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              备份设置
            </CardTitle>
            <CardDescription>数据备份和恢复配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>启用自动备份</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>备份频率</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择备份频率" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每日</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                  <SelectItem value="monthly">每月</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备份保留数量</Label>
              <Input type="number" placeholder="7" defaultValue="7" />
            </div>
            <div className="space-y-2">
              <Label>备份存储位置</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择存储位置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">本地存储</SelectItem>
                  <SelectItem value="cloud">云存储</SelectItem>
                  <SelectItem value="both">本地+云端</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>压缩备份文件</Label>
              <Switch defaultChecked />
            </div>
            <Button variant="outline" className="w-full">
              <Database className="w-4 h-4 mr-2" />
              立即备份
            </Button>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-700 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              系统信息
            </CardTitle>
            <CardDescription>当前系统状态和版本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">系统版本:</span>
                  <span className="font-medium">v1.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next.js版本:</span>
                  <span className="font-medium">14.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Node.js版本:</span>
                  <span className="font-medium">20.9.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">数据库版本:</span>
                  <span className="font-medium">MySQL 8.0</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">运行时间:</span>
                  <span className="font-medium">72小时</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU使用率:</span>
                  <span className="font-medium text-green-600">15%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">内存使用:</span>
                  <span className="font-medium text-blue-600">256MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">磁盘使用:</span>
                  <span className="font-medium text-purple-600">45%</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">最后更新:</span>
                <span className="text-sm font-medium">2024-12-21 14:30:25</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 危险操作区域 */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            危险操作
          </CardTitle>
          <CardDescription className="text-red-600">以下操作可能影响系统稳定性，请谨慎操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              重启系统
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Database className="w-4 h-4 mr-2" />
              清空数据库
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              重置系统
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const FrameworkContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">框架配置</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            重载配置
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-pink-400 to-purple-500 text-white">
            保存设置
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 上传配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-700">上传配置</CardTitle>
            <CardDescription>管理文件上传相关设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxFileSize">最大文件大小 (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                defaultValue="10"
                className="border-pink-200 focus:border-pink-400"
              />
            </div>
            <div>
              <Label htmlFor="allowedExtensions">允许的文件扩展名</Label>
              <Input
                id="allowedExtensions"
                placeholder="jpg,jpeg,png,gif,webp"
                className="border-pink-200 focus:border-pink-400"
              />
            </div>
            <div>
              <Label htmlFor="compressionQuality">图片压缩质量 (%)</Label>
              <Input
                id="compressionQuality"
                type="number"
                min="1"
                max="100"
                defaultValue="80"
                className="border-pink-200 focus:border-pink-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* API 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-700">API 配置</CardTitle>
            <CardDescription>配置 API 访问和安全设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiRateLimit">API 速率限制 (请求/分钟)</Label>
              <Input
                id="apiRateLimit"
                type="number"
                defaultValue="60"
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <Label htmlFor="jwtSecret">JWT 密钥</Label>
              <Input
                id="jwtSecret"
                type="password"
                placeholder="保留为空则使用当前密钥"
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <Label htmlFor="corsOrigins">CORS 允许的域名</Label>
              <Textarea
                id="corsOrigins"
                placeholder="https://example.com&#10;https://app.example.com"
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* 缓存配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">缓存配置</CardTitle>
            <CardDescription>管理缓存策略和性能设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cacheProvider">缓存提供商</Label>
              <Select defaultValue="memory">
                <SelectTrigger className="border-blue-200 focus:border-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="memory">内存缓存</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                  <SelectItem value="file">文件缓存</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cacheTTL">缓存过期时间 (秒)</Label>
              <Input
                id="cacheTTL"
                type="number"
                defaultValue="3600"
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableCache" defaultChecked />
              <Label htmlFor="enableCache">启用缓存</Label>
            </div>
          </CardContent>
        </Card>

        {/* 安全配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">安全配置</CardTitle>
            <CardDescription>配置安全策略和防护设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="enableHttps" defaultChecked />
              <Label htmlFor="enableHttps">强制 HTTPS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableCSRF" defaultChecked />
              <Label htmlFor="enableCSRF">启用 CSRF 保护</Label>
            </div>
            <div>
              <Label htmlFor="loginAttempts">最大登录尝试次数</Label>
              <Input
                id="loginAttempts"
                type="number"
                defaultValue="5"
                className="border-red-200 focus:border-red-400"
              />
            </div>
            <div>
              <Label htmlFor="sessionTimeout">会话超时时间 (分钟)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                defaultValue="30"
                className="border-red-200 focus:border-red-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据库配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700">数据库配置</CardTitle>
          <CardDescription>管理数据库连接和性能设置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dbHost">数据库主机</Label>
              <Input
                id="dbHost"
                defaultValue="localhost"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="dbPort">端口</Label>
              <Input
                id="dbPort"
                type="number"
                defaultValue="3306"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="dbName">数据库名</Label>
              <Input
                id="dbName"
                defaultValue="anime_image_host"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="dbPoolSize">连接池大小</Label>
              <Input
                id="dbPoolSize"
                type="number"
                defaultValue="10"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="dbTimeout">连接超时 (秒)</Label>
              <Input
                id="dbTimeout"
                type="number"
                defaultValue="30"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableDbLog" />
              <Label htmlFor="enableDbLog">启用SQL日志</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邮件配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-700">邮件配置</CardTitle>
          <CardDescription>配置邮件发送服务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpHost">SMTP 服务器</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.gmail.com"
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            <div>
              <Label htmlFor="smtpPort">SMTP 端口</Label>
              <Input
                id="smtpPort"
                type="number"
                defaultValue="587"
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            <div>
              <Label htmlFor="smtpUser">SMTP 用户名</Label>
              <Input
                id="smtpUser"
                type="email"
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            <div>
              <Label htmlFor="smtpPassword">SMTP 密码</Label>
              <Input
                id="smtpPassword"
                type="password"
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableTLS" defaultChecked />
              <Label htmlFor="enableTLS">启用 TLS</Label>
            </div>
            <div>
              <Button variant="outline" size="sm" className="border-orange-200 text-orange-600">
                <Send className="w-4 h-4 mr-2" />
                测试邮件发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewContent />
      case "users":
        return <UsersContent />
      case "images":
        return <ImagesContent />
      case "storage":
        return <StorageContent />
      case "framework":
        return <FrameworkContent />
      case "system":
        return <SystemContent />
      default:
        return <OverviewContent />
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="flex">
          {/* 左侧边栏 */}
          <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 min-h-screen relative">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">管理后台</h1>
                  <p className="text-sm text-gray-500">萌系图床</p>
                </div>
              </div>

              <nav className="space-y-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回控制台
              </Button>
            </div>
          </div>

          {/* 右侧主内容区 */}
          <div className="flex-1 p-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <div className="w-8 h-8 bg-white rounded-full"></div>
                  </div>
                  <p className="text-gray-600">加载中...</p>
                </div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
