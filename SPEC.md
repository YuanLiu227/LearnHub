# LearnHub — 技术规格文档

> 关键词驱动的多源学习资源搜索平台，支持博主内容自动收集、多用户数据隔离、AI 内容处理。

---

## 一、需求概述

### 1.1 项目定位

LearnHub 是一个关键词驱动的多源学习资源搜索平台，支持博主内容自动收集，帮助开发者从多个技术平台快速检索和发现高质量学习内容。

### 1.2 核心功能

| 功能 | 描述 |
|------|------|
| **多源聚合搜索** | 一次搜索覆盖 Bilibili、YouTube、编程导航、鱼皮AI导航 |
| **博主追踪** | 关注 UP 主/频道，自动收集最新内容（仅按时间筛选） |
| **资源管理** | 收藏、完成标记、归档/恢复、选择式批量删除、一键清空 |
| **数据隔离** | 多用户系统，每个用户独立管理自己的数据 |

---

## 二、技术栈

### 2.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| Vite | 6.x | 构建工具 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化样式 |
| Zustand | 5.x | 状态管理 |
| motion | 12.x | 动画 |
| lucide-react | latest | 图标库 |
| axios | latest | HTTP 客户端 |

### 2.2 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | >=20 (推荐 v24) | 运行时 |
| Express | 5.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| tsx | latest | TypeScript 执行（开发模式） |
| node:sqlite | 内置 (v24+) | SQLite 数据库 |
| bcryptjs | 3.x | 密码哈希 |
| jsonwebtoken | 9.x | JWT 签发与验证 |
| nodemailer | 6.x | 邮件发送 |
| node-cron | 4.x | 定时任务 |
| axios | latest | HTTP 客户端 |

### 2.3 AI 服务

| 服务 | 用途 |
|------|------|
| DeepSeek V4 Flash | 内容摘要、质量评估、真实性校验 |

### 2.4 MCP 服务

| 服务 | 用途 |
|------|------|
| Firecrawl | 网页智能抓取与搜索 |
| Context7 | 获取最新技术文档 |

---

## 三、系统架构

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              React + Vite 前端                       │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │     │
│  │  │资源总览  │ │  关键词  │ │关键词总览│ │收藏资源│ │     │
│  │  │ + 博主   │ │  + 博主  │ │ + 博主   │ │        │ │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │     │
│  │  ┌──────────┐ ┌──────────┐                          │     │
│  │  │知识搜索  │ │通知面板  │                          │     │
│  │  └──────────┘ └──────────┘                          │     │
│  └─────────────────────────────────────────────────────┘     │
│                            │                                  │
│                     HTTP REST (JWT)                           │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     Express 5 后端                           │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                    API Routes                       │     │
│  │  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐  │     │
│  │  │Auth  │ │Keywords│ │Creators│ │Monitor│ │Dash  │  │     │
│  │  │      │ │        │ │        │ │       │ │board │  │     │
│  │  └──────┘ └────────┘ └────────┘ └───────┘ └──────┘  │     │
│  │  ┌──────┐ ┌────────┐ ┌────────┐                     │     │
│  │  │AI    │ │ Config │ │  Docs  │                     │     │
│  │  └──────┘ └────────┘ └────────┘                     │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                    Services                           │     │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     │
│  │  │DeepSeek│ │ Captcha  │ │Verificat-│ │Creator-  │  │     │
│  │  │Client  │ │ (SVG)    │ │ion       │ │Collector │  │     │
│  │  └────────┘ └──────────┘ └──────────┘ └──────────┘  │     │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     │
│  │  │Bilibili│ │ YouTube  │ │Codefather│ │Scoring   │  │     │
│  │  │API     │ │ API      │ │ API      │ │+ Dedup   │  │     │
│  │  └────────┘ └──────────┘ └──────────┘ └──────────┘  │     │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐               │     │
│  │  │Progress│ │ Notifier │ │Context7  │               │     │
│  │  │Emitter │ │ (Email)  │ │ MCP      │               │     │
│  │  └────────┘ └──────────┘ └──────────┘               │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │           SQLite (node:sqlite, WAL 模式)              │     │
│  │  users | verification_codes | keywords | news_items   │     │
│  │  hot_topics | followed_creators | config              │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 页面结构

应用为两页面 SPA，由 `App.tsx` 根据登录状态路由：

| 路由 | 页面 | 功能 |
|------|------|------|
| `/login` | LoginPage.tsx | 登录 + 注册（两步验证） |
| `/` | Home.tsx | 主应用（约 1200 行，含所有标签页） |

Home.tsx 包含以下标签页：
- **资源总览** — 展示关键词匹配和博主收集的所有资源，支持来源筛选、分页
- **关键词** — 关键词管理（CRUD + 启用/暂停） + 博主关注管理（子标签页）
- **关键词总览** — 查看所有关键词和博主（含已归档），支持恢复和永久删除
- **收藏资源** — 仅展示收藏的资源
- **知识搜索** — 全文搜索已有资源

### 3.3 组件结构

```
client/src/
├── pages/
│   ├── Home.tsx              # 主页面：标签页 + 通知面板 + 统计卡片
│   └── LoginPage.tsx         # 登录/注册：表单 + 图形验证码 + 密码强度
├── components/
│   ├── auth/
│   │   └── PasswordStrength.tsx   # 密码强度指示器
│   ├── creator-manager/
│   │   └── CreatorView.tsx        # 博主关注表单 + 列表
│   ├── keyword-manager/
│   │   ├── KeywordForm.tsx        # 关键词添加表单
│   │   └── KeywordList.tsx        # 关键词列表 + 状态切换
│   ├── notification/              # 通知面板组件
│   └── ui/                        # 基础 UI 组件
├── stores/
│   └── appStore.ts         # Zustand：认证状态 + 资源数据 + 筛选条件
├── services/
│   └── api.ts              # axios 实例 + 拦截器（JWT 注入 + 401 处理）
└── types/
    └── index.ts            # 共享类型定义
```

---

## 四、数据模型

### 4.1 users（用户表）

```typescript
interface User {
  id: string;              // 格式：u_xxx
  email: string;           // 邮箱（唯一）
  password_hash: string;   // bcrypt 哈希（10 轮 salt）
  created_at: number;      // 创建时间戳
}
```

### 4.2 verification_codes（邮箱验证码表）

```typescript
interface VerificationCode {
  id: string;              // 格式：vc_timestamp_random
  email: string;           // 注册邮箱
  code: string;            // 6 位数字验证码
  type: string;            // 验证码类型，如 'register'
  expires_at: number;      // 过期时间戳（10 分钟）
  created_at: number;      // 创建时间戳
  used: number;            // 是否已使用（0/1）
}
```

### 4.3 keywords（关键词表）

```typescript
interface Keyword {
  id: string;              // 格式：kw_xxx
  term: string;            // 关键词，如 "React"
  scope: string;           // 范围，默认 "AI编程"
  enabled: number;         // 是否启用（0/1）
  archived: number;        // 是否归档（0/1）
  created_at: number;      // 创建时间戳
  last_matched_at?: number;// 最后匹配时间
  user_id?: string;        // 所属用户
}
```

### 4.4 news_items（学习资源表）

```typescript
interface NewsItem {
  id: string;              // 唯一标识
  keyword_id?: string;     // 关联的关键词 ID（可为空，博主收集时为空）
  title: string;           // 标题
  url: string;             // 原文链接
  source: string;          // 来源标识：bilibili/youtube/codenav/ai-codefather
  source_name: string;     // 来源显示名称
  published_at: number;    // 发布时间
  is_real: number;         // AI 识别真实性（0/1）
  confidence: number;      // AI 置信度（0-1）
  summary?: string;        // AI 生成的摘要
  matched_at: number;      // 匹配时间
  is_urgent: number;       // 是否紧急（0/1）
  heat: number;            // 热度分数
  creator_id?: string;     // 关联的博主 ID
  creator_name?: string;   // 博主名称
  completed: number;       // 是否已完成（0/1）
  favorited: number;       // 是否已收藏（0/1）
  user_id?: string;        // 所属用户
}
```

### 4.5 hot_topics（热点话题表）

```typescript
interface HotTopic {
  id: string;              // 唯一标识
  title: string;           // 标题
  url: string;             // 原文链接
  source: string;          // 来源标识
  source_name: string;     // 来源显示名称
  heat: number;            // 热度
  published_at: number;    // 发布时间
  scope: string;           // 所属范围
  summary?: string;        // 摘要
  fetched_at: number;      // 获取时间
}
```

### 4.6 followed_creators（关注博主表）

```typescript
interface FollowedCreator {
  id: string;              // 格式：fc_xxx
  platform: string;        // 平台：bilibili / youtube
  channel_id: string;      // 频道 ID / UP 主 ID
  channel_name: string;    // 频道名称
  description?: string;    // 描述
  avatar_url?: string;     // 头像 URL
  enabled: number;         // 是否启用（0/1）
  archived: number;        // 是否归档（0/1）
  created_at: number;      // 关注时间
  last_fetched_at?: number;// 最后收集时间
  user_id?: string;        // 所属用户
}
```

### 4.7 config（配置表）

```typescript
interface Config {
  key: string;             // 配置键
  value: string;           // 配置值
  user_id?: string;        // 所属用户（可为空，表示全局配置）
}
```

---

## 五、API 设计

### 5.1 认证模块

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/api/auth/captcha` | — | `{ captchaId, svg }` | 获取 SVG 图形验证码，captchaId 用于后续提交 |
| POST | `/api/auth/register` | `{ email, password, captchaId, captchaCode }` | `{ devCode?, message }` | Step 1：校验后发送邮箱验证码 |
| POST | `/api/auth/register/verify` | `{ email, code }` | `{ token, user }` | Step 2：验证邮箱验证码，完成注册 |
| POST | `/api/auth/login` | `{ email, password, captchaId, captchaCode }` | `{ token, user }` | 邮箱密码登录 |
| POST | `/api/auth/resend-code` | `{ email, captchaId, captchaCode }` | `{ devCode?, message }` | 重新发送验证码 |
| GET | `/api/auth/me` | — | `{ user }` | 获取当前登录用户信息 |

### 5.2 关键词模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keywords` | 获取活跃关键词列表（enabled=1, archived=0） |
| GET | `/api/keywords/all` | 获取全部关键词（含已归档） |
| POST | `/api/keywords` | 添加关键词 `{ term, scope? }` |
| POST | `/api/keywords/archive` | 归档关键词 `{ id }` |
| POST | `/api/keywords/restore` | 恢复关键词 `{ id }` |
| DELETE | `/api/keywords/permanent` | 永久删除 `{ id }`，含关联资源 |
| PATCH | `/api/keywords` | 更新状态（启用/暂停） `{ id, enabled }` |

### 5.3 博主关注模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/creators` | 获取活跃博主列表 |
| GET | `/api/creators/all` | 获取全部博主（含已归档） |
| POST | `/api/creators` | 添加博主 `{ platform, keyword }` |
| PATCH | `/api/creators/:id` | 更新博主状态 `{ enabled }` |
| DELETE | `/api/creators/:id` | 归档博主（软删除） |
| POST | `/api/creators/restore/:id` | 恢复已归档博主 |
| DELETE | `/api/creators/permanent/:id` | 永久删除博主（含关联资源） |
| POST | `/api/creators/collect` | 触发博主内容收集（异步），返回 `{ progressId }` |
| GET | `/api/creators/collect/progress/:id` | 查询收集进度 `{ stage, progress, total, message }` |

### 5.4 搜索监控模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/monitor` | 触发全量关键词搜索（异步），返回 `{ progressId }` |
| GET | `/api/monitor/progress/:id` | 查询搜索进度 `{ stage, progress, total, message }` |
| GET | `/api/monitor/history` | 获取历史搜索结果 `{ keyword_id? }` |

### 5.5 仪表盘 / 资源管理模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 统计概览：`{ totalResources, todayNew, activeKeywords }` |
| GET | `/api/dashboard/hotspots` | 资源列表：分页 `{ page, pageSize, source?, type? }`，返回 `{ items, total, page, pageSize }` |
| GET | `/api/dashboard/search` | 全文搜索 `{ keyword, page, pageSize }` |
| GET | `/api/dashboard/favorites` | 收藏资源列表 `{ page, pageSize }` |
| PATCH | `/api/dashboard/resource/:id` | 更新资源：`{ completed?, favorited? }` |
| DELETE | `/api/dashboard/resource/:id` | 删除单个资源 |
| POST | `/api/dashboard/resources/batch-delete` | 按类型批量清空 `{ type: 'keyword' \| 'creator' }` |
| POST | `/api/dashboard/resources/batch-delete-by-ids` | 按 ID 列表批量删除 `{ ids: string[] }` |

### 5.6 AI 模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 对话 `{ message }` → `{ reply }` |
| POST | `/api/ai/veracity` | 内容真实性校验 `{ title, content, source }` → `{ isReal, confidence, reason }` |

### 5.7 系统模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取应用配置 |
| PUT | `/api/config` | 更新应用配置 |
| GET | `/api/docs/tech` | 获取技术文档（Context7） |
| POST | `/api/docs/query` | 查询技术文档（Context7） |
| GET | `/api/health` | 健康检查 |
| GET | `/api/test-env` | 测试环境变量 |
| GET | `/api/test-veracity` | 测试 AI 真实性校验 |

---

## 六、数据流

### 6.1 用户注册流

```
[客户端]                    [服务端]                    [数据库/外部]
   │                          │                          │
   │  GET /captcha            │                          │
   │─────────────────────────>│  生成 SVG 验证码          │
   │<── { captchaId, svg } ───│  存入内存 Map            │
   │                          │                          │
   │  POST /register          │                          │
   │  { email, pwd, captcha } │                          │
   │─────────────────────────>│                          │
   │                          │  校验图形验证码            │
   │                          │  校验密码强度              │
   │                          │  检查邮箱唯一性            │
   │                          │  生成 6 位邮箱验证码       │
   │                          │─────────────────────────>│ INSERT verification_codes
   │                          │  SMTP 发送邮件 / devCode  │
   │<── { devCode?, msg } ────│                          │
   │                          │                          │
   │  POST /register/verify   │                          │
   │  { email, code }         │                          │
   │─────────────────────────>│                          │
   │                          │  校验邮箱验证码            │
   │                          │  bcrypt 哈希密码          │
   │                          │─────────────────────────>│ INSERT users
   │                          │  签发 JWT                 │
   │<── { token, user } ──────│                          │
```

### 6.2 关键词搜索流

```
[客户端]                    [服务端]                    [外部 API]
   │                          │                          │
   │  POST /monitor           │                          │
   │─────────────────────────>│  创建 ProgressEmitter     │
   │<── { progressId } ───────│                          │
   │                          │                          │
   │  轮询 GET /progress/:id  │  并行搜索所有数据源        │
   │──每隔 500ms─────────────>│                          │
   │                          │  ┌── Bilibili API ──────>│
   │                          │  ├── YouTube API ────────>│
   │                          │  ├── 编程导航 ───────────>│
   │                          │  └── 鱼皮AI导航 ──────────>│
   │                          │                          │
   │                          │  综合评分 → 去重          │
   │                          │  INSERT news_items       │
   │<── { stage, progress } ──│                          │
   │                          │  5 分钟后清理进度数据      │
```

### 6.3 博主内容收集流

```
[客户端]                    [服务端]                    [外部 API]
   │                          │                          │
   │  POST /creators/collect  │                          │
   │─────────────────────────>│  遍历已启用博主            │
   │<── { progressId } ───────│                          │
   │                          │  ┌── Bilibili:           │
   │  轮询进度                  │  │  空间 API → 搜索回退  │
   │──每隔 500ms─────────────>│  │  过滤近 7 天          │
   │                          │  │  无质量阈值            │
   │                          │  ├── YouTube:            │
   │                          │  │  Search API → Stats   │
   │                          │  │  过滤近 7 天          │
   │                          │  │  无质量阈值            │
   │                          │                          │
   │                          │  INSERT news_items       │
   │<── { stage, progress } ──│                          │
```

---

## 七、评分与去重

### 7.1 综合评分公式

```
综合分 = 热度(heat) × 0.4
       + 来源可信度(credibility) × 0.3
       + 时效性(timeliness) × 0.2
       + 内容类型(contentType) × 0.1
```

### 7.2 去重算法

Bigram Jaccard 相似度：
- **标题相似度 ≥ 0.75** → 判定为重复
- **来源相似度 ≥ 0.6** → 判定为重复（跨来源时）
- 重复时保留来源可信度更高的条目

---

## 八、认证与安全

### 8.1 图形验证码

- 服务端内存 Map 存储，key 为随机 captchaId
- 4 位数字，SVG 格式，含随机颜色、旋转、干扰线、干扰点
- 一次性使用：验证后立即从 Map 删除
- 5 分钟过期，每分钟定时清理

### 8.2 邮箱验证码

- 存储于 `verification_codes` 表
- 6 位数字，10 分钟有效期
- 验证后标记 `used = 1`

### 8.3 JWT 认证

- Payload: `{ userId, email }`
- 过期时间: 7 天
- 存储: localStorage，`Authorization: Bearer <token>`
- 401 响应时前端自动清除 token 并跳转登录

### 8.4 数据隔离

所有数据表均包含 `user_id` 字段，查询强制过滤。JWT 中间件自动从 token 提取 userId 并注入 `req.userId`。

---

## 九、部署配置

### 必需环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek V4 Flash API 密钥 |
| `JWT_SECRET` | JWT 签名密钥 |

### 数据源配置

| 变量 | 说明 |
|------|------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 密钥 |
| `YOUTUBE_PROXY_URL` | YouTube API 代理地址（国内需要） |

### SMTP（可选）

QQ 邮箱推荐配置：`SMTP_HOST=smtp.qq.com`, `SMTP_PORT=587`, 需开启 SMTP 服务并使用授权码。

### MCP

通过 `.mcp.json` 配置 Firecrawl 和 Context7 MCP 服务。
