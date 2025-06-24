import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === "loading") return

      if (!session?.user?.id) {
        router.push("/login")
        return
      }      try {
        const response = await fetch("/api/user/profile")
        if (response.ok) {
          const data = await response.json()
          const adminStatus = data.profile?.isAdmin || false
          setIsAdmin(adminStatus)
          
          console.log("Admin check result:", { 
            isAdmin: data.profile?.isAdmin, 
            isPremium: data.profile?.isPremium,
            adminStatus 
          })
          
          if (!adminStatus) {
            router.push("/dashboard")
          }
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Failed to check admin status:", error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [session, status, router])

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">检查权限中...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">访问被拒绝</h2>
            <p className="text-gray-600 mb-4">你没有访问管理后台的权限</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              返回控制台
            </button>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
