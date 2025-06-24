'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageIcon, X, Upload, Settings, RefreshCw, Copy, Link, Code, Eye, Folder, Download } from 'lucide-react'
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
  albumId: string
  isPrivate: boolean
  compress: boolean
}

interface UploadZoneProps {
  onUploadComplete?: () => void
}

export default function UploadZoneEnhanced({ onUploadComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [storageStrategies, setStorageStrategies] = useState<Array<{
    id: string
    name: string
    type: string
    status: string
    is_user_default?: boolean
  }>>([])
  const [albums, setAlbums] = useState<Array<{
    id: string
    name: string
    description?: string
  }>>([])
  const [uploadSettings, setUploadSettings] = useState<UploadSettings>({
    storage: '1', // 默认本地存储
    albumId: '', // 默认无相册
    isPrivate: false,
    compress: true,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取用户可用的存储策略
  const fetchStorageStrategies = useCallback(async () => {
    try {
      const response = await fetch('/api/storage/strategies')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.strategies) {
          setStorageStrategies(data.strategies)
          
          // 设置默认存储策略
          const defaultStrategy = data.strategies.find((s: any) => s.is_user_default) || data.strategies[0]
          if (defaultStrategy) {
            setUploadSettings(prev => ({ ...prev, storage: defaultStrategy.id.toString() }))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch storage strategies:', error)
      toast.error('获取存储策略失败')
    }
  }, [])

  // 获取用户相册列表
  const fetchAlbums = useCallback(async () => {
    try {
      const response = await fetch('/api/albums')
      if (response.ok) {
        const data = await response.json()
        if (data.albums) {
          setAlbums(data.albums)
        }
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      toast.error('获取相册列表失败')
    }
  }, [])

  // 组件加载时获取数据
  useEffect(() => {
    fetchStorageStrategies()
    fetchAlbums()
  }, [fetchStorageStrategies, fetchAlbums])

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

    for (let i = 0; i < Math.min(MAX_CONCURRENT, newFiles.length); i++) {
      processNext()
    }
  }

  // 上传单个文件到服务器
  const uploadFileToServer = async (uploadFile: UploadFile, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3
    
    try {
      let fileToUpload = uploadFile.file

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
      if (uploadSettings.albumId) {
        formData.append('albumId', uploadSettings.albumId)
      }
      formData.append('isPrivate', uploadSettings.isPrivate.toString())
      formData.append('compress', uploadSettings.compress.toString())

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

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

  // 图片压缩函数
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 1024 * 1024) {
        resolve(file)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          const maxWidth = file.size > 5 * 1024 * 1024 ? 1920 : 2560
          const maxHeight = file.size > 5 * 1024 * 1024 ? 1080 : 1440
          let { width, height } = img

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

          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)

            const quality = file.size > 10 * 1024 * 1024 ? 0.7 : 0.85

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      handleFiles(selectedFiles)
    }
  }, [handleFiles])

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type}已复制到剪贴板 ♡`)
    } catch (error) {
      console.error('复制失败:', error)
      toast.error('复制失败，请手动复制')
    }
  }

  const generateLinks = (file: UploadFile) => {
    if (!file.url) return null
    
    const baseUrl = window.location.origin
    const fullUrl = file.url.startsWith('http') ? file.url : `${baseUrl}${file.url}`
    
    return {
      direct: fullUrl,
      html: `<img src="${fullUrl}" alt="${file.file.name}" />`,
      markdown: `![${file.file.name}](${fullUrl})`,
      bbcode: `[img]${fullUrl}[/img]`,
      forum: `[IMG]${fullUrl}[/IMG]`
    }
  }

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

  // 导出所有上传成功的图片链接
  const exportLinks = () => {
    const successfulFiles = files.filter(f => f.status === 'completed' && f.url)
    if (successfulFiles.length === 0) {
      toast.error('没有可导出的图片链接')
      return
    }

    const links = successfulFiles.map(file => {
      const linkData = generateLinks(file)
      return {
        filename: file.file.name,
        direct: linkData?.direct || '',
        markdown: linkData?.markdown || '',
        html: linkData?.html || '',
        bbcode: linkData?.bbcode || ''
      }
    })

    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: links.length,
      links: links
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `image-links-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success(`已导出 ${links.length} 个图片链接 ♡`)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage">存储方式</Label>
              <Select value={uploadSettings.storage} onValueChange={(value) => 
                setUploadSettings(prev => ({ ...prev, storage: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="选择存储方式" />
                </SelectTrigger>
                <SelectContent>
                  {storageStrategies.length > 0 ? (
                    storageStrategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id.toString()}>
                        {strategy.name} {strategy.is_user_default ? '(默认)' : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="1">本地存储</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="album">选择相册</Label>
              <Select value={uploadSettings.albumId} onValueChange={(value) => 
                setUploadSettings(prev => ({ ...prev, albumId: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="选择相册（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无相册</SelectItem>
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        {album.name}
                      </div>
                    </SelectItem>
                  ))}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-pink-700">上传进度</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLinks}
              disabled={!files.some(f => f.status === 'completed')}
              className="border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              <Download className="w-4 h-4 mr-2" />
              导出链接
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <img 
                    src={file.preview} 
                    alt={file.file.name}
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
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

                    {file.status === 'completed' && file.url && (
                      <div className="mt-2 space-y-3">
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          ✓ 上传成功
                        </p>
                        
                        {/* 链接展示区域 */}
                        <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border border-pink-200">
                          <h4 className="text-sm font-medium text-pink-700 mb-3 flex items-center gap-2">
                            <Link className="w-4 h-4" />
                            分享链接 ♡
                          </h4>
                          
                          {(() => {
                            const links = generateLinks(file)
                            if (!links) return null
                            
                            return (
                              <div className="space-y-3">
                                {/* 直链 */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">图片直链</label>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(links.direct, '直链')}
                                        className="h-6 px-2 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        复制
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(links.direct, '_blank')}
                                        className="h-6 px-2 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        预览
                                      </Button>
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={links.direct}
                                    readOnly
                                    className="w-full text-xs bg-white border border-pink-200 rounded px-3 py-2 font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                  />
                                </div>
                                
                                {/* HTML */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">HTML 代码</label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(links.html, 'HTML代码')}
                                      className="h-6 px-2 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      复制
                                    </Button>
                                  </div>
                                  <input
                                    type="text"
                                    value={links.html}
                                    readOnly
                                    className="w-full text-xs bg-white border border-pink-200 rounded px-3 py-2 font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                  />
                                </div>
                                
                                {/* Markdown */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">Markdown 代码</label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(links.markdown, 'Markdown代码')}
                                      className="h-6 px-2 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      复制
                                    </Button>
                                  </div>
                                  <input
                                    type="text"
                                    value={links.markdown}
                                    readOnly
                                    className="w-full text-xs bg-white border border-pink-200 rounded px-3 py-2 font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                  />
                                </div>
                                
                                {/* BBCode */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">BBCode 代码</label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(links.bbcode, 'BBCode代码')}
                                      className="h-6 px-2 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      复制
                                    </Button>
                                  </div>
                                  <input
                                    type="text"
                                    value={links.bbcode}
                                    readOnly
                                    className="w-full text-xs bg-white border border-pink-200 rounded px-3 py-2 font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                  />
                                </div>
                                
                                {/* 快捷操作按钮 */}
                                <div className="flex gap-2 pt-2 border-t border-pink-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(links.direct, '直链')}
                                    className="flex-1 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    复制直链
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(links.markdown, 'Markdown')}
                                    className="flex-1 text-xs bg-white hover:bg-pink-50 border-pink-200"
                                  >
                                    <Code className="w-3 h-3 mr-1" />
                                    复制MD
                                  </Button>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
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
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
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
