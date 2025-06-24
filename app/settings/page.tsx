"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Cloud, Shield, Palette, Bell, Key, Sparkles, Heart, Save, Plus, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    upload: true,
    storage: true,
  })

  const [storageConfigs, setStorageConfigs] = useState([
    { id: "1", name: "OneDrive", type: "onedrive", status: "connected", usage: "2.1 GB" },
    { id: "2", name: "阿里云OSS", type: "aliyun", status: "connected", usage: "1.2 GB" },
    { id: "3", name: "本地存储", type: "local", status: "active", usage: "0.8 GB" },
    { id: "4", name: "GitHub", type: "github", status: "disconnected", usage: "0 GB" },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-pink-100 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              设置中心
            </h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-pink-100">
            <TabsTrigger value="profile" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="storage" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Cloud className="w-4 h-4 mr-2" />
              存储配置
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              安全设置
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Palette className="w-4 h-4 mr-2" />
              外观主题
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              通知设置
            </TabsTrigger>
          </TabsList>

          {/* 个人资料 */}
          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <CardTitle className="text-pink-700 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    个人信息
                  </CardTitle>
                  <CardDescription>管理你的个人资料和账户信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" className="border-pink-200 text-pink-600">
                        更换头像
                      </Button>
                      <p className="text-sm text-gray-500">推荐尺寸: 200x200px</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input id="username" defaultValue="萌萌哒用户" className="border-pink-200" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱地址</Label>
                      <Input id="email" type="email" defaultValue="user@example.com" className="border-pink-200" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">个人简介</Label>
                    <Input id="bio" placeholder="介绍一下你自己吧 ♡" className="border-pink-200" />
                  </div>
                  <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    保存更改
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <CardTitle className="text-pink-700">账户统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-pink-600">1,234</div>
                      <div className="text-sm text-gray-500">上传图片</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">12</div>
                      <div className="text-sm text-gray-500">创建相册</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">89天</div>
                      <div className="text-sm text-gray-500">使用天数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 存储配置 */}
          <TabsContent value="storage">
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-pink-700 flex items-center gap-2">
                        <Cloud className="w-5 h-5" />
                        存储方案
                      </CardTitle>
                      <CardDescription>配置和管理你的存储后端</CardDescription>
                    </div>
                    <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      添加存储
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {storageConfigs.map((storage) => (
                      <div
                        key={storage.id}
                        className="flex items-center justify-between p-4 border border-pink-100 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <Cloud className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-700">{storage.name}</h3>
                            <p className="text-sm text-gray-500">使用量: {storage.usage}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              storage.status === "connected"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }
                          >
                            {storage.status === "connected" ? "已连接" : "活跃"}
                          </Badge>
                          <Button variant="outline" size="sm" className="border-pink-200">
                            配置
                          </Button>
                          <Button variant="outline" size="sm" className="border-red-200 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <CardTitle className="text-pink-700">存储使用情况</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>总使用量</span>
                        <span>4.1 GB / 10 GB</span>
                      </div>
                      <Progress value={41} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-pink-600">2.1 GB</div>
                        <div className="text-sm text-gray-500">OneDrive</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-purple-600">1.2 GB</div>
                        <div className="text-sm text-gray-500">阿里云OSS</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-blue-600">0.8 GB</div>
                        <div className="text-sm text-gray-500">本地存储</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 安全设置 */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <CardTitle className="text-pink-700 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    密码安全
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">当前密码</Label>
                    <Input id="current-password" type="password" className="border-pink-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input id="new-password" type="password" className="border-pink-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input id="confirm-password" type="password" className="border-pink-200" />
                  </div>
                  <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white">
                    更新密码
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
                <CardHeader>
                  <CardTitle className="text-pink-700 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API密钥
                  </CardTitle>
                  <CardDescription>用于第三方应用访问你的图床</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-pink-100 rounded-lg">
                    <div>
                      <div className="font-mono text-sm">sk-****************************</div>
                      <div className="text-xs text-gray-500 mt-1">创建于 2024-01-01</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-pink-200">
                        复制
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-200 text-red-600">
                        删除
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" className="border-pink-200 text-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    生成新密钥
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 外观主题 */}
          <TabsContent value="appearance">
            <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
              <CardHeader>
                <CardTitle className="text-pink-700 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  主题设置
                </CardTitle>
                <CardDescription>自定义你的萌图床外观</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>主题模式</Label>
                  <Select defaultValue="cute">
                    <SelectTrigger className="border-pink-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cute">可爱模式 ♡</SelectItem>
                      <SelectItem value="elegant">优雅模式</SelectItem>
                      <SelectItem value="minimal">简约模式</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>主色调</Label>
                  <div className="flex gap-2">
                    {["pink", "purple", "blue", "green"].map((color) => (
                      <div
                        key={color}
                        className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                          color === "pink" ? "border-gray-400" : "border-transparent"
                        }`}
                        style={{
                          backgroundColor: {
                            pink: "#ec4899",
                            purple: "#a855f7",
                            blue: "#3b82f6",
                            green: "#10b981",
                          }[color],
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>动画效果</Label>
                    <p className="text-sm text-gray-500">启用可爱的动画效果</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>粒子背景</Label>
                    <p className="text-sm text-gray-500">显示飘落的爱心和星星</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notifications">
            <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
              <CardHeader>
                <CardTitle className="text-pink-700 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  通知偏好
                </CardTitle>
                <CardDescription>管理你希望接收的通知类型</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>邮件通知</Label>
                    <p className="text-sm text-gray-500">接收重要更新的邮件通知</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>推送通知</Label>
                    <p className="text-sm text-gray-500">浏览器推送通知</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>上传完成通知</Label>
                    <p className="text-sm text-gray-500">图片上传完成时通知</p>
                  </div>
                  <Switch
                    checked={notifications.upload}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, upload: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>存储空间警告</Label>
                    <p className="text-sm text-gray-500">存储空间不足时提醒</p>
                  </div>
                  <Switch
                    checked={notifications.storage}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, storage: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
