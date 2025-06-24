import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register")
    const isAdminPage = req.nextUrl.pathname.startsWith("/admin")
    const isApiRoute = req.nextUrl.pathname.startsWith("/api")

    // 如果是API路由，让它通过（在API路由中处理认证）
    if (isApiRoute) {
      return NextResponse.next()
    }

    // 如果用户已登录且访问认证页面，重定向到控制台
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // 如果用户未登录且访问受保护页面，重定向到登录页
    if (
      !isAuthPage &&
      !isAuth &&
      (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/settings"))
    ) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // 管理员页面权限检查
    if (isAdminPage && (!isAuth || !token?.isAdmin)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true, // 在中间件函数中处理授权逻辑
    },
  },
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/api/upload/:path*",
    "/api/images/:path*",
    "/api/admin/:path*",
  ],
}
