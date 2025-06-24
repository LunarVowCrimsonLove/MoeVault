"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Home, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-blue-200 rounded-full opacity-35 animate-bounce delay-1000"></div>
        <div className="absolute bottom-40 right-1/3 w-14 h-14 bg-pink-300 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>

      <Card className="w-full max-w-lg bg-white/90 backdrop-blur-sm border-pink-100 shadow-2xl">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-6xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              页面迷路了 (´｡• ᵕ •｡`) ♡
            </CardTitle>
            <p className="text-gray-600 leading-relaxed">
              看起来你访问的页面不存在呢~<br />
              不如回到首页继续探索你的萌图世界吧！
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              回到仪表板
            </Button>
            
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full border-pink-200 text-gray-700 hover:bg-pink-50"
            >
              <Search className="w-4 h-4 mr-2" />
              返回上一页
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t border-pink-100">
            <Heart className="w-4 h-4 inline mr-1 text-pink-400" />
            萌系图床 - 让每张图片都充满爱意
          </div>
        </CardContent>
      </Card>
    </div>
  )
}