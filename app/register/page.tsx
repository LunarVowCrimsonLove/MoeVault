"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, Heart, Mail, Lock, User, Github } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证表单
    if (!formData.username || !formData.email || !formData.password) {
      toast.error("请填写所有必填字段")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }

    if (formData.password.length < 6) {
      toast.error("密码长度至少6位")
      return
    }

    if (!formData.agreeTerms) {
      toast.error("请同意服务条款和隐私政策")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("注册成功！请登录你的账户 ♡")
        router.push("/login")
      } else {
        toast.error(data.error || "注册失败")
      }
    } catch (error) {
      toast.error("注册过程中发生错误")
    } finally {
      setLoading(false)
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
            加入萌图床 ♡
          </CardTitle>
          <CardDescription className="text-gray-600">创建你的专属可爱图床账户，开始管理你的美图吧！</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                用户名
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  placeholder="选择一个可爱的用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  required
                />
              </div>
            </div>
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  placeholder="设置一个安全的密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">
                确认密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked as boolean })}
                className="border-pink-300 data-[state=checked]:bg-pink-500"
              />
              <Label htmlFor="terms" className="text-sm text-gray-600">
                我同意{" "}
                <Link href="/terms" className="text-pink-600 hover:text-pink-700">
                  服务条款
                </Link>{" "}
                和{" "}
                <Link href="/privacy" className="text-pink-600 hover:text-pink-700">
                  隐私政策
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white shadow-lg"
              disabled={!formData.agreeTerms || loading}
            >
              <Heart className="w-4 h-4 mr-2" />
              {loading ? "创建中..." : "创建账户"}
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

          <Button variant="outline" className="w-full border-pink-200 text-gray-700 hover:bg-pink-50">
            <Github className="w-4 h-4 mr-2" />
            使用 GitHub 注册
          </Button>

          <div className="text-center text-sm text-gray-600">
            已经有账户了？{" "}
            <Link href="/login" className="text-pink-600 hover:text-pink-700 font-medium">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
