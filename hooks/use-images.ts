"use client"

import { useState, useEffect, useCallback } from "react"
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

interface UseImagesOptions {
  albumId?: string
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export function useImages(options: UseImagesOptions = {}) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchImages = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          ...(options.albumId && { albumId: options.albumId }),
          ...(options.search && { search: options.search }),
          ...(options.sortBy && { sortBy: options.sortBy }),
          ...(options.sortOrder && { sortOrder: options.sortOrder }),
        })

        const response = await fetch(`/api/images?${params}`)

        if (!response.ok) {
          throw new Error("Failed to fetch images")
        }

        const data = await response.json()

        if (page === 1) {
          setImages(data.images)
        } else {
          setImages((prev) => [...prev, ...data.images])
        }

        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        toast.error("获取图片失败")
      } finally {
        setLoading(false)
      }
    },
    [options.albumId, options.search, options.sortBy, options.sortOrder, pagination.limit],
  )

  const deleteImages = useCallback(async (imageIds: string[]) => {
    try {
      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete images")
      }

      const data = await response.json()

      // 从本地状态中移除已删除的图片
      setImages((prev) => prev.filter((img) => !imageIds.includes(img.id)))

      toast.success(`成功删除 ${data.deletedCount} 张图片 ♡`)

      return true
    } catch (err) {
      toast.error("删除失败")
      return false
    }
  }, [])

  const uploadImage = useCallback(
    async (
      file: File,
      options: {
        storage?: string
        albumId?: string
        isPrivate?: boolean
        compress?: boolean
      } = {},
    ) => {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("storage", options.storage || "local")
        if (options.albumId) formData.append("albumId", options.albumId)
        if (options.isPrivate) formData.append("isPrivate", "true")
        if (options.compress) formData.append("compress", "true")

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        const data = await response.json()

        // 添加新图片到本地状态
        const newImage: ImageItem = {
          id: data.image.id,
          filename: data.image.filename,
          originalName: data.image.originalName,
          url: data.image.url,
          thumbnailUrl: data.image.thumbnailUrl,
          size: data.image.size,
          storage: data.image.storage,
          isPrivate: data.image.isPrivate,
          createdAt: data.image.createdAt,
        }

        setImages((prev) => [newImage, ...prev])
        toast.success("上传成功 ♡")

        return newImage
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        toast.error(message)
        throw err
      }
    },
    [],
  )

  const refresh = useCallback(() => {
    fetchImages(1)
  }, [fetchImages])

  const loadMore = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      fetchImages(pagination.page + 1)
    }
  }, [fetchImages, pagination.page, pagination.totalPages])

  useEffect(() => {
    fetchImages(1)
  }, [fetchImages])

  return {
    images,
    loading,
    error,
    pagination,
    deleteImages,
    uploadImage,
    refresh,
    loadMore,
    hasMore: pagination.page < pagination.totalPages,
  }
}
