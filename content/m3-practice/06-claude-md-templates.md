---
title: "Claude Code 最佳 CLAUDE.md 模板合集"
module: "m3-practice"
order: 6
group: "资源合集"
description: "12 个经过实战验证的 CLAUDE.md 模板，覆盖前端、后端、全栈、开源项目等场景，拿来即用。"
duration: "20 分钟"
level: "零基础可读"
publishedAt: "2026-04-05"
---

## 为什么 CLAUDE.md 这么重要

CLAUDE.md 是你和 Claude Code 之间的「契约书」。没有它，Claude Code 每次都在猜你的意图；有了它，Claude Code 从第一轮对话就知道你的项目规范、技术栈、代码风格。

我在实际使用中发现，一份好的 CLAUDE.md 能减少 40% 以上的纠正次数。下面是我收集整理的 12 个模板，全部经过实战验证。

---

## 模板 1：React + TypeScript 前端项目

```markdown
# 项目概述
基于 React 18 + TypeScript 的中后台管理系统。

# 技术栈
- React 18 + TypeScript 5
- Vite 6 构建
- TailwindCSS 4 样式
- React Router 7 路由
- Zustand 状态管理
- Axios 网络请求

# 代码规范
- 组件使用函数式组件 + Hooks，禁止 class 组件
- 文件命名：组件用 PascalCase，工具函数用 camelCase
- 类型定义放在同目录的 types.ts 中
- 禁止使用 any，必须显式定义类型
- CSS 类名使用 Tailwind，不写自定义 CSS 除非 Tailwind 无法实现

# 目录结构
src/
  components/   # 公共组件
  pages/        # 页面组件
  hooks/        # 自定义 Hooks
  stores/       # Zustand store
  utils/        # 工具函数
  types/        # 全局类型
  api/          # API 请求层

# 测试
- 使用 Vitest + Testing Library
- 组件测试覆盖核心交互逻辑
- 运行：pnpm test

# 提交规范
- feat: 新功能
- fix: 修复
- refactor: 重构
- 提交信息用中文
```

---

## 模板 2：Node.js + Express 后端项目

```markdown
# 项目概述
RESTful API 服务，为移动端和 Web 端提供数据接口。

# 技术栈
- Node.js 22 + TypeScript
- Express 5
- PostgreSQL + Prisma ORM
- Redis 缓存
- JWT 认证

# 代码规范
- 使用 ESM 模块系统（import/export）
- 路由文件按资源划分：users.router.ts, orders.router.ts
- 业务逻辑放在 service 层，不在 controller 里写复杂逻辑
- 所有数据库操作通过 Prisma，不写原生 SQL
- 错误统一通过 AppError 类抛出，由全局中间件捕获

# 目录结构
src/
  routes/       # 路由定义
  controllers/  # 请求处理
  services/     # 业务逻辑
  models/       # Prisma schema
  middleware/   # 中间件
  utils/        # 工具函数

# 数据库
- 迁移：npx prisma migrate dev
- 重置：npx prisma migrate reset
- 查看：npx prisma studio

# 测试
- 使用 Vitest
- API 测试使用 supertest
- 运行：pnpm test

# 安全注意
- 不要在代码中硬编码密钥
- 所有用户输入必须验证
- SQL 查询全部参数化（Prisma 自动处理）
```

---

## 模板 3：Next.js 全栈项目

```markdown
# 项目概述
Next.js 15 全栈应用，使用 App Router。

# 技术栈
- Next.js 15 (App Router)
- TypeScript 5
- TailwindCSS 4
- Prisma + PostgreSQL
- NextAuth.js 认证
- Vercel 部署

# 代码规范
- 默认使用 Server Components，仅在需要交互时加 'use client'
- 数据获取优先使用 Server Components 直接查询，不必要不用 API Routes
- 样式使用 Tailwind，组件库用 shadcn/ui
- 文件命名：page.tsx, layout.tsx, loading.tsx 遵循 Next.js 约定

# 目录结构
app/
  (auth)/       # 认证相关页面
  (dashboard)/  # 后台页面
  api/          # API Routes
components/
  ui/           # shadcn/ui 组件
  shared/       # 业务公共组件
lib/
  db.ts         # Prisma 客户端
  auth.ts       # NextAuth 配置

# 运行命令
- 开发：pnpm dev
- 构建：pnpm build
- 数据库：pnpm db:push

# 部署
- 推送到 main 分支自动部署到 Vercel
- 环境变量在 Vercel Dashboard 管理
```

---

## 模板 4：Python FastAPI 项目

```markdown
# 项目概述
Python FastAPI 构建的微服务 API。

# 技术栈
- Python 3.12
- FastAPI + Uvicorn
- SQLAlchemy 2.0 + Alembic
- Pydantic v2 数据验证
- Poetry 依赖管理

# 代码规范
- 使用 async/await 异步函数
- 类型注解必须完整，Pydantic model 定义请求/响应
- 使用 Python 命名规范：snake_case 函数和变量，PascalCase 类
- 每个路由模块一个文件
- 日志使用 structlog

# 目录结构
app/
  api/          # 路由
  models/       # SQLAlchemy 模型
  schemas/      # Pydantic schemas
  services/     # 业务逻辑
  core/         # 配置、安全
  db/           # 数据库连接

# 运行命令
- 开发：poetry run uvicorn app.main:app --reload
- 测试：poetry run pytest
- 迁移：poetry run alembic upgrade head
- 格式化：poetry run ruff format
```

---

## 模板 5：Vue 3 前端项目

```markdown
# 项目概述
Vue 3 + Composition API 的企业级前端应用。

# 技术栈
- Vue 3 + TypeScript
- Vite 6
- Pinia 状态管理
- Vue Router 4
- Element Plus UI 组件库
- UnoCSS 原子化 CSS

# 代码规范
- 使用 <script setup lang="ts"> 语法
- 组件文件名用 PascalCase
- 组合式函数以 use 开头命名
- Props 必须定义类型和默认值
- Emits 必须显式声明

# 目录结构
src/
  views/        # 页面
  components/   # 公共组件
  composables/  # 组合式函数
  stores/       # Pinia store
  router/       # 路由配置
  api/          # 接口请求
  utils/        # 工具
  types/        # 类型定义
```

---

## 模板 6：Go Web 服务

```markdown
# 项目概述
Go 语言构建的高性能 Web 服务。

# 技术栈
- Go 1.23
- Gin Web 框架
- GORM 数据库 ORM
- Redis 缓存
- Wire 依赖注入

# 代码规范
- 遵循 Go 官方代码规范
- 错误处理不要忽略，必须显式处理
- 接口定义在使用方，不在实现方
- 结构体方法使用指针接收者
- 并发安全：共享状态使用 sync.Mutex 或 channel

# 目录结构
cmd/            # 入口
internal/
  handler/      # HTTP 处理
  service/      # 业务逻辑
  repository/   # 数据层
  model/        # 数据模型
  middleware/    # 中间件
pkg/            # 可复用包

# 运行命令
- 开发：go run cmd/server/main.go
- 测试：go test ./...
- 构建：go build -o bin/server cmd/server/main.go
```

---

## 模板 7：Flutter 移动端项目

```markdown
# 项目概述
Flutter 跨平台移动应用（iOS + Android）。

# 技术栈
- Flutter 3.24 + Dart 3.5
- Riverpod 状态管理
- Dio 网络请求
- Hive 本地存储
- GoRouter 路由

# 代码规范
- Widget 拆分：单个 build 方法不超过 80 行
- 使用 Riverpod 的 code generation
- 私有变量和方法以 _ 开头
- 颜色和字体统一在 theme 中定义，不要硬编码
- 国际化使用 flutter_localizations

# 目录结构
lib/
  features/     # 按功能模块组织
    auth/
    home/
    profile/
  core/         # 核心代码
    theme/
    router/
    network/
  shared/       # 共享组件和工具

# 运行命令
- 开发：flutter run
- 测试：flutter test
- 构建：flutter build apk / flutter build ios
```

---

## 模板 8：Astro 静态站点

```markdown
# 项目概述
Astro 构建的内容型静态网站。

# 技术栈
- Astro 6
- TypeScript
- Content Collections
- TailwindCSS
- Vercel 部署

# 代码规范
- 页面组件放 src/pages/，使用 .astro 文件
- 内容用 Markdown + frontmatter，放 content/ 目录
- 样式优先用 Tailwind，全局样式放 src/styles/
- 组件 props 必须定义 TypeScript interface
- 图片放 public/，使用相对路径引用

# 目录结构
src/
  pages/        # 页面路由
  components/   # Astro/框架组件
  layouts/      # 布局模板
  styles/       # 全局样式
content/        # Markdown 内容
public/         # 静态资源

# 运行命令
- 开发：pnpm dev
- 构建：pnpm build
- 预览：pnpm preview
```

---

## 模板 9：Rust CLI 工具

```markdown
# 项目概述
Rust 编写的命令行工具。

# 技术栈
- Rust 2024 Edition
- clap 命令行解析
- tokio 异步运行时
- serde + serde_json 序列化
- anyhow 错误处理

# 代码规范
- 使用 Result 和 Option，避免 unwrap()
- 公共 API 必须有文档注释（///）
- 错误类型使用 thiserror 定义
- 模块拆分清晰，单个文件不超过 300 行
- 使用 clippy 保持代码质量

# 运行命令
- 开发运行：cargo run -- <args>
- 测试：cargo test
- 检查：cargo clippy
- 格式化：cargo fmt
- 发布构建：cargo build --release
```

---

## 模板 10：微信小程序

```markdown
# 项目概述
微信小程序项目，使用原生开发。

# 技术栈
- 微信小程序原生框架
- TypeScript
- Vant Weapp UI 组件
- 自定义 HTTP 请求封装

# 代码规范
- 页面命名使用 kebab-case
- 组件命名使用 kebab-case
- 使用 Component 构造器编写所有页面和组件
- WXML 中禁止内联样式
- WXSS 使用 rpx 单位，不用 px

# 目录结构
miniprogram/
  pages/        # 页面
  components/   # 自定义组件
  utils/        # 工具函数
  services/     # API 请求
  assets/       # 图片资源
  styles/       # 公共样式

# 运行命令
- 使用微信开发者工具打开项目
- 构建 npm：工具菜单 -> 构建 npm
```

---

## 模板 11：开源项目通用模板

```markdown
# 项目概述
[简短描述项目做什么]

# 贡献指南
- Fork 后在 feature 分支开发
- PR 前确保所有测试通过
- 提交信息遵循 Conventional Commits
- 新功能需要附带测试
- 文档变更需要同步更新 README

# 代码规范
- [列出你的 lint 规则]
- [列出命名约定]
- [列出禁止事项]

# 开发环境
- Node.js >= 22
- pnpm >= 9
- 安装：pnpm install
- 开发：pnpm dev
- 测试：pnpm test
- lint：pnpm lint

# 发布流程
- 更新 CHANGELOG.md
- 运行 pnpm version <patch|minor|major>
- 推送 tag 自动触发 CI 发布

# CI/CD
- GitHub Actions 自动运行测试
- 合并到 main 自动发布 npm
- PR 必须通过 CI 才能合并
```

---

## 模板 12：Monorepo 大型项目

```markdown
# 项目概述
Turborepo 管理的 Monorepo，包含多个应用和共享包。

# 技术栈
- Turborepo 构建系统
- pnpm workspace
- TypeScript 5
- 各子包技术栈见各自 README

# 项目结构
apps/
  web/          # Next.js 前端
  api/          # Express 后端
  admin/        # 管理后台
packages/
  ui/           # 共享 UI 组件
  utils/        # 共享工具函数
  types/        # 共享类型定义
  config/       # 共享配置（ESLint, TSConfig）

# 代码规范
- 共享代码放 packages/，不要跨 app 直接引用
- 新建包需要配置 package.json 和 tsconfig.json
- 类型定义统一放 @repo/types
- UI 组件统一放 @repo/ui

# 运行命令
- 全部开发：pnpm dev
- 全部构建：pnpm build
- 全部测试：pnpm test
- 单个项目：pnpm --filter web dev
- 安装依赖：pnpm add <pkg> --filter <workspace>

# 注意事项
- 修改 packages/ 下的代码会影响所有引用方
- 添加新的 workspace 后运行 pnpm install
- Turborepo 会自动缓存构建结果
```

---

## 使用建议

1. **不要照搬**：模板是起点，根据你的实际项目调整细节
2. **持续更新**：项目演进时同步更新 CLAUDE.md
3. **越具体越好**：比起"代码要规范"，写"函数名用 camelCase，组件名用 PascalCase"更有效
4. **加入禁止项**：告诉 Claude Code 不该做什么，往往比告诉它该做什么更重要
5. **写真实路径**：给出实际的目录结构，不要写理想化的结构

下一篇我们会看一份实战级的提示词库，覆盖日常开发的各种场景。
