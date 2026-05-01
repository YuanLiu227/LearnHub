# LearnHub 技术规格文档

## 1. 系统架构

### 1.1 整体架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     前端 (React 19 + Vite 6)                  管理后台    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐       ┌───────────────┐     │
│  │ 资源总览   │ │  关键词   │ │ 关键词总览 │       │ 管理后台       │     │
│  │ ┌───────┐ │ │  ┌──────┐ │ │  博主总览   │       │ （独立 HTML）  │     │
│  │ │ 关键词 │ │ │  │关键词│ │ └───────────┘       │ 登录/用户管理  │     │
│  │ │ 博主   │ │ │  │博主  │ │ ┌───────────┐       │ 系统设置      │     │
│  │ │ 视频   │ │ │  │视频  │ │ │ 知识搜索   │       └───────────────┘     │
│  │ └───────┘ │ │  └──────┘ │ └───────────┘                               │
│  └───────────┘ └───────────┘                                             │
│                   Zustand 5 + Axios                                       │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ HTTP REST API (JWT Bearer Token, 含 role)
┌──────────────────────────┴───────────────────────────────────────────────┐
│                   后端 (Express 5 + TypeScript)                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 认证  │ │ 关键词│ │ 博主  │ │ 视频  │ │ 仪表盘│ │ 配置  │ │ 管理  │      │
│  │      │ │      │ │      │ │      │ │      │ │      │ │ (admin)│      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                           │                                              │
│  ┌────────────────────────┴──────────────────────────────────────┐       │
│  │                        服务层                                    │       │
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────────┐               │       │
│  │  │ Bilibili │ │   YouTube    │ │ 编程导航/鱼皮  │               │       │
│  │  │ API      │ │   API        │ │ API          │               │       │
│  │  └──────────┘ └──────────────┘ └──────────────┘               │       │
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────────┐               │       │
│  │  │ 评分系统  │ │  DeepSeek AI │ │ Captcha      │               │       │
│  │  │ 去重算法  │ │  服务        │ │ 邮箱验证码    │               │       │
│  │  └──────────┘ └──────────────┘ └──────────────┘               │       │
│  │  ┌──────────┐ ┌──────────────┐                               │       │
│  │  │ context7 │ │  Firecrawl   │                               │       │
│  │  │ MCP      │ │  MCP         │                               │       │
│  │  └──────────┘ └──────────────┘                               │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                           │                                              │
│                      ┌────┴────┐                                         │
│                      │ SQLite  │ (node:sqlite, WAL 模式)                 │
│                      └─────────┘                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈版本

| 组件 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.x |
| 构建工具 | Vite | 6.x |
| 样式 | Tailwind CSS | 4.x |
| 状态管理 | Zustand | 5.x |
| 动画 | motion (motion/react) | latest |
| 图标 | lucide-react | latest |
| 后端框架 | Express | 5.x |
| 运行时 | tsx (TypeScript execute) | latest |
| 数据库 | SQLite (node:sqlite) | Node.js 内置 |
| 认证 | bcryptjs + jsonwebtoken | latest |
| AI | DeepSeek V4 Flash API | latest |
| 邮件 | nodemailer | latest |
| HTTP 客户端 | axios | latest |
| 管理后台 | 独立 HTML/CSS/JS | 无构建依赖 |

---

## 2. 数据模型

### 2.1 users（用户表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `email` | TEXT (UNIQUE) | 邮箱（账号） |
| `password_hash` | TEXT | bcrypt 哈希密码 |
| `role` | TEXT | 角色：`'user'` / `'admin'`，默认 `'user'` |
| `status` | TEXT | 状态：`'active'` / `'frozen'`，默认 `'active'` |
| `created_at` | INTEGER | 注册时间 |

**角色分配规则：**
- 注册时邮箱匹配 `SMTP_USER` 环境变量 → `role = 'admin'`
- 其他 → `role = 'user'`

**状态约束：**
- `status = 'frozen'` 时拒绝登录（返回 403）
- 管理员不可冻结管理员
- 管理员不可删除最后一名管理员

### 2.2 news_items（学习资源表）

核心表，存储所有类型的资源（关键词匹配、博主收集、视频提交）。

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID（外键关联 users） |
| `keyword_id` | TEXT (nullable) | 关联关键词 ID，keyword 来源时非空 |
| `creator_id` | TEXT (nullable) | 关联博主 ID，creator 来源时非空 |
| `resource_type` | TEXT | 资源类型：`'keyword'` / `'creator'` / `'direct_video'` |
| `title` | TEXT | 资源标题 |
| `url` | TEXT | 资源链接 |
| `source` | TEXT | 来源标识（youtube / bilibili / codefather 等） |
| `source_name` | TEXT | 来源显示名称 |
| `published_at` | INTEGER | 发布时间（Unix 毫秒时间戳） |
| `matched_at` | INTEGER | 匹配时间（Unix 毫秒时间戳） |
| `is_real` | INTEGER | 内容真实性标记（0/1） |
| `confidence` | REAL | AI 置信度 |
| `summary` | TEXT (nullable) | AI 摘要 |
| `is_urgent` | INTEGER | 是否紧急（0/1） |
| `heat` | INTEGER | 热度分（0-100） |
| `creator_name` | TEXT (nullable) | 作者/创作者名称 |
| `completed` | INTEGER | 学习完成标记（0/1） |
| `favorited` | INTEGER | 收藏标记（0/1） |

**资源类型判定逻辑：**
- `resource_type = 'keyword'`：关键词搜索结果（keyword_id 非空）
- `resource_type = 'creator'`：博主内容收集结果（creator_id 非空）
- `resource_type = 'direct_video'`：视频 URL 提交（两者均空，直接通过 URL 提交）

### 2.3 keywords（关键词表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID |
| `term` | TEXT | 关键词内容 |
| `scope` | TEXT | 搜索范围 |
| `enabled` | INTEGER | 启用状态（0/1） |
| `archived` | INTEGER | 归档状态（0/1） |
| `created_at` | INTEGER | 创建时间 |
| `last_matched_at` | INTEGER (nullable) | 最近匹配时间 |

### 2.4 followed_creators（博主关注表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID |
| `platform` | TEXT | 平台（'youtube' / 'bilibili'） |
| `channel_id` | TEXT | 频道/UP 主 ID |
| `channel_name` | TEXT | 频道名称 |
| `description` | TEXT (nullable) | 描述 |
| `avatar_url` | TEXT (nullable) | 头像 URL |
| `enabled` | INTEGER | 启用状态（0/1） |
| `archived` | INTEGER | 归档状态（0/1） |
| `created_at` | INTEGER | 创建时间 |
| `last_fetched_at` | INTEGER (nullable) | 最近采集时间 |

### 2.5 verification_codes（邮箱验证码表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `email` | TEXT | 注册邮箱 |
| `code` | TEXT | 6 位验证码 |
| `type` | TEXT | 验证码类型（'register'） |
| `expires_at` | INTEGER | 过期时间 |
| `used` | INTEGER | 是否已使用（0/1） |

### 2.6 config（配置表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT | 配置键 |
| `value` | TEXT | 配置值 |
| `user_id` | TEXT (nullable) | 用户 ID（null 为全局配置） |

**全局配置键：**
| key | value | 说明 |
|-----|-------|------|
| `registration_enabled` | `'true'` / `'false'` | 是否允许新用户注册 |

### 2.7 hot_topics（热点话题表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `title` | TEXT | 标题 |
| `url` | TEXT | 链接 |
| `source` | TEXT | 来源 |
| `source_name` | TEXT | 来源名称 |
| `heat` | INTEGER | 热度 |
| `published_at` | INTEGER | 发布时间 |
| `scope` | TEXT | 范围 |
| `summary` | TEXT (nullable) | 摘要 |
| `fetched_at` | INTEGER | 采集时间 |

---

## 3. API 设计

### 3.1 认证模块 (`/api/auth`)

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/captcha` | — | `{ captchaId, svg }` | 图形验证码（4 位数字 SVG） |
| POST | `/register` | `{ email, password, captchaId, captchaCode }` | `{ success, message, devCode? }` | 注册 Step 1（检查注册开关） |
| POST | `/register/verify` | `{ email, code, password, captchaId, captchaCode }` | `{ token, user }` | 注册 Step 2（检查注册开关） |
| POST | `/login` | `{ email, password, captchaId, captchaCode }` | `{ token, user }` | 登录（检查 frozen 状态） |
| POST | `/resend-code` | `{ email, captchaId, captchaCode }` | `{ success, message }` | 重发验证码（检查注册开关） |
| GET | `/me` | — | `{ user }` | 当前用户信息（需认证） |

### 3.2 关键词模块 (`/api/keywords`)

| 方法 | 路径 | 请求体/参数 | 响应 | 说明 |
|------|------|-------------|------|------|
| GET | `/` | — | `{ keywords }` | 活跃关键词 |
| GET | `/all` | — | `{ keywords }` | 全部关键词（含归档） |
| POST | `/` | `{ term }` | `{ id, term, ... }` | 添加关键词 |
| POST | `/archive` | `{ id }` | — | 归档 |
| POST | `/restore` | `{ id }` | — | 恢复 |
| DELETE | `/permanent` | `?id=` | — | 永久删除 |
| PATCH | `/` | `{ id, enabled, ... }` | `{ ...keyword }` | 更新 |

### 3.3 博主模块 (`/api/creators`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 活跃博主列表 |
| GET | `/all` | 全部博主（含归档） |
| POST | `/` | 添加博主 `{ platform, query }` |
| PATCH | `/:id` | 更新博主（启用/暂停） |
| DELETE | `/:id` | 归档博主 |
| POST | `/restore/:id` | 恢复博主 |
| DELETE | `/permanent/:id` | 永久删除 |
| POST | `/collect` | 触发收集（异步），返回 `{ collectId }` |
| GET | `/collect/progress/:id` | 查询收集进度 |

### 3.4 视频 URL 提交模块 (`/api/videos`)

| 方法 | 路径 | 请求体/参数 | 响应 | 说明 |
|------|------|-------------|------|------|
| POST | `/submit` | `{ url, platform }` | `{ success, item }` | 提交视频 URL，自动提取信息后入库 |
| GET | `/` | `?page=&pageSize=` | `{ items, total }` | 获取用户视频资源列表 |

**POST `/api/videos/submit` 处理流程：**

1. 根据 `platform` 提取视频 ID
   - Bilibili：调用 `extractBVID(url)` 提取 BVID → 转为 `avid`
   - YouTube：正则 `/(?:youtube\.com\/watch\?v=\|youtu\.be\/\|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/`
2. 调用对应 API 获取视频信息
   - Bilibili：`getBilibiliVideoStats(bvid)` → 标题、作者、播放量、发布时间、封面
   - YouTube：`getYouTubeVideoStats(videoId)` → 标题、频道名、播放量、发布时间
3. 去重检查：`SELECT id FROM news_items WHERE url = ? AND user_id = ?`
4. 构造 `news_item`：
   - `resource_type = 'direct_video'`
   - `keyword_id = null, creator_id = null`
   - `heat = Math.min(100, Math.round(viewCount / 1000))`
   - `user_id` 来自 JWT 中间件
5. `INSERT INTO news_items` → 返回创建的资源

### 3.5 监控模块 (`/api/monitor`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 触发全量关键词搜索（异步），返回 `{ monitorId }` |
| GET | `/progress/:id` | 查询搜索进度 |
| GET | `/history` | 历史搜索结果 |

### 3.6 仪表盘与资源管理 (`/api/dashboard`)

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/stats` | — | 统计概览 |
| GET | `/hotspots` | `?page=&pageSize=&source=&resourceType=` | 资源列表（支持按资源类型过滤） |
| GET | `/search` | `?q=&page=&pageSize=` | 全文搜索 |
| GET | `/favorites` | `?page=&pageSize=` | 收藏列表 |
| PATCH | `/resource/:id` | `{ completed?, favorited? }` | 更新资源状态 |
| DELETE | `/resource/:id` | — | 删除单个资源 |
| POST | `/resources/batch-delete` | `{ type: 'keywords' \| 'creators' \| 'direct_video' }` | 按类型批量清空 |
| POST | `/resources/batch-delete-by-ids` | `{ ids }` | 按 ID 批量删除 |

**GET `/api/dashboard/hotspots` 筛选逻辑：**
- `?source=youtube`：仅筛选某来源
- `?resourceType=direct_video`：仅筛选视频资源
- `?resourceType=keyword`：仅筛选关键词资源
- 不传则返回所有类型

### 3.7 管理后台模块 (`/api/admin`)

所有管理后台路由使用 `adminRequired` 中间件（先 `authRequired` 验证 JWT，再校验 `role === 'admin'`）。

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/users` | `?page=&pageSize=` | 获取用户列表（不返回 password_hash） |
| DELETE | `/users/:id` | — | 删除用户（防自删、防删最后管理员、级联删除关联数据） |
| PATCH | `/users/:id/freeze` | — | 冻结用户（防冻自己、防冻管理员） |
| PATCH | `/users/:id/unfreeze` | — | 解冻用户 |
| GET | `/settings` | — | 获取 `registration_enabled` |
| PUT | `/settings` | `{ registrationEnabled }` | 更新 `registration_enabled` |

### 3.8 AI 模块 (`/api/ai`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | AI 对话 |
| POST | `/veracity` | 内容真实性校验 |

### 3.9 系统 (`/api/config`, `/api/health`, etc.)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取配置 |
| PUT | `/api/config` | 更新配置 |
| GET | `/api/health` | 健康检查 |

---

## 4. 认证与安全

### 4.1 JWT 认证

- **签发**：登录/注册成功后签发，payload `{ userId, email, role }`
- **过期**：7 天
- **传输**：`Authorization: Bearer <token>`
- **存储**：localStorage（主前端和管理后台各自独立管理）
- **验证**：`authRequired` 中间件，从 header 提取 token → jwt.verify → 注入 `req.user`
- **角色验证**：`adminRequired` 中间件，在 `authRequired` 基础上校验 `role === 'admin'`

### 4.2 数据隔离

所有涉及用户数据的查询均包含 `AND user_id = ?`：
```sql
SELECT * FROM news_items WHERE user_id = ?  -- 强制数据隔离
```

### 4.3 密码安全

- bcrypt 哈希（10 轮 salt）
- 密码强度要求：6 位以上，含字母、数字、特殊字符中至少 2 类
- 前后端双重校验

### 4.4 图形验证码

- SVG 格式，4 位数字，随机颜色 + 旋转 + 干扰线 + 干扰点
- 服务端内存存储（Map），`captchaId → { text, expiresAt }`
- 一次性使用，验证后立即删除
- 5 分钟 TTL，每分钟自动清理

### 4.5 邮箱验证码

- 6 位数字，存储于 `verification_codes` 表
- 10 分钟有效期，验证后标记 `used = 1`
- SMTP 发送（支持 QQ 邮箱 / 163 / Brevo / Resend）
- 开发模式（SMTP 未配置）自动返回 devCode

### 4.6 管理后台安全

- 管理后台页面不包含敏感前端逻辑，仅通过 API 与后端交互
- 所有管理 API 受 `adminRequired` 中间件保护
- 普通用户无法访问任何管理 API（返回 403）
- 管理员不能冻结自己、不能删除自己、不能删除最后一名管理员

---

## 5. 数据流

### 5.1 关键词搜索流

```
用户添加关键词 → 启用 → 触发搜索
         ↓
   Bilibili API (搜索 + 统计, 含阈值)
   YouTube API (搜索 + 统计, 含阈值)
   编程导航 (文章列表)
   鱼皮AI导航 (课程列表)
         ↓
   综合评分计算 → Bigram Jaccard 去重
         ↓
   存入 SQLite (resource_type='keyword', keyword_id 关联)
         ↓
   前端展示
```

### 5.2 博主内容收集流

```
用户关注博主 → 触发收集 (或每日 08:00 自动)
         ↓
   Bilibili: 空间 API → 搜索 API 回退
   YouTube: Search API + Video Stats
         ↓
   时间过滤 (近 7 天, 不设质量阈值)
         ↓
   存入 SQLite (resource_type='creator', creator_id 关联)
         ↓
   前端展示
```

### 5.3 视频 URL 提交流

```
用户选择平台 + 粘贴 URL → 提交
         ↓
   提取视频 ID (BVID / YouTube Video ID)
         ↓
   调用平台 API 获取视频信息
         ↓
   去重检查 → 构造 news_item
   (resource_type='direct_video', keyword_id=null, creator_id=null)
         ↓
   存入 SQLite → 刷新前端资源列表
```

### 5.4 收藏/取消收藏流

```
收藏 → PATCH resource/:id { favorited: true }
   → 从总览移除 → 仅在收藏页显示

取消收藏 → PATCH resource/:id { favorited: false }
   → 检查 keyword_id / creator_id 对应实体是否存在
   → 全部不存在 → DELETE 该资源 (级联删除)
   → 任一存在 → 回到资源总览
```

---

## 6. 评分体系

### 6.1 综合评分公式（关键词搜索专用）

```
综合分 = heat × 0.4 + credibility × 0.3 + timeliness × 0.2 + contentType × 0.1
```

| 维度 | 权重 | 说明 |
|------|------|------|
| heat | 0.4 | 播放量/点赞数归一化到 0-100 |
| credibility | 0.3 | 编程导航=0.9, 鱼皮AI=0.9, YouTube=0.8, Bilibili=0.6 |
| timeliness | 0.2 | 7天=1.0, 30天=0.7, 90天=0.4, 更早=0.2 |
| contentType | 0.1 | AI课程=0.9, 教程=0.8, 视频=0.7 |

> 博主收集和视频 URL 提交不经过评分系统。

### 6.2 热度计算

- **关键词搜索 / 博主收集**：综合播放量、点赞数、收藏数等维度归一化到 0-100
- **视频 URL 提交**：`Math.min(100, Math.round(viewCount / 1000))`

### 6.3 去重机制（Bigram Jaccard）

- **标题相似度阈值**：0.75
- **来源相似度阈值**：0.6
- 仅用于关键词搜索结果的跨来源去重
- 检测到重复时保留可信度更高的条目

---

## 7. 数据源适配器

| 数据源 | 文件 | 鉴权 | 用途 |
|--------|------|------|------|
| Bilibili | `bilibili-api.ts` | 无需密钥 | 搜索/博主收集/视频提交 |
| YouTube | `youtube-api.ts` | API Key | 搜索/博主收集/视频提交 |
| 编程导航 | `codefather-api.ts` | 无需密钥 | 关键词搜索 |
| 鱼皮AI导航 | `ai-codefather-api.ts` | 无需密钥 | 关键词搜索 |

---

## 8. 数据库迁移策略

使用渐进式迁移模式，所有迁移在 `sqlite.ts` 中顺序执行：

```typescript
// 示例：新增列
try { db.exec(`ALTER TABLE news_items ADD COLUMN resource_type TEXT DEFAULT 'keyword'`); } catch (e) {}
// 示例：新增 role/status 列
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch (e) {}
// 回填数据
try { db.exec(`UPDATE news_items SET resource_type = 'creator' WHERE creator_id IS NOT NULL`); } catch (e) {}
```

所有迁移均包裹在 try/catch 中，兼容新旧数据库文件，确保幂等性。
