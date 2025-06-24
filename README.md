# 🌸 MoeVault - 可爱图床服务

![Banner](https://picsum.photos/1200/400?random=1)

> 支持多云存储的二次元风格图床应用

## ✨ 核心特性

### 🎨 萌系界面
- 二次元风格UI设计
- 粉色渐变主题
- 响应式布局
- 可爱动画效果

### ☁️ 存储支持
| 提供商 | 类型 | 状态 |
|--------|------|------|
| 本地存储 | 默认 | ✅ |
| OneDrive | 企业级 | ✅ |
| 阿里云OSS | 国内高速 | ✅ |
| 腾讯云COS | 稳定可靠 | ✅ |

## 🚀 快速开始

### 环境要求
- Node.js 18+
- MySQL 5.7+
- npm/yarn

```bash
# 克隆项目
git clone https://github.com/your-username/moevault.git
cd moevault

# 安装依赖
npm install

# 配置环境
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

## 🏗️ 项目结构

```text
moevault/
├── app/        # Next.js路由
├── components/ # React组件
├── lib/        # 核心逻辑
├── hooks/      # 自定义Hook
└── public/     # 静态资源
```

## 🔧 配置指南

### 数据库配置
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
```

## 🤝 贡献指南
1. Fork项目
2. 创建特性分支
3. 提交Pull Request

## 📄 许可证
MIT License

---

<div align="center">
  <img src="https://picsum.photos/200/200?random=2" width="100">
  <p>用爱发电，让世界更可爱 (◕‿◕)♡</p>
</div>
