# 🌸 MoeVault - 可爱到爆炸的图床服务

> 支持多种云存储的二次元萌系图床应用

## ✨ 特性

### 🎨 萌系界面
- 二次元风格设计
- 粉色渐变主题
- 可爱动画效果
- 响应式布局

### ☁️ 多云存储支持
- **本地存储** - 默认支持
- **Microsoft OneDrive** - 企业级云存储
- **阿里云OSS** - 国内高速访问
- **腾讯云COS** - 稳定可靠

### 👥 完整用户系统
- 邮箱密码注册登录
- GitHub/Google第三方登录
- 用户权限管理
- 存储配额控制

### 📸 强大图片管理
- 拖拽上传
- 智能压缩
- 格式转换
- 批量操作
- 相册分类

### 🔗 分享功能
- 一键生成分享链接
- 密码保护
- 过期时间设置
- 查看次数限制

### 📱 PWA支持
- 离线访问
- 桌面安装
- 推送通知
- 移动端优化

## 🚀 快速开始

### 环境要求
- Node.js 18+
- MySQL 5.7+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
\`\`\`bash
git clone https://github.com/your-username/moevault.git
cd moevault
\`\`\`

2. **安装依赖**
\`\`\`bash
npm install
\`\`\`

3. **配置环境变量**
\`\`\`bash
cp .env.example .env.local
\`\`\`

编辑 `.env.local` 文件：
\`\`\`env
# 数据库配置
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database

# NextAuth配置
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth (可选)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
\`\`\`

4. **初始化数据库**
\`\`\`bash
npm run db:test    # 测试数据库连接
npm run db:init    # 初始化数据库结构
\`\`\`

5. **启动开发服务器**
\`\`\`bash
npm run dev:full   # 完整启动（包含数据库检查）
# 或
npm run dev        # 仅启动Next.js
\`\`\`

6. **访问应用**
打开浏览器访问 `http://localhost:3000`

### 测试账户
- **管理员**: admin@moevault.com / password123
- **普通用户**: user@moevault.com / password123

## 📁 项目结构

\`\`\`
moevault/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理员后台
│   ├── api/               # API路由
│   ├── dashboard/         # 用户控制台
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   ├── settings/          # 设置页面
│   └── share/             # 分享页面
├── components/            # React组件
│   ├── ui/               # shadcn/ui组件
│   ├── image-gallery.tsx # 图片画廊
│   ├── upload-zone.tsx   # 上传区域
│   └── ...
├── lib/                  # 工具库
│   ├── auth.ts          # 认证配置
│   ├── database.ts      # 数据库操作
│   └── storage/         # 存储提供商
├── hooks/               # React Hooks
├── scripts/             # 数据库脚本
└── public/              # 静态资源
\`\`\`

## 🔧 配置说明

### 存储配置

#### OneDrive配置
1. 访问 [Azure Portal](https://portal.azure.com)
2. 注册应用获取 Client ID 和 Secret
3. 在设置页面添加OneDrive配置

#### 阿里云OSS配置
1. 开通阿里云OSS服务
2. 创建Bucket
3. 获取AccessKey
4. 在设置页面添加OSS配置

#### 腾讯云COS配置
1. 开通腾讯云COS服务
2. 创建存储桶
3. 获取SecretId和SecretKey
4. 在设置页面添加COS配置

## 🛠️ 开发指南

### 数据库操作
\`\`\`bash
npm run db:test     # 测试连接
npm run db:init     # 初始化
npm run db:reset    # 重置数据库
\`\`\`

### 构建部署
\`\`\`bash
npm run build       # 构建生产版本
npm run start       # 启动生产服务器
\`\`\`

### 代码规范
- 使用TypeScript
- 遵循ESLint规则
- 组件使用shadcn/ui
- 样式使用Tailwind CSS

## 📊 功能特性

### 用户功能
- ✅ 用户注册登录
- ✅ 图片上传管理
- ✅ 相册分类
- ✅ 分享链接
- ✅ 存储配置
- ✅ 个人设置

### 管理员功能
- ✅ 用户管理
- ✅ 图片管理
- ✅ 系统统计
- ✅ 存储监控
- ✅ 系统设置

### API功能
- ✅ RESTful API
- ✅ 文件上传
- ✅ 图片处理
- ✅ 用户认证
- ✅ 权限控制

## 🔒 安全特性

- 密码加密存储
- JWT令牌认证
- API访问控制
- 文件类型验证
- 存储配额限制
- 访问日志记录

## 🌐 部署指南

### Vercel部署
1. 连接GitHub仓库
2. 配置环境变量
3. 自动部署

### Docker部署
\`\`\`bash
# 构建镜像
docker build -t moevault .

# 运行容器
docker run -p 3000:3000 moevault
\`\`\`

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 💖 致谢

- [Next.js](https://nextjs.org/) - React框架
- [shadcn/ui](https://ui.shadcn.com/) - UI组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [NextAuth.js](https://next-auth.js.org/) - 认证库
- [Lucide React](https://lucide.dev/) - 图标库

---

**用爱发电，让世界更可爱 (◕‿◕)♡**
\`\`\`

## 🎉 完整功能实现总结

现在MoeVault已经是一个功能完整的萌系图床应用了！

### ✅ **已实现的核心功能**

#### 🔐 **用户系统**
- 完整的注册登录流程
- NextAuth.js认证集成
- GitHub/Google第三方登录
- 用户权限管理
- 会话状态管理

#### 📸 **图片管理**
- 实际的文件上传功能
- 多格式支持和验证
- 智能压缩和处理
- 拖拽上传体验
- 批量操作功能
- 图片画廊展示

#### ☁️ **存储系统**
- 多云存储提供商支持
- 存储配置管理
- 连接测试功能
- 使用量统计

#### 🔗 **分享功能**
- 分享链接生成
- 密码保护访问
- 过期时间控制
- 查看次数限制

#### 👨‍💼 **管理后台**
- 管理员权限控制
- 系统统计面板
- 用户管理界面
- 存储监控

#### 🛠️ **开发工具**
- 完整的数据库脚本
- 自动化启动流程
- 环境配置检查
- 错误处理机制

### 🚀 **启动方式**

\`\`\`bash
# 完整启动（推荐）
npm run dev:full

# 或分步启动
npm run db:test    # 测试数据库
npm run db:init    # 初始化数据库
npm run dev        # 启动开发服务器
\`\`\`

### 🎯 **测试流程**

1. **用户注册** → 创建新账户
2. **用户登录** → 访问控制台
3. **图片上传** → 拖拽或选择文件
4. **存储配置** → 添加云存储
5. **分享功能** → 创建分享链接
6. **管理后台** → 系统管理功能

现在你可以开始全面测试MoeVault的所有功能了！🌟
