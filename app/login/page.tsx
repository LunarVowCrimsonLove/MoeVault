"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, Heart, Mail, Lock, Github } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("请填写邮箱和密码")
      return
    }

    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("登录失败，请检查邮箱和密码")
      } else if (result?.ok) {
        toast.success("登录成功 ♡")
        // 使用 window.location 强制跳转
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("登录过程中发生错误")
    } finally {
      setLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    try {
      await signIn("github", { callbackUrl: "/dashboard" })
    } catch (error) {
      toast.error("GitHub登录失败")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-blue-200 rounded-full opacity-35 animate-bounce delay-1000"></div>
      </div>

      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-pink-100 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            欢迎回来 ♡
          </CardTitle>
          <CardDescription className="text-gray-600">登录你的萌图床账户，继续管理你的可爱图片吧！</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                邮箱地址
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="输入你的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="输入你的密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-pink-300 data-[state=checked]:bg-pink-500"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  记住我
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-pink-600 hover:text-pink-700">
                忘记密码？
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg"
            >
              <Heart className="w-4 h-4 mr-2" />
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-pink-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或者</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-pink-200 text-gray-700 hover:bg-pink-50"
            onClick={handleGithubLogin}
          >
            <Github className="w-4 h-4 mr-2" />
            使用 GitHub 登录
          </Button>

          <div className="text-center text-sm text-gray-600">
            还没有账户？{" "}
            <Link href="/register" className="text-pink-600 hover:text-pink-700 font-medium">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
