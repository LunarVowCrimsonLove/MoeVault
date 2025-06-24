/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'graph.microsoft.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
    // 增加对大文件上传的支持
    appDir: true,
  },
  // 配置文件上传限制
  serverRuntimeConfig: {
    // Will only be available on the server side
    maxFileSize: '50mb',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/uploads',
  },
  // 增加文件上传大小限制
  serverRuntimeConfig: {
    maxFileSize: '50mb',
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
