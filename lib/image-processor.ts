import sharp from "sharp"

export interface ProcessOptions {
  width?: number
  height?: number
  quality?: number
  format?: "jpeg" | "png" | "webp"
  compress?: boolean
}

export interface ImageMetadata {
  width: number
  height: number
  format?: string
  [key: string]: any
}

export class ImageProcessor {
  static async processImage(file: File, options: ProcessOptions = {}): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      let processor = sharp(buffer)

      // 获取原始图片信息
      const metadata = await processor.metadata()

    // 调整尺寸
    if (options.width || options.height) {
      processor = processor.resize(options.width, options.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
    }

    // 格式转换和压缩
    if (options.format) {
      switch (options.format) {
        case "jpeg":
          processor = processor.jpeg({
            quality: options.quality || 85,
            progressive: true,
          })
          break
        case "png":
          processor = processor.png({
            quality: options.quality || 85,
            compressionLevel: 9,
          })
          break
        case "webp":
          processor = processor.webp({
            quality: options.quality || 85,
          })
          break
      }
    } else if (options.compress) {
      // 自动压缩
      if (metadata.format === "jpeg") {
        processor = processor.jpeg({ quality: 85, progressive: true })
      } else if (metadata.format === "png") {
        processor = processor.png({ compressionLevel: 9 })
      }
    }      const processedBuffer = await processor.toBuffer()
      const processedMetadata = await sharp(processedBuffer).metadata()

      return {
        buffer: processedBuffer,
        metadata: {
          width: processedMetadata.width || 0,
          height: processedMetadata.height || 0,
          format: processedMetadata.format
        }
      }
    } catch (error) {
      console.error('Sharp processing error:', error);
      // 返回原始数据，避免处理失败
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        buffer: buffer,
        metadata: { 
          width: 0, 
          height: 0, 
          format: file.type.split('/')[1] || 'unknown'
        }
      };
    }
  }

  static async generateThumbnail(file: File, size = 200): Promise<Buffer> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return await sharp(buffer)
        .resize(size, size, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toBuffer()
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      // 返回空buffer
      return Buffer.from([]);
    }
  }

  static getOptimalFormat(originalFormat: string, hasTransparency: boolean): string {
    if (hasTransparency) {
      return "png"
    }

    if (originalFormat === "gif") {
      return "gif"
    }

    return "webp" // WebP 通常提供最好的压缩比
  }
}
