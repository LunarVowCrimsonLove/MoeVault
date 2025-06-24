'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageIcon, X, Upload, Settings, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface UploadFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  url?: string
  error?: string
}

interface UploadSettings {
  storage: string
  isPrivate: boolean
  compress: boolean
}

interface UploadZoneProps {
  onUploadComplete?: () => void
  storageStrategies?: Array<{
    id: string
    name: string
    type: string
    status: string
  }>
}

export default function UploadZone({ onUploadComplete, storageStrategies = [] }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadSettings, setUploadSettings] = useState<UploadSettings>({
    storage: '1', // 默认本地存储
    isPrivate: false,
    compress: true,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证文件类型和大小
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '不支持的文件格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片'
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    
    return null
  }

  // 处理文件选择
  const handleFiles = useCallback((selectedFiles: FileList) => {
    const newFiles: UploadFile[] = []
    
    Array.from(selectedFiles).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        return
      }

      const id = Math.random().toString(36).substring(2)
      const preview = URL.createObjectURL(file)
      
      newFiles.push({
        id,
        file,
        preview,
        progress: 0,
        status: 'uploading',
      })
    })

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
      uploadFiles(newFiles)
    }
  }, [uploadSettings])

  // 批量上传文件
  const uploadFiles = async (newFiles: UploadFile[]) => {
    // 优化并发上传 - 根据文件大小动态调整
    const MAX_CONCURRENT = newFiles.some(f => f.file.size > 50 * 1024 * 1024) ? 2 : 5
    const uploadQueue = [...newFiles]
    const uploading = new Set<string>()

    const processNext = () => {
      if (uploadQueue.length === 0 || uploading.size >= MAX_CONCURRENT) return

      const uploadFile = uploadQueue.shift()!
      uploading.add(uploadFile.id)
      
      uploadFileToServer(uploadFile).finally(() => {
        uploading.delete(uploadFile.id)
        processNext()
      })
    }

    // 启动并发上传
    for (let i = 0; i < Math.min(MAX_CONCURRENT, newFiles.length); i++) {
      processNext()
    }
  }

  // 上传单个文件到服务器
  const uploadFileToServer = async (uploadFile: UploadFile, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3
    
    try {
      let fileToUpload = uploadFile.file

      // 如果启用压缩且是图片文件，进行压缩
      if (uploadSettings.compress && uploadFile.file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(uploadFile.file)
        } catch (error) {
          console.warn('Image compression failed, using original file:', error)
        }
      }

      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('strategyId', uploadSettings.storage)
      formData.append('isPrivate', uploadSettings.isPrivate.toString())
      formData.append('compress', uploadSettings.compress.toString())

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100
            setFiles((prev) => 
              prev.map((file) => 
                file.id === uploadFile.id ? { ...file, progress } : file
              )
            )
          }
        })

        // 监听上传完成
        xhr.addEventListener('load', () => {
          try {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText)
              if (response.success && response.image) {
                setFiles((prev) =>
                  prev.map((file) =>
                    file.id === uploadFile.id
                      ? {
                          ...file,
                          progress: 100,
                          status: 'completed' as const,
                          url: response.image.url,
                        }
                      : file,
                  ),
                )
                toast.success(`${uploadFile.file.name} 上传成功 ♡`)
                onUploadComplete?.()
                resolve()
              } else {
                throw new Error(response.error || 'Upload failed')
              }
            } else {
              let errorMessage = 'Upload failed'
              try {
                const errorResponse = JSON.parse(xhr.responseText)
                errorMessage = errorResponse.error || errorMessage
              } catch {
                errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`
              }
              throw new Error(errorMessage)
            }
          } catch (error) {
            console.error('Upload response error:', error)
            
            // 重试逻辑
            if (retryCount < MAX_RETRIES && xhr.status >= 500) {
              console.log(`Retrying upload for ${uploadFile.file.name}, attempt ${retryCount + 1}`)
              setTimeout(() => {
                uploadFileToServer(uploadFile, retryCount + 1).then(resolve).catch(reject)
              }, Math.pow(2, retryCount) * 1000)
              return
            }
            
            setFiles((prev) =>
              prev.map((file) =>
                file.id === uploadFile.id
                  ? {
                      ...file,
                      status: 'error' as const,
                      error: error instanceof Error ? error.message : '上传失败',
                    }
                  : file,
              ),
            )
            toast.error(`${uploadFile.file.name} 上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
            reject(error)
          }
        })

        // 监听上传错误
        xhr.addEventListener('error', () => {
          console.error('XHR error:', xhr.statusText)
          
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying upload for ${uploadFile.file.name}, attempt ${retryCount + 1}`)
            setTimeout(() => {
              uploadFileToServer(uploadFile, retryCount + 1).then(resolve).catch(reject)
            }, Math.pow(2, retryCount) * 1000)
            return
          }
          
          setFiles((prev) =>
            prev.map((file) =>
              file.id === uploadFile.id
                ? {
                    ...file,
                    status: 'error' as const,
                    error: '网络错误，上传失败',
                  }
                : file,
            ),
          )
          toast.error(`${uploadFile.file.name} 网络错误，上传失败`)
          reject(new Error('Network error'))
        })

        // 监听上传超时
        xhr.addEventListener('timeout', () => {
          console.error('XHR timeout')
          
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying upload for ${uploadFile.file.name}, attempt ${retryCount + 1}`)
            setTimeout(() => {
              uploadFileToServer(uploadFile, retryCount + 1).then(resolve).catch(reject)
            }, Math.pow(2, retryCount) * 1000)
            return
          }
          
          setFiles((prev) =>
            prev.map((file) =>
              file.id === uploadFile.id
                ? {
                    ...file,
                    status: 'error' as const,
                    error: '上传超时',
                  }
                : file,
            ),
          )
          toast.error(`${uploadFile.file.name} 上传超时`)
          reject(new Error('Upload timeout'))
        })

        // 设置超时时间 - 根据文件大小动态调整
        const timeoutMinutes = Math.max(5, Math.ceil(uploadFile.file.size / (10 * 1024 * 1024)))
        xhr.timeout = timeoutMinutes * 60 * 1000

        xhr.open('POST', '/api/upload')
        xhr.setRequestHeader('Accept', 'application/json')
        xhr.send(formData)
      })
    } catch (error) {
      console.error('Upload error:', error)
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying upload for ${uploadFile.file.name}, attempt ${retryCount + 1}`)
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            uploadFileToServer(uploadFile, retryCount + 1).then(resolve).catch(reject)
          }, Math.pow(2, retryCount) * 1000)
        })
      }
      
      setFiles((prev) =>
        prev.map((file) =>
          file.id === uploadFile.id
            ? {
                ...file,
                status: 'error' as const,
                error: '上传失败',
              }
            : file,
        ),
      )
      toast.error(`${uploadFile.file.name} 上传失败`)
      throw error
    }
  }

  // 优化的图片压缩函数
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // 如果文件小于1MB，不进行压缩
      if (file.size < 1024 * 1024) {
        resolve(file)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // 动态设置最大尺寸
          const maxWidth = file.size > 5 * 1024 * 1024 ? 1920 : 2560
          const maxHeight = file.size > 5 * 1024 * 1024 ? 1080 : 1440
          let { width, height } = img

          // 计算新尺寸
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          // 使用更好的图像渲染质量
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)

            // 动态压缩质量
            const quality = file.size > 10 * 1024 * 1024 ? 0.7 : 0.85

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  
                  // 如果压缩后反而更大，使用原文件
                  if (compressedFile.size < file.size) {
                    resolve(compressedFile)
                  } else {
                    resolve(file)
                  }
                } else {
                  resolve(file)
                }
              },
              file.type,
              quality,
            )
          } else {
            resolve(file)
          }
        } catch (error) {
          console.error('Compression error:', error)
          resolve(file)
        }
      }

      img.onerror = () => {
        console.error('Image load error')
        resolve(file)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [handleFiles])

  // 文件选择处理
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      handleFiles(selectedFiles)
    }
  }, [handleFiles])

  // 删除文件
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  // 重新上传失败的文件
  const retryUpload = (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === uploadFile.id
          ? { ...file, status: 'uploading' as const, progress: 0, error: undefined }
          : file,
      ),
    )
    uploadFileToServer(uploadFile)
  }

  return (
    <div className="space-y-6">
      {/* 上传设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-pink-700 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            上传设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage">存储方式</Label>
              <Select value={uploadSettings.storage} onValueChange={(value) => 
                setUploadSettings(prev => ({ ...prev, storage: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="选择存储方式" />
                </SelectTrigger>
                <SelectContent>
                  {storageStrategies.filter(s => s.status === 'active').map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                  {storageStrategies.length === 0 && (
                    <SelectItem value="1">本地存储</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="private"
                checked={uploadSettings.isPrivate}
                onCheckedChange={(checked) => 
                  setUploadSettings(prev => ({ ...prev, isPrivate: checked }))
                }
              />
              <Label htmlFor="private">私有图片</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="compress"
                checked={uploadSettings.compress}
                onCheckedChange={(checked) => 
                  setUploadSettings(prev => ({ ...prev, compress: checked }))
                }
              />
              <Label htmlFor="compress">智能压缩</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-pink-700 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            萌系图片上传 ♡
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-pink-400 bg-pink-50'
                : 'border-gray-300 hover:border-pink-300 hover:bg-pink-50/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="w-12 h-12 text-pink-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">拖拽图片到这里上传 ♡</h3>
              <p className="text-gray-500 mb-4">支持 JPG、PNG、GIF、WebP 格式，单个文件最大 10MB</p>
              
              <Button className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white">
                <Upload className="w-4 h-4 mr-2" />
                选择图片
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上传进度列表 */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-700">上传进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <img 
                    src={file.preview} 
                    alt={file.file.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={file.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{file.progress.toFixed(0)}%</p>
                      </div>
                    )}
                    
                    {file.status === 'completed' && (
                      <p className="text-sm text-green-600 mt-1">✓ 上传成功</p>
                    )}
                    
                    {file.status === 'error' && (
                      <div className="mt-1">
                        <p className="text-sm text-red-600">✗ {file.error}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload(file)}
                          className="mt-1 text-pink-600 hover:text-pink-700"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          重试
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
