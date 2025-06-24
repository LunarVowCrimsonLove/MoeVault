import { BaseStorageProvider, type UploadResult, type StorageUsage } from "./base"

export class GitHubProvider extends BaseStorageProvider {
  name = "GitHub"
  private config: {
    token: string
    owner: string
    repo: string
    branch?: string
    path?: string
  }

  constructor(config: {
    token: string
    owner: string
    repo: string
    branch?: string
    path?: string
  }) {
    super()
    this.config = {
      branch: "main",
      path: "uploads",
      ...config
    }
  }

  async upload(file: File, path?: string): Promise<UploadResult> {
    this.validateFile(file)

    const uploadPath = path || this.generatePath(file.name)
    const fullPath = this.config.path ? `${this.config.path}/${uploadPath}` : uploadPath
    const arrayBuffer = await file.arrayBuffer()
    const content = Buffer.from(arrayBuffer).toString('base64')

    // GitHub API upload
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${fullPath}`

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `token ${this.config.token}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Upload ${file.name}`,
          content: content,
          branch: this.config.branch
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`GitHub upload failed: ${error.message}`)
      }

      const result = await response.json()

      return {
        url: result.content.download_url,
        path: fullPath,
        size: file.size,
      }
    } catch (error) {
      throw new Error(`GitHub upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      // 首先获取文件信息以获取 SHA
      const getUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`
      const getResponse = await fetch(getUrl, {
        headers: {
          "Authorization": `token ${this.config.token}`,
          "Accept": "application/vnd.github.v3+json",
        }
      })

      if (!getResponse.ok) {
        return false
      }

      const fileInfo = await getResponse.json()

      // 删除文件
      const deleteResponse = await fetch(getUrl, {
        method: "DELETE",
        headers: {
          "Authorization": `token ${this.config.token}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Delete ${path}`,
          sha: fileInfo.sha,
          branch: this.config.branch
        })
      })

      return deleteResponse.ok
    } catch (error) {
      return false
    }
  }

  getUrl(path: string): string {
    return `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${path}`
  }

  async getUsage(): Promise<StorageUsage> {
    try {
      // GitHub 仓库信息 API
      const repoUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`
      const response = await fetch(repoUrl, {
        headers: {
          "Authorization": `token ${this.config.token}`,
          "Accept": "application/vnd.github.v3+json",
        }
      })

      if (!response.ok) {
        throw new Error("Failed to get repository info")
      }

      const repoInfo = await response.json()
      const used = repoInfo.size * 1024 // GitHub API 返回的是 KB
      const total = 1024 * 1024 * 1024 // GitHub 免费账户 1GB 限制

      return {
        used,
        total,
        percentage: (used / total) * 100,
      }
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 }
    }
  }
}
