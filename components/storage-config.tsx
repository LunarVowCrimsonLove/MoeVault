"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Cloud, Plus, Settings, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface FieldOption {
  value: string
  label: string
}

interface ProviderField {
  key: string
  label: string
  type: string
  required: boolean
  defaultValue?: string
  options?: FieldOption[]
}

interface Provider {
  id: string
  name: string
  description: string
  icon: string
  fields: ProviderField[]
  hasOAuth?: boolean
}

interface StorageConfig {
  id: string
  provider: "onedrive" | "aliyun" | "tencent" | "github" | "s3"
  name: string
  isActive: boolean
  config: Record<string, any>
  createdAt?: string
  updatedAt?: string
  usage?: {
    used: number
    total: number
    percentage: number
  }
}

export default function StorageConfig() {
  const [configs, setConfigs] = useState<StorageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>("")

  const providers: Provider[] = [
    {
      id: "onedrive",
      name: "Microsoft OneDrive",
      description: "微软云存储服务，15GB免费空间",
      icon: "☁️",
      fields: [
        { key: "region", label: "区域", type: "select", required: true, options: [
          { value: "global", label: "国际版 (Global)" },
          { value: "china", label: "中国版 (由世纪互联运营)" }
        ]},
        { key: "folder", label: "存储文件夹", type: "text", required: false, defaultValue: "/Images" },
      ],
      hasOAuth: true, // 标记为需要 OAuth 授权
    },
    {
      id: "aliyun",
      name: "阿里云 OSS",
      description: "阿里云对象存储服务，高速稳定",
      icon: "🌐",
      fields: [
        { key: "region", label: "Region", type: "text", required: true },
        { key: "accessKeyId", label: "Access Key ID", type: "text", required: true },
        { key: "accessKeySecret", label: "Access Key Secret", type: "password", required: true },
        { key: "bucket", label: "Bucket Name", type: "text", required: true },
      ],
    },
    {
      id: "tencent",
      name: "腾讯云 COS",
      description: "腾讯云对象存储服务，国内访问快速",
      icon: "🔷",
      fields: [
        { key: "region", label: "Region", type: "text", required: true },
        { key: "secretId", label: "Secret ID", type: "text", required: true },
        { key: "secretKey", label: "Secret Key", type: "password", required: true },
        { key: "bucket", label: "Bucket Name", type: "text", required: true },
      ],
    },
    {
      id: "github",
      name: "GitHub",
      description: "使用 GitHub 仓库作为免费图床存储",
      icon: "🐙",
      fields: [
        { key: "token", label: "Personal Access Token", type: "password", required: true },
        { key: "owner", label: "用户名/组织名", type: "text", required: true },
        { key: "repo", label: "仓库名", type: "text", required: true },
        { key: "branch", label: "分支名", type: "text", required: false, defaultValue: "main" },
        { key: "path", label: "存储路径", type: "text", required: false, defaultValue: "uploads" },
      ],
    },
  ]

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await fetch("/api/storage/configs")
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      }
    } catch (error) {
      toast.error("获取存储配置失败")
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (config: StorageConfig) => {
    try {
      const response = await fetch("/api/storage/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: config.id }),
      })

      if (response.ok) {
        toast.success("连接测试成功 ♡")
      } else {
        toast.error("连接测试失败")
      }
    } catch (error) {
      toast.error("连接测试失败")
    }
  }

  const deleteConfig = async (configId: string) => {
    try {
      const response = await fetch(`/api/storage/configs/${configId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== configId))
        toast.success("存储配置已删除")
      } else {
        toast.error("删除失败")
      }
    } catch (error) {
      toast.error("删除失败")
    }
  }

  const AddConfigDialog = () => {
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    const selectedProviderInfo = providers.find((p) => p.id === selectedProvider)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedProviderInfo) return

      setSubmitting(true)
      try {
        const response = await fetch("/api/storage/configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: selectedProvider,
            config: formData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setConfigs((prev) => [...prev, data.config])
          setShowAddDialog(false)
          setSelectedProvider("")
          setFormData({})
          toast.success("存储配置添加成功 ♡")
        } else {
          const error = await response.json()
          toast.error(error.message || "添加失败")
        }
      } catch (error) {
        toast.error("添加失败")
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-pink-700">添加存储配置</DialogTitle>
            <DialogDescription>选择存储服务商并配置相关参数</DialogDescription>
          </DialogHeader>

          {!selectedProvider ? (
            <div className="space-y-3">
              {providers.map((provider) => (
                <Card
                  key={provider.id}
                  className="cursor-pointer hover:border-pink-300 transition-colors"
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="text-2xl">{provider.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selectedProviderInfo?.icon}</span>
                <h3 className="font-semibold text-gray-700">{selectedProviderInfo?.name}</h3>
              </div>

              {selectedProviderInfo?.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === "select" ? (
                    <Select
                      value={formData[field.key] || field.defaultValue || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="border-pink-200 focus:border-pink-400">
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type}
                      required={field.required}
                      value={formData[field.key] || field.defaultValue || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="border-pink-200 focus:border-pink-400"
                    />
                  )}
                </div>
              ))}

              {/* OAuth 特殊处理 */}
              {selectedProviderInfo?.hasOAuth && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">OAuth 授权</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    {selectedProvider === "onedrive" && "OneDrive 需要通过 OAuth 授权来访问您的云存储"}
                  </p>
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const region = formData.region || "global"
                        const response = await fetch(`/api/auth/onedrive?region=${region}`)
                        const data = await response.json()
                        
                        if (data.authUrl) {
                          const authWindow = window.open(
                            data.authUrl,
                            'oauth-auth',
                            'width=600,height=700,scrollbars=yes,resizable=yes'
                          )
                          
                          toast.success('请在新窗口中完成授权')
                          
                          // 监听授权完成
                          const checkClosed = setInterval(() => {
                            if (authWindow?.closed) {
                              clearInterval(checkClosed)
                              toast.success('授权完成，配置已自动保存')
                              setShowAddDialog(false)
                              setSelectedProvider("")
                              setFormData({})
                              // 重新获取配置列表
                              fetchConfigs()
                            }
                          }, 1000)
                        } else {
                          toast.error('无法启动授权')
                        }
                      } catch (error) {
                        toast.error('授权失败')
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    开始 OAuth 授权
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedProvider("")
                    setFormData({})
                  }}
                  className="flex-1 border-pink-200"
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                >
                  {submitting ? "添加中..." : "添加配置"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-pink-700">存储配置</h2>
          <p className="text-gray-600">管理你的云存储服务配置</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加存储
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
              <Cloud className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">还没有配置存储服务</h3>
            <p className="text-gray-500 text-center mb-4">添加你的第一个云存储配置吧！</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加存储
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="bg-white/80 backdrop-blur-sm border-pink-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                      <Cloud className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        {config.name}
                        {config.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{providers.find((p) => p.id === config.provider)?.name}</p>
                      {config.usage && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
                              style={{ width: `${Math.min(config.usage.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(config.usage.percentage)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={config.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
                    >
                      {config.isActive ? "活跃" : "未激活"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(config)}
                      className="border-pink-200"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      测试
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteConfig(config.id)}
                      className="border-red-200 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddConfigDialog />
    </div>
  )
}
