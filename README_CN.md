# AI 写作平台 — 前端

本项目是 AI 写作平台的前端单页应用，基于 React + TypeScript 构建，通过后端 API 网关与所有微服务通信，生产环境由 Nginx 托管。

---

## 架构简介

```
ai-writing-platform-frontend/
├── src/
│   ├── pages/          # 页面级组件（编辑器、仪表盘、评审等）
│   ├── lib/
│   │   └── api.ts      # 统一 API 客户端（axios / fetch 封装）
│   ├── App.tsx         # 根组件，包含路由配置
│   └── main.tsx        # React 入口
├── Dockerfile          # 多阶段构建：Node 20 → Nginx Alpine
├── nginx.conf          # SPA 回退路由，监听 3000 端口
├── vite.config.ts
└── .env.local.example
```

### 页面一览

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | `Home` | 首页 / 欢迎页 |
| `/login` | `Login` | JWT 登录认证 |
| `/dashboard` | `Dashboard` | 使用统计与近期文档 |
| `/editor` | `Editor` | AI 辅助写作编辑器 |
| `/review` | `Review` | 人工审核队列（HITL） |
| `/batch` | `Batch` | 批量文档处理 |
| `/upload` | `Upload` | 文件上传（PDF / DOCX） |
| `/learn` | `Learn` | 知识库 / 建议 |
| `/preferences` | `Preferences` | 用户设置 |
| `/subscription` | `Subscription` | Stripe 订阅管理 |

### 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 路由 | React Router DOM 6 |
| 图表 | Recharts |
| 代码检查 | ESLint + TypeScript ESLint |
| 运行时 | Nginx Alpine（端口 3000） |

前端**不直接依赖数据库或 AI 服务**，所有数据请求均通过 `VITE_API_GATEWAY_URL` 指向的 API 网关转发。

---

## 本地开发

### 前置条件

- Node.js 20+
- npm 9+
- 后端 API 网关已启动（参见 `ai-writing-platform-backend`）

### 启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 创建本地环境文件
cp .env.local.example .env.local
# 编辑 .env.local，设置：
#   VITE_API_GATEWAY_URL=http://localhost:8000

# 3. 启动开发服务器（支持热更新）
npm run dev
```

默认访问地址：`http://localhost:5173`

### 不启动完整后端栈的开发方式

前端只需要 API 网关可访问即可运行，其余微服务按需启动。仅启动必要的基础设施和网关：

```bash
# 在 ai-writing-platform-backend/infrastructure 目录下执行：
docker compose up postgres redis api_gateway -d
```

也可以不使用 Docker，直接在宿主机上运行 API 网关。参见[后端 README](../ai-writing-platform-backend/README_CN.md#独立服务开发) 中各服务的启动命令和环境变量说明。

将 `.env.local` 中的 `VITE_API_GATEWAY_URL` 指向网关所在地址，然后照常执行 `npm run dev` 即可。

### 其他脚本

```bash
npm run build    # 生产构建（输出至 dist/）
npm run preview  # 本地预览生产构建结果
npm run lint     # ESLint 检查（强制零警告）
```

---

## Docker 部署

### 构建并运行独立容器

```bash
docker build -t ai-writing-frontend .

docker run -p 3000:3000 \
  -e VITE_API_GATEWAY_URL=http://<网关地址>:8000 \
  ai-writing-frontend
```

容器监听 **3000 端口**，Nginx 配置已处理 SPA 路由回退（所有路径均返回 `index.html`）。

> **注意：** `VITE_` 前缀的环境变量由 Vite 在构建时静态嵌入。如需在不重新构建的情况下修改 API 地址，需替换构建产物中 `index.html` 内的对应值，或使用运行时配置接口。

### 全栈部署（推荐）

使用后端仓库中提供的 Docker Compose 文件一键启动所有服务：

```bash
cd ../ai-writing-platform-backend/infrastructure
cp .env.example .env   # 填写密钥和配置
docker compose up --build
```

此命令将同时启动所有后端微服务和前端应用。

---

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_GATEWAY_URL` | `http://localhost:8000` | 后端 API 网关的基础 URL |

---

## CI/CD

GitHub Actions 工作流（位于后端仓库的 `.github/workflows/ci.yml`）在每次推送时执行以下检查：

1. `npm run lint` — ESLint，强制零警告
2. `tsc && npm run build` — TypeScript 编译 + Vite 生产构建
3. Docker 镜像冒烟测试
