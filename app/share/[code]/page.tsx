"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Lock, Calendar, User, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface ShareData {
  id: string
  imageName: string
  imageUrl: string
  thumbnailUrl: string
  fileSize: number
  viewCount: number
  maxViews?: number
  expiresAt?: string
  hasPassword: boolean
  uploaderName: string
  uploadedAt: string
}

export default function SharePage({ params }: { params: { code: string } }) {
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [needPassword, setNeedPassword] = useState(false)

  useEffect(() => {
    fetchShareData()
  }, [params.code])

  const fetchShareData = async () => {
    try {
      const response = await fetch(`/api/share/${params.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (response.status === 401) {
        setNeedPassword(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "分享链接无效或已过期")
      }

      const data = await response.json()
      setShareData(data.share)
      setNeedPassword(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error("请输入访问密码")
      return
    }
    setLoading(true)
    fetchShareData()
  }

  const downloadImage = async () => {
    if (!shareData) return

    try {
      const response = await fetch(shareData.imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = shareData.imageName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("下载开始 ♡")
    } catch (error) {
      toast.error("下载失败")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-pink-100">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600">加载中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-pink-100">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">访问失败</h3>
            <p className="text-gray-500 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (needPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-pink-100">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-pink-700">需要访问密码</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="请输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-pink-200 focus:border-pink-400"
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
              >
                访问图片
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 头部信息 */}
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border-pink-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-pink-700 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    {shareData?.imageName}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {shareData?.uploaderName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {shareData?.uploadedAt && formatDate(shareData.uploadedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {shareData?.viewCount} 次查看
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{shareData?.fileSize && formatFileSize(shareData.fileSize)}</Badge>
                  {shareData?.maxViews && (
                    <Badge className="bg-yellow-100 text-yellow-700">限制 {shareData.maxViews} 次查看</Badge>
                  )}
                  {shareData?.expiresAt && (
                    <Badge className="bg-red-100 text-red-700">{formatDate(shareData.expiresAt)} 过期</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 图片展示 */}
          <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="max-w-full max-h-[70vh] overflow-hidden rounded-lg border border-pink-100 mb-6">
                  <img
                    src={shareData?.imageUrl || "/placeholder.svg"}
                    alt={shareData?.imageName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <Button
                  onClick={downloadImage}
                  className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载图片
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
