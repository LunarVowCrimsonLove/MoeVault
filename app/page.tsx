"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Sparkles, Upload, Users, Cloud, Shield, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([])

  const createHeart = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newHeart = { id: Date.now(), x, y }
    setHearts((prev) => [...prev, newHeart])

    setTimeout(() => {
      setHearts((prev) => prev.filter((heart) => heart.id !== newHeart.id))
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-blue-200 rounded-full opacity-35 animate-bounce delay-1000"></div>
        <div className="absolute bottom-40 right-1/3 w-24 h-24 bg-pink-100 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>

      {/* 飘落的爱心 */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute pointer-events-none animate-ping"
          style={{ left: heart.x, top: heart.y }}
        >
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
        </div>
      ))}

      {/* 导航栏 */}
      <nav className="relative z-10 flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b border-pink-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            MoeVault ♡
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-pink-600 hover:text-pink-700 hover:bg-pink-50">
              登录
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg">
              注册
            </Button>
          </Link>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {/* 英雄区域 */}
        <div className="text-center mb-16" onClick={createHeart}>
          <div className="mb-6">
            <Badge className="bg-pink-100 text-pink-700 border-pink-200 mb-4">✨ 二次元专属图床</Badge>
          </div>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            MoeVault - 可爱到爆炸的图床服务 (｡♥‿♥｡)
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            支持多种云存储，萌系界面设计，让你的图片管理变得超级可爱！
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-xl transform hover:scale-105 transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                开始上传 ♡
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50">
              <Heart className="w-5 h-5 mr-2" />
              了解更多
            </Button>
          </div>
        </div>

        {/* 特性卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-pink-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-pink-700">多云存储支持</CardTitle>
              <CardDescription>支持微软OneDrive、阿里云OSS、腾讯云COS等多种存储方案</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-purple-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-purple-700">多用户管理</CardTitle>
              <CardDescription>完善的用户系统，支持个人空间管理和权限控制</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-blue-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-blue-700">安全可靠</CardTitle>
              <CardDescription>图片加密存储，支持私有链接和访问权限控制</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-green-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-green-700">极速上传</CardTitle>
              <CardDescription>支持拖拽上传、粘贴上传，智能压缩和格式转换</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-orange-700">萌系界面</CardTitle>
              <CardDescription>二次元风格设计，让图片管理变得超级可爱</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 hover:shadow-lg transition-all hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-pink-700">智能管理</CardTitle>
              <CardDescription>相册分类、标签管理、批量操作等贴心功能</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* 统计数据 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-pink-100 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-pink-600 mb-2">10K+</div>
              <div className="text-gray-600">活跃用户</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">1M+</div>
              <div className="text-gray-600">图片存储</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">服务可用性</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">5+</div>
              <div className="text-gray-600">存储方案</div>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-pink-100 py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-700">MoeVault ♡</span>
          </div>
          <p className="text-gray-500">© 2024 MoeVault. 用爱发电，让世界更可爱 (◕‿◕)♡</p>
        </div>
      </footer>
    </div>
  )
}
