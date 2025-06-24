import mysql from "mysql2/promise"

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || "156.226.176.148",
  port: Number.parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "tc",
  password: process.env.DB_PASSWORD || "aNMEFHXJ55Nkf77K",
  database: process.env.DB_NAME || "tc",
  charset: "utf8mb4",
  timezone: "+00:00",
  connectTimeout: 60000,
  insecureAuth: false,
}

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// 数据库连接实例
export const db = pool

// 数据库类型定义
export interface User {
  id: number
  group_id?: number
  name: string
  email: string
  password: string
  remember_token?: string
  is_adminer: boolean
  capacity: number
  url: string
  configs: any
  image_num: number
  album_num: number
  registered_ip: string
  status: number
  email_verified_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Image {
  id: number
  user_id: number
  album_id?: number
  group_id?: number
  strategy_id?: number
  key: string
  path: string
  name: string
  origin_name: string
  alias_name: string
  size: number
  mimetype: string
  extension: string
  md5: string
  sha1: string
  width: number
  height: number
  permission: number
  is_unhealthy: boolean
  uploaded_ip: string
  created_at: Date
  updated_at: Date
}

export interface Album {
  id: number
  user_id: number
  name: string
  intro: string
  image_num: number
  created_at: Date
  updated_at: Date
}

export interface StorageConfig {
  id: string
  user_id: string
  provider: "onedrive" | "aliyun" | "tencent"
  config: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// 数据库查询辅助函数
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await db.execute(query, params)
    return rows as T[]
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

export async function executeQuerySingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
  const results = await executeQuery<T>(query, params)
  return results.length > 0 ? results[0] : null
}

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    await db.execute("SELECT 1")
    console.log("✅ Database connected successfully")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}
