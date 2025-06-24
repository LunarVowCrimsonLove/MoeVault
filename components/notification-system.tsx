"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Bell, X, Check, Info, AlertTriangle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    // 模拟接收通知
    const interval = setInterval(() => {
      // 这里可以连接WebSocket或Server-Sent Events
      checkForNewNotifications()
    }, 30000) // 每30秒检查一次

    return () => clearInterval(interval)
  }, [])

  const checkForNewNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        const newNotifications = data.notifications.filter(
          (notif: any) => !notifications.find((n) => n.id === notif.id),
        )

        if (newNotifications.length > 0) {
          setNotifications((prev) => [...newNotifications, ...prev])

          // 显示toast通知
          newNotifications.forEach((notif: Notification) => {
            showToastNotification(notif)
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const showToastNotification = (notification: Notification) => {
    const toastConfig = {
      success: { icon: "✅", duration: 3000 },
      error: { icon: "❌", duration: 5000 },
      warning: { icon: "⚠️", duration: 4000 },
      info: { icon: "ℹ️", duration: 3000 },
    }

    const config = toastConfig[notification.type]

    toast(notification.title, {
      description: notification.message,
      duration: config.duration,
      action: notification.action
        ? {
            label: notification.action.label,
            onClick: notification.action.onClick,
          }
        : undefined,
    })
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="w-4 h-4 text-green-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case "info":
        return <Info className="w-4 h-4 text-blue-600" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  return (
    <div className="relative">
      {/* 通知按钮 */}
      <Button variant="ghost" size="icon" onClick={() => setShowPanel(!showPanel)} className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* 通知面板 */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white border border-pink-100 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-pink-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">通知</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-pink-600">
                  全部已读
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowPanel(false)} className="w-6 h-6">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无通知</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? "bg-pink-50" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 truncate">{notification.title}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                          className="w-4 h-4 opacity-50 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{formatTime(notification.timestamp)}</span>
                        {notification.action && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              notification.action!.onClick()
                            }}
                            className="text-xs h-6 px-2"
                          >
                            {notification.action.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
