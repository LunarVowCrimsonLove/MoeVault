import type { StorageProvider } from "./base"
import { OneDriveProvider } from "./onedrive"
import { AliyunOSSProvider } from "./aliyun"
import { TencentCOSProvider } from "./tencent"
import { LocalStorageProvider } from "./local"
import { GitHubProvider } from "./github"
import { S3Provider } from "./s3"
import { executeQuerySingle } from "../database"

export class StorageFactory {
  static async createProvider(
    userId: string,
    providerType: "local" | "onedrive" | "aliyun" | "tencent" | "github" | "s3",
  ): Promise<StorageProvider> {
    switch (providerType) {
      case "local":
        return new LocalStorageProvider()

      case "onedrive":
        const oneDriveConfig = await this.getStorageConfig(userId, "onedrive")
        return new OneDriveProvider(oneDriveConfig)

      case "aliyun":
        const aliyunConfig = await this.getStorageConfig(userId, "aliyun")
        return new AliyunOSSProvider(aliyunConfig)

      case "tencent":
        const tencentConfig = await this.getStorageConfig(userId, "tencent")
        return new TencentCOSProvider(tencentConfig)

      case "github":
        const githubConfig = await this.getStorageConfig(userId, "github")
        return new GitHubProvider(githubConfig)

      case "s3":
        const s3Config = await this.getStorageConfig(userId, "s3")
        return new S3Provider(s3Config)

      default:
        throw new Error(`Unsupported storage provider: ${providerType}`)
    }
  }

  static async createProviderFromStrategy(strategyId: number): Promise<StorageProvider> {
    // 从策略表获取配置
    const strategy = await executeQuerySingle(
      "SELECT type, configs FROM strategies WHERE id = ? AND status = 'active'",
      [strategyId]
    )

    if (!strategy) {
      throw new Error(`Storage strategy not found: ${strategyId}`)
    }

    const config = typeof strategy.configs === "string" ? JSON.parse(strategy.configs) : strategy.configs

    switch (strategy.type) {
      case "local":
        return new LocalStorageProvider()

      case "onedrive":
        return new OneDriveProvider(config)

      case "aliyun":
        return new AliyunOSSProvider(config)

      case "tencent":
        return new TencentCOSProvider(config)

      case "github":
        return new GitHubProvider(config)

      case "s3":
        return new S3Provider(config)

      default:
        throw new Error(`Unsupported storage provider: ${strategy.type}`)
    }
  }

  private static async getStorageConfig(userId: string, provider: string): Promise<any> {
    const result = await executeQuerySingle(
      "SELECT config FROM storage_configs WHERE user_id = ? AND provider = ? AND is_active = 1",
      [userId, provider],
    )

    if (!result) {
      throw new Error(`Storage config not found for ${provider}`)
    }

    const config = typeof result.config === "string" ? JSON.parse(result.config) : result.config
    return config
  }
}
