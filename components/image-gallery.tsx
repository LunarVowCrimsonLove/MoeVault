"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  Copy,
  Download,
  Trash2,
  MoreHorizontal,
  Eye,
  Share2,
  Heart,
  Calendar,
  HardDrive,
  ImageIcon,
} from "lucide-react"
import { toast } from "sonner"

interface ImageItem {
  id: string
  filename: string
  originalName: string
  url: string
  thumbnailUrl?: string
  size: number
  storage?: string
  isPrivate: boolean
  createdAt: string
  viewCount?: number
}

interface ImageGalleryProps {
  images: ImageItem[]
  viewMode: "grid" | "list"
  selectedImages: string[]
  onSelectionChange: (imageIds: string[]) => void
  onDelete: (imageIds: string[]) => void
  onRefresh: () => void
}

export default function ImageGallery({
  images,
  viewMode,
  selectedImages,
  onSelectionChange,
  onDelete,
  onRefresh,
}: ImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  // 删除确认函数
  const confirmDelete = (imageIds: string[]) => {
    setDeleteImageIds(imageIds)
    setDeleteDialogOpen(true)
  }

  // 执行删除
  const handleConfirmDelete = async () => {
    if (deleteImageIds.length === 0) return

    setDeleting(true)
    try {
      await onDelete(deleteImageIds)
      setDeleteDialogOpen(false)
      setDeleteImageIds([])
      if (previewImage && deleteImageIds.includes(previewImage.id)) {
        setPreviewImage(null)
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("链接已复制到剪贴板 ♡")
    } catch (error) {
      toast.error("复制失败")
    }
  }

  const downloadImage = async (image: ImageItem) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = image.originalName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("下载开始 ♡")
    } catch (error) {
      toast.error("下载失败")
    }
  }

  const handleSelectImage = (imageId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedImages, imageId])
    } else {
      onSelectionChange(selectedImages.filter((id) => id !== imageId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(images.map((img) => img.id))
    } else {
      onSelectionChange([])
    }
  }

  const getStorageIcon = (storage: string | undefined) => {
    if (!storage) return "📁"
    switch (storage.toLowerCase()) {
      case "onedrive":
        return "☁️"
      case "aliyun":
        return "🌐"
      case "local":
        return "💾"
      default:
        return "📁"
    }
  }

  if (images.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">还没有图片哦 (｡♥‿♥｡)</h3>
          <p className="text-gray-500 text-center">上传你的第一张可爱图片吧！</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {selectedImages.length > 0 && (
        <Card className="bg-pink-50/80 backdrop-blur-sm border-pink-200">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-pink-700">已选择 {selectedImages.length} 张图片</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="border-pink-200 text-pink-600"
              >
                取消选择
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectedImages.forEach((id) => {
                    const image = images.find((img) => img.id === id)
                    if (image) downloadImage(image)
                  })
                }}
                className="border-pink-200 text-pink-600"
              >
                <Download className="w-4 h-4 mr-2" />
                批量下载
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDelete(selectedImages)}
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={selectedImages.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                批量删除 ({selectedImages.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="group relative overflow-hidden border-pink-100 hover:border-pink-300 transition-all hover:shadow-lg"
            >
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={image.thumbnailUrl || image.url || "/placeholder.svg"}
                    alt={image.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => setPreviewImage(image)}
                  />

                  {/* 选择框 */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedImages.includes(image.id)}
                      onCheckedChange={(checked) => handleSelectImage(image.id, checked as boolean)}
                      className="bg-white/80 border-pink-300 data-[state=checked]:bg-pink-500"
                    />
                  </div>

                  {/* 私有标识 */}
                  {image.isPrivate && (
                    <Badge className="absolute top-2 right-2 bg-pink-500 text-white text-xs">私有</Badge>
                  )}

                  {/* 悬停操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-8 h-8"
                      onClick={() => copyToClipboard(image.url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="w-8 h-8" onClick={() => downloadImage(image)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="w-8 h-8" onClick={() => setPreviewImage(image)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="w-8 h-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => copyToClipboard(image.url)}>
                          <Copy className="w-4 h-4 mr-2" />
                          复制链接
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          创建分享
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Heart className="w-4 h-4 mr-2" />
                          添加到收藏
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => confirmDelete([image.id])}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* 图片信息 */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 truncate mb-1">{image.originalName}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(image.size)}</span>
                    <Badge variant="outline" className="text-xs">
                      {getStorageIcon(image.storage)} {image.storage || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                    <span>{formatDate(image.createdAt)}</span>
                    {image.viewCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {image.viewCount}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white/80 backdrop-blur-sm border-pink-100">
          <CardContent className="p-0">
            <div className="border-b border-pink-100 p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedImages.length === images.length}
                  onCheckedChange={handleSelectAll}
                  className="border-pink-300 data-[state=checked]:bg-pink-500"
                />
                <span className="text-sm font-medium text-gray-700">全选</span>
              </div>
            </div>
            <div className="divide-y divide-pink-100">
              {images.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-4 hover:bg-pink-50/50 transition-colors">
                  <Checkbox
                    checked={selectedImages.includes(image.id)}
                    onCheckedChange={(checked) => handleSelectImage(image.id, checked as boolean)}
                    className="border-pink-300 data-[state=checked]:bg-pink-500"
                  />
                  <img
                    src={image.thumbnailUrl || image.url || "/placeholder.svg"}
                    alt={image.originalName}
                    className="w-12 h-12 object-cover rounded border border-pink-100 cursor-pointer"
                    onClick={() => setPreviewImage(image)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{image.originalName}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(image.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(image.createdAt)}
                      </span>
                      {image.viewCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {image.viewCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getStorageIcon(image.storage)} {image.storage || 'unknown'}
                    </Badge>
                    {image.isPrivate && <Badge className="bg-pink-100 text-pink-700 text-xs">私有</Badge>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => copyToClipboard(image.url)}>
                          <Copy className="w-4 h-4 mr-2" />
                          复制链接
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadImage(image)}>
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          创建分享
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete([image.id])}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {previewImage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-pink-700">{previewImage.originalName}</DialogTitle>
                <DialogDescription>
                  {formatFileSize(previewImage.size)} • {previewImage.storage || 'unknown'} • {formatDate(previewImage.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center max-h-[60vh] overflow-hidden">
                <img
                  src={previewImage.url || "/placeholder.svg"}
                  alt={previewImage.originalName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  {previewImage.isPrivate && <Badge className="bg-pink-100 text-pink-700">私有</Badge>}
                  <Badge variant="outline">
                    {getStorageIcon(previewImage.storage)} {previewImage.storage || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(previewImage.url)}
                    className="border-pink-200 text-pink-600"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadImage(previewImage)}
                    className="border-pink-200 text-pink-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => confirmDelete([previewImage.id])}
                    className="border-red-200 text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteImageIds.length === 1 
                ? "确定要删除这张图片吗？此操作无法撤销。"
                : `确定要删除这 ${deleteImageIds.length} 张图片吗？此操作无法撤销。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
