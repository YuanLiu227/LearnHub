# LearnHub — 多源学习内容搜索平台

> 关键词驱动的多源学习资源聚合工具。支持关键词搜索 + 博主关注自动收集，跨 Bilibili、YouTube、编程导航等多个数据源，帮助开发者高效发现和整理高质量学习内容。提供独立的管理后台。

---

## 目录

- [功能特性](#功能特性)
- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [数据源](#数据源)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [使用指南](#使用指南)
- [管理后台](#管理后台)
- [项目结构](#项目结构)
- [API 接口](#api-接口)
- [评分体系](#评分体系)
- [部署](#部署)

---

## 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| **关键词管理** | 添加关键词，灵活启用/暂停/归档/恢复/永久删除 |
| **博主关注** | 关注 Bilibili UP 主或 YouTube 频道，自动收集最新内容 |
| **视频 URL 提交** | 直接粘贴 Bilibili/YouTube 视频链接，自动提取信息并入库 |
| **多源搜索** | 一次触发，跨 Bilibili、YouTube、编程导航、鱼皮AI导航统一检索 |
| **AI 内容处理** | 基于 DeepSeek V4 Flash 进行内容摘要、质量评估、真实性校验 |
| **资源管理** | 收藏/取消收藏、标记完成、单条删除、多选批量删除、一键清空，支持关键词/博主/视频三种资源分类 |
| **知识搜索** | 对已存储的所有学习资源进行全文检索 |
| **关键词总览** | 全局查看所有关键词和博主（含已归档），支持恢复 |

### 用户系统

- **邮箱注册** — 使用邮箱作为账号，注册时发送验证码到邮箱验证
- **两步验证** — 图形验证码（防机器人）+ 邮箱验证码（6 位，10 分钟有效期）
- **密码安全** — 密码需包含字母、数字、特殊字符中的至少两种
- **JWT 认证** — 7 天过期，页面刷新自动恢复会话
- **数据隔离** — 每个用户独立管理自己的关键词、博主和资源

### 管理后台

- **独立地址** — 访问 `http://localhost:3001/admin` 进入，与主前端完全分离
- **管理员登录** — 使用管理员账号（邮箱匹配 SMTP_USER）登录
- **用户管理** — 用户列表、冻结/解冻、删除（含安全防护）
- **系统设置** — 注册开关，关闭后新用户无法注册

### 数据管理

- **两级删除**：归档（软删除，保留关联资源）和永久删除（级联清理关联资源）
- **批量操作**：通过选择模式勾选多条资源后批量删除
- **收藏管理**：收藏的资源独立展示，关联实体删除时自动级联清理
- **通知面板**：搜索完成后弹出通知，展示新增资源条目

### 异步任务

- **关键词搜索**：一键触发全量关键词跨源搜索，轮询实时进度
- **博主内容收集**：独立于关键词搜索，收集关注博主的最新内容
- **定时任务**：每天 08:00 自动执行博主内容收集

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  主前端 (localhost:5173)                 管理后台 (localhost:3001/admin)  │
│  React 19 + Vite + Tailwind             独立 HTML/CSS/JS 单页面         │
│  Zustand 状态管理 + Axios                fetch 直接调用 API              │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │ HTTP (REST API) — JWT 认证（含 role）
┌──────────────────────┴──────────────────────────────────────────────────┐
│                   Express 5 + TypeScript                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 认证  │ │ 关键词 │ │ 博主  │ │ 视频  │ │ 仪表盘│ │ AI  │ │ 管理  │       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
│            ┌──────────────────────────────────────┐                     │
│            │ Bilibili / YouTube / 编程导航 / DeepSeek │                     │
│            └──────────────────────────────────────┘                     │
│                           │                                              │
│                      ┌────┴────┐                                         │
│                      │ SQLite  │ (node:sqlite, WAL)                     │
│                      └─────────┘                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 4 |
| **状态管理** | Zustand 5 |
| **动画** | motion (motion/react) |
| **图标** | lucide-react |
| **后端** | Node.js + Express 5 + TypeScript（tsx 运行时） |
| **数据库** | SQLite（node:sqlite，Node.js 内置，WAL 模式） |
| **认证** | bcryptjs + jsonwebtoken（JWT，7 天过期） |
| **AI 服务** | DeepSeek V4 Flash API |
| **邮件** | nodemailer（SMTP，支持 QQ/163/Brevo/Resend） |
| **定时任务** | node-cron |
| **HTTP 客户端** | axios（前后端通用） |
| **包管理** | npm workspaces（client/ + server/） |
| **MCP** | Firecrawl MCP + Context7 MCP |
| **管理后台** | 独立 HTML/CSS/JS 单页面（无构建工具依赖） |

---

## 数据源

| 数据源 | 内容类型 | 是否需要密钥 | 关键词搜索 | 博主关注 |
|--------|----------|-------------|-----------|---------|
| Bilibili | 视频教程 | ❌ 免费 | ✅（有质量阈值） | ✅（无阈值，空间 API + 搜索回退） |
| YouTube | 视频教程 | ✅ API Key | ✅（有质量阈值） | ✅（无阈值，Search API） |
| 编程导航 (codefather.cn) | 技术文章/教程 | ❌ 免费 |
| 鱼皮AI导航 (ai.codefather.cn) | AI 课程/教程 | ❌ 免费 |

> **关键词搜索**：Bilibili 和 YouTube 搜索结果经过质量阈值筛选（最低播放量/点赞数），确保内容质量。
>
> **博主内容收集**：关注博主的内容收集不设质量阈值，仅按时间范围（最近 7 天）收集，确保不遗漏最新内容。

---

## 快速开始

### 前置要求

- Node.js >= 20（推荐 v24 以使用内置 node:sqlite）
- npm >= 9

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd LearnHub
npm install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，至少配置以下内容。

**必需环境变量：**

```env
DEEPSEK_API_KEY=sk-your-deepseek-api-key
JWT_SECRET=your-random-jwt-secret
```

**如需管理后台，配置 SMTP（SMTP_USER 邮箱自动成为管理员）：**

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-auth-code
SMTP_FROM=YourName <your-email@qq.com>
```

### 3. 启动服务

```bash
npm run dev
```

该命令会同时启动：
- **前端开发服务器** → http://localhost:5173
- **后端 API 服务** → http://localhost:3001
- **管理后台** → http://localhost:3001/admin

### 4. 注册账号

1. 打开浏览器访问 http://localhost:5173
2. 点击"没有账号？去注册"
3. 输入邮箱和密码（需包含字母、数字、特殊字符中的至少两种）
4. 输入图形验证码，点击"发送验证码"
5. 查收邮箱中的验证码并填入（开发模式可在控制台查看验证码）
6. 点击"确认注册"完成注册

> ⚠️ 如果 SMTP_USER 配置为 `your-email@qq.com`，则该邮箱注册时自动成为管理员，可登录管理后台。

### 5. 开始使用

注册并登录后：
1. 进入「关键词」标签页，添加感兴趣的关键词（如 "React"、"机器学习"）
2. 点击右上角「关键词搜索」按钮触发搜索
3. 等待搜索完成，在「资源总览」中查看结果
4. 收藏感兴趣的资源或标记已完成

---

## 环境变量配置

### 必需配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥，用于 AI 摘要和质量评估 | — |
| `JWT_SECRET` | JWT 签名密钥，用于用户认证令牌签发 | — |

### 数据源配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 密钥 | — |
| `YOUTUBE_PROXY_URL` | YouTube API 代理地址（国内需要） | — |
| `BILIBILI_MIN_VIEWS` | Bilibili 搜索最低播放量 | 5000 |
| `BILIBILI_MIN_LIKES` | Bilibili 搜索最低点赞数 | 200 |
| `BILIBILI_MIN_FAVORITES` | Bilibili 搜索最低收藏数 | 100 |
| `YOUTUBE_MIN_VIEWS` | YouTube 搜索最低播放量 | 10000 |
| `YOUTUBE_MIN_LIKES` | YouTube 搜索最低点赞数 | 500 |

### 邮件配置（可选，同时决定管理员账号）

SMTP 配置用于发送注册验证码。**SMTP_USER 邮箱对应的注册账号自动成为管理员，可访问管理后台。**

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SMTP_HOST` | SMTP 服务器地址 | smtp.gmail.com |
| `SMTP_PORT` | SMTP 端口 | 587 |
| `SMTP_USER` | SMTP 用户名（**此邮箱注册时自动成为管理员**） | — |
| `SMTP_PASS` | SMTP 密码/应用密码 | — |
| `SMTP_FROM` | 发件人地址，格式 `Name <email>` | — |

### MCP 配置

| 变量 | 说明 |
|------|------|
| `FIRECRAWL_API_KEY` | Firecrawl API 密钥，用于网页智能抓取 |
| `UPSTASH_CONTEXT7_API_KEY` | Context7 API 密钥，用于获取最新技术文档 |

### 数据源开关

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENABLE_CODENAV` | 启用编程导航 | true |
| `ENABLE_AI_CODEFATHER` | 启用鱼皮AI导航 | true |

### 服务器配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | API 服务端口 | 3001 |
| `DB_PATH` | 数据库文件路径 | server/data/hot-monitor.db |

---

## 使用指南

### 关键词搜索

1. 进入「关键词」标签页
2. 在输入框中输入关键词（如 "React"、"TypeScript"），点击「添加」
3. 可随时启用/暂停关键词（开关按钮）
4. 点击右上角「关键词搜索」按钮触发全量搜索
5. 搜索进度实时显示，完成后自动刷新资源列表

### 关注博主

1. 进入「关键词」标签页，切换到「关注的博主」子标签
2. 选择平台（Bilibili / YouTube），输入 UP 主名称或频道 ID
3. 系统自动解析博主信息并添加到关注列表
4. 点击右上角「博主搜索」按钮手动触发内容收集
5. 系统每天早上 08:00 自动收集一次最新内容

### 资源管理

- **收藏**：点击资源卡片上的 ⭐ 图标收藏，收藏后从总览移至「收藏资源」
- **标记完成**：点击 ✓ 图标标记已完成（绿色边框 + 删除线样式）
- **删除**：点击 🗑 图标 → 确认删除
- **批量操作**：点击「选择」进入选择模式 → 勾选目标资源 → 「批量删除」
- **清空**：一键删除当前分类（关键词/博主/视频资源）下的所有资源

### 提交视频 URL

1. 进入「关键词」标签页，切换到「添加视频」子标签
2. 选择平台（Bilibili / YouTube）
3. 粘贴视频 URL 到输入框
4. 点击「获取视频」按钮
5. 系统自动提取视频信息并存入资源库
6. 切换到「资源总览」的视频子标签查看添加的视频资源

### 关键词总览

进入「关键词总览」标签页可以：
- 查看所有已添加的关键词（含已归档）
- 恢复已归档的关键词
- 永久删除关键词（同时删除关联的所有资源）
- 查看已归档的博主列表

### 知识搜索

进入「知识搜索」标签页，输入关键词搜索已存储的所有学习资源。搜索结果支持分页浏览。

---

## 管理后台

管理后台是一个独立的 HTML 页面，由后端 Express 静态提供，与主前端 SPA 完全分离。

### 访问地址

```
http://localhost:3001/admin
```

### 管理员账号

管理员账号通过 SMTP 配置自动分配：

1. 设置环境变量 `SMTP_USER`（如 `your-email@qq.com`）
2. 使用该邮箱在 http://localhost:5173 注册
3. 系统自动将该账号角色设为 `admin`
4. 使用该账号在管理后台登录

### 管理功能

| 功能 | 说明 |
|------|------|
| **用户列表** | 分页展示所有用户，含邮箱、角色、状态、注册时间 |
| **冻结/解冻** | 冻结后用户无法登录（不能冻结自己和其它管理员） |
| **删除用户** | 级联删除关联数据（不能删除自己，不能删最后一名管理员） |
| **注册开关** | 关闭后新用户无法注册，所有注册入口返回友好提示 |

---

## 项目结构

```
LearnHub/
├── client/                          # 前端 (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── auth/                # 认证相关组件
│       │   │   └── PasswordStrength.tsx    # 密码强度指示器
│       │   ├── creator-manager/     # 博主管理组件
│       │   │   └── CreatorView.tsx
│       │   ├── keyword-manager/     # 关键词管理组件
│       │   │   ├── KeywordForm.tsx
│       │   │   └── KeywordList.tsx
│       │   └── ui/                  # 基础 UI 组件库
│       ├── pages/
│       │   ├── Home.tsx             # 主应用页面
│       │   └── LoginPage.tsx        # 登录/注册页面
│       ├── services/
│       │   └── api.ts               # Axios API 客户端
│       ├── stores/
│       │   └── appStore.ts          # Zustand 全局状态
│       ├── types/
│       │   └── index.ts             # 类型定义
│       ├── index.css                # Tailwind 主题 + 全局样式
│       ├── App.tsx                  # 根组件（路由控制：登录页 vs 主页）
│       └── main.tsx                 # 入口
├── server/                          # 后端 (Express + TypeScript)
│   ├── public/
│   │   └── admin/
│   │       └── index.html           # 管理后台独立页面
│   └── src/
│       ├── routes/
│       │   ├── auth.ts              # 用户认证（登录/注册/验证码）
│       │   ├── keywords.ts          # 关键词 CRUD
│       │   ├── creators.ts          # 博主关注 + 内容收集
│       │   ├── monitor.ts           # 关键词搜索触发 + 进度
│       │   ├── videos.ts            # 视频 URL 提交 + 列表
│       │   ├── dashboard.ts         # 数据统计 + 资源管理
│       │   ├── admin.ts             # 管理后台 API
│       │   ├── config.ts            # 应用配置
│       │   ├── ai.ts                # AI 聊天 + 真实性校验
│       │   └── docs.ts              # 技术文档查询（Context7）
│       ├── services/
│       │   ├── deepseek.ts          # DeepSeek V4 Flash 客户端
│       │   ├── captcha.ts           # SVG 图形验证码
│       │   ├── verification.ts      # 邮箱验证码服务
│       │   ├── creator-collector.ts # 博主内容收集器
│       │   ├── bilibili-api.ts      # Bilibili API 适配器
│       │   ├── youtube-api.ts       # YouTube Data API v3 适配器
│       │   ├── codefather-api.ts    # 编程导航抓取
│       │   ├── ai-codefather-api.ts # 鱼皮AI导航抓取
│       │   ├── scoring.ts           # 综合评分引擎
│       │   ├── dedup.ts             # Bigram Jaccard 去重算法
│       │   ├── progress.ts          # 异步进度管理（ProgressEmitter）
│       │   └── context7-mcp.ts      # Context7 MCP 集成
│       ├── middleware/
│       │   └── auth.ts              # JWT 认证中间件 + adminRequired
│       ├── db/
│       │   └── sqlite.ts            # 数据库连接（node:sqlite）+ Schema + 迁移
│       ├── types/
│       │   └── index.ts             # 类型定义
│       └── index.ts                 # 服务入口
├── docs/                            # 项目文档
│   ├── 需求文档.md                   # 需求文档（含管理后台）
│   ├── 项目总结.md                   # 项目总结（含架构演进）
│   ├── CONFIG.md                    # 配置指南
│   └── SPEC.md                      # 技术规格
└── package.json                     # npm workspaces 根配置
```

---

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/captcha` | 获取图形验证码（SVG） |
| POST | `/api/auth/register` | 注册第一步：提交邮箱+密码+图形验证码，发送邮箱验证码 |
| POST | `/api/auth/register/verify` | 注册第二步：提交邮箱验证码，完成注册 |
| POST | `/api/auth/login` | 邮箱+密码+图形验证码登录 |
| POST | `/api/auth/resend-code` | 重新发送邮箱验证码 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 关键词

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keywords` | 获取活跃关键词列表 |
| GET | `/api/keywords/all` | 获取全部关键词（含已归档） |
| POST | `/api/keywords` | 添加关键词 |
| POST | `/api/keywords/archive` | 归档关键词（软删除） |
| POST | `/api/keywords/restore` | 恢复已归档关键词 |
| DELETE | `/api/keywords/permanent` | 永久删除关键词（含关联资源） |
| PATCH | `/api/keywords` | 更新关键词（启用/暂停） |

### 博主关注

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/creators` | 获取活跃博主列表 |
| GET | `/api/creators/all` | 获取全部博主（含已归档） |
| POST | `/api/creators` | 添加博主（按名称/频道搜索） |
| PATCH | `/api/creators/:id` | 更新博主（启用/暂停） |
| DELETE | `/api/creators/:id` | 归档博主（软删除） |
| POST | `/api/creators/restore/:id` | 恢复已归档博主 |
| DELETE | `/api/creators/permanent/:id` | 永久删除博主（含关联资源） |
| POST | `/api/creators/collect` | 触发博主内容收集（异步） |
| GET | `/api/creators/collect/progress/:id` | 查询收集进度 |

### 视频 URL 提交

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/videos/submit` | 提交视频 URL（Bilibili/YouTube），自动提取信息后存入资源库 |
| GET | `/api/videos` | 获取当前用户的视频资源列表（分页） |

### 搜索监控

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/monitor` | 触发全量关键词搜索（异步） |
| GET | `/api/monitor/progress/:id` | 查询搜索进度 |
| GET | `/api/monitor/history` | 获取历史搜索结果（可选按关键词筛选） |

### 数据统计与资源管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 获取统计概览 |
| GET | `/api/dashboard/hotspots` | 获取资源列表（分页，可选按来源筛选） |
| GET | `/api/dashboard/search` | 全文搜索已存储资源 |
| GET | `/api/dashboard/favorites` | 获取收藏资源列表（分页） |
| PATCH | `/api/dashboard/resource/:id` | 更新资源（收藏/取消收藏/标记完成） |
| DELETE | `/api/dashboard/resource/:id` | 删除单个资源 |
| POST | `/api/dashboard/resources/batch-delete` | 按类型批量清空（关键词/博主/视频资源） |
| POST | `/api/dashboard/resources/batch-delete-by-ids` | 按 ID 批量删除 |

### 管理后台

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 获取用户列表（分页，需 admin 权限） |
| DELETE | `/api/admin/users/:id` | 删除用户（需 admin 权限） |
| PATCH | `/api/admin/users/:id/freeze` | 冻结用户（需 admin 权限） |
| PATCH | `/api/admin/users/:id/unfreeze` | 解冻用户（需 admin 权限） |
| GET | `/api/admin/settings` | 获取系统设置 |
| PUT | `/api/admin/settings` | 更新系统设置 |

### AI

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 对话（基于 DeepSeek V4 Flash） |
| POST | `/api/ai/veracity` | 内容真实性校验 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取应用配置 |
| PUT | `/api/config` | 更新应用配置 |
| GET | `/api/docs/tech` | 获取技术文档（Context7） |
| POST | `/api/docs/query` | 查询技术文档（Context7） |
| GET | `/api/health` | 健康检查 |
| GET | `/api/test-env` | 测试环境变量加载 |
| GET | `/api/test-veracity` | 测试 AI 真实性校验 |

---

## 评分体系

关键词搜索结果的综合评分公式：

```
综合分 = 热度 × 0.4 + 来源可信度 × 0.3 + 时效性 × 0.2 + 内容类型 × 0.1
```

| 维度 | 权重 | 说明 |
|------|------|------|
| 热度 | 0.4 | 基于播放量/点赞数等指标归一化 |
| 来源可信度 | 0.3 | 编程导航=0.9, 鱼皮AI导航=0.9, YouTube=0.8, Bilibili=0.6 |
| 时效性 | 0.2 | 7 天内=1.0, 30 天内=0.7, 90 天内=0.4, 更早=0.2 |
| 内容类型 | 0.1 | AI 课程=0.9, 教程文章=0.8, 视频=0.7 |

### 去重机制

跨来源内容去重采用 Bigram Jaccard 相似度算法：
- **标题相似度阈值**：0.75
- **来源相似度阈值**：0.6
- 检测到重复时，保留来源可信度更高的条目

### 来源信用评级

| 来源 | 可信度 | 说明 |
|------|--------|------|
| 编程导航 | 0.9 | 人工筛选的技术文章，质量最高 |
| 鱼皮AI导航 | 0.9 | 人工筛选的 AI 课程，质量最高 |
| YouTube | 0.8 | 国际视频教程，质量高 |
| Bilibili | 0.6 | 视频教程，覆盖面广 |

---

## 部署

### 生产构建

```bash
# 构建前端
cd client && npm run build

# 构建后端
cd server && npm run build
```

构建产物分别在 `client/dist/` 和 `server/dist/`。

### 生产运行

```bash
cd server
node dist/index.js
```

管理后台页面由 Express 自动在 `/admin` 路由下提供，无需额外部署。

### 推荐平台

由于使用 SQLite，需要长时运行环境：
- **Zeabur** — 支持国内用户，免费额度足够
- **Railway** / **Render** — 国际平台，免费额度
- **VPS + PM2** — 自托管方案

### 数据库

SQLite 数据库文件位于 `server/data/` 目录，默认为 `hot-monitor.db`。可通过 `DB_PATH` 环境变量自定义路径。使用 WAL 模式，支持并发读取。定期备份 `.db` 文件即可完成数据备份。

---

## License

MIT
