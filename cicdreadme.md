# AI Writing Platform — 前端 CI/CD 说明

本文档描述 **ai-writing-platform-frontend** 仓库的持续集成（CI）与持续交付/部署（CD）实践，供项目报告与运维参考。内容基于仓库内实际配置文件整理。

---

## 1. 总览

| 维度 | 实现方式 |
|------|----------|
| 代码托管 | GitHub |
| CI 平台 | GitHub Actions（`.github/workflows/`） |
| 包管理 | npm + `package-lock.json`（CI 使用 `npm ci`） |
| 构建工具 | Vite 5 + TypeScript 5 |
| 生产运行时 | Nginx Alpine（容器内监听 **3000**） |
| 自动部署 | **无** — 仓库内未配置 push 后自动发布到环境的 CD 流水线；交付依赖 Docker 镜像构建与后端 `docker-compose` 编排 |

```
开发者提交代码
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  GitHub Actions（main 分支 push / PR）                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│  │ ESLint     │ │ Build Check│ │ SonarCloud │ │ Snyk    │ │
│  │ eslint.yaml│ │ build.yaml │ │sonarcube   │ │snyk.yaml│ │
│  └────────────┘ └────────────┘ └────────────┘ └─────────┘ │
└──────────────────────────────────────────────────────────┘
       │ 全部通过（合并策略由团队/分支保护决定）
       ▼
┌──────────────────────────────────────────────────────────┐
│  CD（手动 / 基础设施侧）                                  │
│  docker build → 镜像 → docker compose up（backend 仓库）  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. CI：触发条件与执行环境

所有工作流文件均位于 `.github/workflows/`：

| 工作流文件 | 显示名称 | 触发事件 |
|------------|----------|----------|
| `eslint.yaml` | ESLint | `push` → `main`；`pull_request` → `opened` / `synchronize` / `reopened` |
| `build.yaml` | Build Check | 同上 |
| `sonarcube.yaml` | SonarQube Scan | 同上 |
| `snyk.yaml` | Snyk Security | 同上 |

**运行器：** `ubuntu-latest`  
**Node.js 版本（CI）：** `22`（`actions/setup-node@v4`）  
**依赖安装：** `npm ci`（要求 lockfile 与 `package.json` 一致）

> **说明：** 本地 README 建议 Node 20+，Dockerfile 使用 `node:20-alpine`，而 CI 使用 Node 22。一般兼容，但若出现「仅 CI 失败」的构建问题，可优先对齐 Node 大版本。

---

## 3. CI 流水线详解

### 3.1 ESLint 静态检查（`eslint.yaml`）

**目的：** 在合并前保证 TypeScript/React 代码风格与静态规则一致。

| 步骤 | 命令 / 动作 |
|------|-------------|
| Checkout | `actions/checkout@v4` |
| 安装 Node | 22 |
| 安装依赖 | `npm ci` |
| 执行 Lint | `npm run lint` |

**本地等价命令：**

```bash
npm ci
npm run lint
```

**Lint 规则要点（`package.json` + `eslint.config.js`）：**

- 扫描目录：`src`
- 扩展名：`.ts`、`.tsx`
- `--max-warnings 0`：**不允许任何 warning**，否则 CI 失败
- 使用 ESLint 10 扁平配置（`eslint.config.js`）
- 插件：`@typescript-eslint`、`react-hooks`、`react-refresh`
- 忽略：`dist`、`eslint.config.js`

---

### 3.2 构建与类型检查（`build.yaml`）

**目的：** 验证 TypeScript 类型与 Vite 生产构建能否成功产出 `dist/`。

| 步骤 | 命令 / 动作 |
|------|-------------|
| Checkout | `actions/checkout@v4` |
| 安装 Node | 22，`cache: npm` |
| 安装依赖 | `npm ci` |
| 类型检查 | `npm run typecheck` → `tsc --noEmit` |
| 生产构建 | `npm run build` → `npx tsc && vite build` |

**本地等价命令：**

```bash
npm ci
npm run typecheck
npm run build
```

**构建产物：** `dist/`（由 Nginx 在容器中托管）

**TypeScript 配置摘要（`tsconfig.json`）：**

- `strict: true`
- `include`: `src`、`vite.config.ts`
- 路径别名：`@/*` → `./src/*`

---

### 3.3 SonarCloud 代码质量扫描（`sonarcube.yaml`）

**目的：** 在 SonarCloud 上进行静态分析、技术债与代码异味检测。

| 步骤 | 说明 |
|------|------|
| Checkout | `fetch-depth: 0`（完整 Git 历史，便于 Sonar 分析） |
| 扫描 | `SonarSource/sonarcloud-github-action@master` |

**Sonar 参数（workflow `args`）：**

| 参数 | 值 |
|------|-----|
| `sonar.projectKey` | `ai-writing-grading` |
| `sonar.organization` | `ai-writing-grading` |
| `sonar.sources` | `src` |
| `sonar.exclusions` | `**/*.test.tsx`, `**/*.spec.tsx`, `src/routeTree.gen.ts` |

**所需 Secrets：**

| Secret | 用途 |
|--------|------|
| `SONAR_TOKEN` | SonarCloud 项目令牌（需在 GitHub 仓库 Settings → Secrets 配置） |
| `GITHUB_TOKEN` | 由 Actions 自动注入，供 Sonar 与 GitHub 集成 |

> 仓库根目录**无** `sonar-project.properties`；扫描参数完全由 workflow 内联 `args` 提供。

---

### 3.4 Snyk 依赖安全扫描（`snyk.yaml`）

**目的：** 检测 `npm` 依赖中的已知漏洞。

| 步骤 | 说明 |
|------|------|
| 安装 Node | 22 |
| 安装依赖 | `npm ci` |
| 安全扫描 | `snyk/actions/node@master`，`--severity-threshold=high` |

**行为说明：**

- 仅当存在 **high** 及以上严重级别漏洞时，步骤会失败（由 `args` 控制）
- 需要配置 `SNYK_TOKEN`（Snyk 账号 → Organization/API Token → 写入 GitHub Secrets）

**本地等价（需安装 Snyk CLI 并登录）：**

```bash
npm ci
snyk test --severity-threshold=high
```

---

## 4. CI 质量门禁汇总

| 门禁项 | 工具 | 失败条件（典型） |
|--------|------|------------------|
| 代码规范 | ESLint | 任何 error 或 warning（`max-warnings 0`） |
| 类型安全 | `tsc --noEmit` | 类型错误 |
| 可构建性 | Vite build | 编译/打包错误 |
| 代码质量 | SonarCloud | 质量门禁未通过（取决于 SonarCloud 项目策略） |
| 依赖安全 | Snyk | High+ 漏洞 |

**并行关系：** 四个 workflow 相互独立，在同一触发条件下**并行**运行；任一流水线失败即在该 workflow 上显示失败状态。是否在 PR 上**强制**全部通过，取决于 GitHub 分支保护规则（Branch protection rules），需在仓库设置中单独配置。

**当前仓库未包含的 CI 项：**

- 单元测试 / E2E 测试（`package.json` 无 `test` 脚本）
- Docker 镜像构建冒烟测试（主 README 曾提及后端 `ci.yml`，**本前端仓库 workflow 中无 Docker build 步骤**）

---

## 5. CD：构建与部署

前端 CD 为**镜像化静态资源部署**，无 Kubernetes/云平台专用 manifest；与后端通过 Docker Compose 联调。

### 5.1 Docker 多阶段构建（`Dockerfile`）

| 阶段 | 基础镜像 | 作用 |
|------|----------|------|
| `deps` | `node:20-alpine` | `npm ci` 安装依赖（registry：`https://registry.npmmirror.com`） |
| `builder` | `node:20-alpine` | `npm run build`，注入 `VITE_API_GATEWAY_URL` |
| `runner` | `nginx:alpine` | 拷贝 `dist/` 与 `nginx.conf`，暴露 3000 |

**构建参数：**

```dockerfile
ARG VITE_API_GATEWAY_URL=http://localhost:8000
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
```

> **重要：** `VITE_*` 变量在 **构建时** 由 Vite 写入打包产物，运行时改环境变量**不会**自动生效，除非重新 build 或使用运行时配置方案。

**独立构建与运行：**

```bash
docker build -t ai-writing-frontend \
  --build-arg VITE_API_GATEWAY_URL=http://<gateway-host>:8000 \
  .

docker run -p 3000:3000 ai-writing-frontend
```

### 5.2 Nginx 配置（`nginx.conf`）

- 监听端口：**3000**
- 根目录：`/usr/share/nginx/html`
- SPA 路由：`try_files $uri $uri/ /index.html`

### 5.3 全栈 Compose 部署（推荐）

前端服务定义在**后端仓库**：

`ai-writing-platform-backend/infrastructure/docker-compose.yml`

```yaml
frontend:
  build:
    context: ../../ai-writing-platform-frontend
    dockerfile: Dockerfile
    args:
      - VITE_API_GATEWAY_URL=http://localhost:8000
  ports:
    - "3000:3000"
  depends_on:
    - api_gateway
```

**部署步骤：**

```bash
cd ../ai-writing-platform-backend/infrastructure
cp .env.example .env   # 填写密钥与连接串
docker compose up --build
```

**服务依赖：** `frontend` → `api_gateway`（同 compose 网络 `platform_net`）  
**API 网关 CORS：** 后端 gateway 配置 `CORS_ORIGINS=http://localhost:3000`，与前端端口一致。

### 5.4 环境变量

| 变量 | 阶段 | 默认值 | 说明 |
|------|------|--------|------|
| `VITE_API_GATEWAY_URL` | 构建时（Vite） | `http://localhost:8000` | 浏览器访问的后端 API 基址 |
| 本地开发 | `.env.local` | 见 `.env.local.example` | `npm run dev` 时加载 |

开发服务器（`vite.config.ts`）另将 `/auth`、`/api` 代理到 `http://localhost:8000`，便于本地联调。

---

## 6. 密钥与仓库配置清单

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中需配置：

| Secret 名称 | 使用工作流 | 说明 |
|-------------|------------|------|
| `SONAR_TOKEN` | `sonarcube.yaml` | SonarCloud 分析令牌 |
| `SNYK_TOKEN` | `snyk.yaml` | Snyk API 令牌 |
| `GITHUB_TOKEN` | SonarCloud | 自动提供，一般无需手动创建 |

可选增强（团队自行添加，当前仓库**未**实现）：

- `DOCKER_REGISTRY_*` — 推送镜像到 GHCR/ECR 等
- 部署专用 SSH/Kubeconfig — 自动 `docker compose pull && up`

---

## 7. 开发者工作流（与 CI 对齐）

推荐在提交 PR 前本地执行与 CI 相同的检查：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

开发常用命令：

| 命令 | 用途 |
|------|------|
| `npm run dev` | Vite 开发服务器（默认 `http://localhost:5173`） |
| `npm run preview` | 本地预览 `dist/` 生产构建 |
| `npm run lint` | 与 CI 一致的 ESLint |
| `npm run build` | 与 CI 一致的生产构建 |

---

## 8. 流水线文件索引

```
.github/workflows/
├── build.yaml      # 类型检查 + Vite 构建
├── eslint.yaml     # ESLint（零 warning）
├── sonarcube.yaml  # SonarCloud 静态分析
└── snyk.yaml       # 依赖漏洞扫描（high+）

Dockerfile            # 生产镜像
nginx.conf            # SPA + 端口 3000
package.json          # scripts：lint / typecheck / build
eslint.config.js      # ESLint 扁平配置
tsconfig.json         # TypeScript 严格模式
.env.local.example    # 本地环境变量模板
```

---

## 9. 与主 README 的差异说明

主仓库 `README.md` / `README_CN.md` 的 CI/CD 小节提到：

- 后端仓库的 `.github/workflows/ci.yml`
- Docker 镜像冒烟测试

**以本仓库为准的实际情况：**

- CI 定义在**本前端仓库**的四个独立 workflow 中，而非单一 `ci.yml`
- **没有**在 Actions 中自动执行 `docker build` 的步骤
- **没有** push 到 `main` 后自动部署到生产环境的 workflow

撰写项目报告时，建议以本文档（`cicdreadme.md`）及 `.github/workflows/*.yaml` 为准。

---

## 10. 扩展建议（可选）

若需完善 CD 或加固 CI，可考虑：

1. **合并 CI workflow** — 单 job 顺序执行 lint → typecheck → build，减少重复 `npm ci`
2. **增加 Docker CI job** — `docker build` 验证 Dockerfile 与构建参数
3. **统一 Node 版本** — CI、Dockerfile、文档均固定同一 LTS（如 22）
4. **添加测试阶段** — 引入 Vitest/Playwright 后在 workflow 中增加 `npm test`
5. **CD 自动化** — main 合并后构建并推送镜像，或由 compose/stack 自动滚动更新
6. **Dependabot** — `.github/dependabot.yml` 自动提依赖安全 PR

---

## 11. 故障排查速查

| 现象 | 可能原因 | 处理方向 |
|------|----------|----------|
| ESLint CI 失败 | warning 被计为失败 | 本地 `npm run lint`，消除全部 warning |
| Build 失败 | TS 类型或 Vite 插件错误 | `npm run typecheck` 与 `npm run build` 分步执行 |
| Sonar 失败 | `SONAR_TOKEN` 无效或质量门禁 | 检查 Secret；登录 SonarCloud 查看具体 issue |
| Snyk 失败 | High 漏洞 | `snyk test` 查看依赖树；升级或忽略（需团队策略） |
| 容器内 API 404 | `VITE_API_GATEWAY_URL` 构建时错误 | 使用 `--build-arg` 重新 build |
| 路由刷新 404 | 未走 Nginx SPA 回退 | 确认使用项目 `nginx.conf` 且 `try_files` 生效 |

---

*文档版本：与仓库 workflow 及 Dockerfile 同步整理。最后更新依据：`.github/workflows/` 下 build、eslint、sonarcube、snyk 四个 YAML 及根目录 Docker/构建配置。*
