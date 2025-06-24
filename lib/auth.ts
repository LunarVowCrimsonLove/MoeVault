import type { NextAuthOptions } from "next-auth"
import type { DefaultSession } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { executeQuerySingle, executeQuery } from "./database"
import type { User } from "./database"

// 生成API Token
function generateApiToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 扩展 Session 类型
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      isAdmin?: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isAdmin?: boolean
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here-change-in-production",
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await executeQuerySingle<User>("SELECT * FROM users WHERE email = ?", [credentials.email])

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: null,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        
        // 获取用户的管理员状态
        try {
          const dbUser = await executeQuerySingle<User>("SELECT is_adminer FROM users WHERE id = ?", [user.id])
          token.isAdmin = Boolean(dbUser?.is_adminer)
        } catch (error) {
          console.error("Failed to fetch user admin status:", error)
          token.isAdmin = false
        }
      }

      // 处理第三方登录
      if (account && (account.provider === "github" || account.provider === "google")) {
        try {
          // 检查用户是否已存在
          const existingUser = await executeQuerySingle<User>("SELECT * FROM users WHERE email = ?", [user!.email!])

          if (!existingUser) {
            // 检查是否是第一个用户
            const userCount = await executeQuerySingle<{count: number}>("SELECT COUNT(*) as count FROM users")
            const isFirstUser = (userCount?.count || 0) === 0

            // 生成用户ID和API Token
            const userId = crypto.randomUUID()
            const apiToken = generateApiToken()

            // 创建新用户
            await executeQuery(
              `INSERT INTO users (id, name, email, password, api_token, image_num, is_adminer) 
               VALUES (?, ?, ?, ?, ?, 0, ?)`,
              [
                userId,
                user!.name || user!.email!.split("@")[0],
                user!.email,
                "", // 第三方登录不需要密码
                apiToken,
                isFirstUser ? 1 : 0
              ],
            )
            
            token.id = userId
            token.isAdmin = isFirstUser          } else {
            token.id = existingUser.id.toString()
            token.isAdmin = Boolean(existingUser.is_adminer)
          }
        } catch (error) {
          console.error("Third-party login error:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.isAdmin = token.isAdmin
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}