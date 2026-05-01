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
│  │ ┌───────┐ │ │  ┌──────┐ │ ┌───────────┐                               │
│  │ │ 设置   │ │ │  │添加  │ │ │ 设置页    │                               │
│  │ └───────┘ │ │  │视频  │ │ │ (Settings) │                               │
│  │           │ │  └──────┘ │ └───────────┘                               │
│  └───────────┘ └───────────┘                                             │
│                   Zustand 5 + Axios                                       │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ HTTP REST API (JWT Bearer Token, 含 role)
┌──────────────────────────┴───────────────────────────────────────────────┐
│                   后端 (Express 5 + TypeScript)                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 认证  │ │ 关键词│ │ 博主  │ │ 视频  │ │ 仪表盘│ │ 配置  │ │ 管理  │      │
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
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │       │
│  │  │ 配置服务  │ │  加密服务    │ │  Context7    │ │代理管理器│ │       │
│  │  │ config   │ │  AES-256-GCM │ │  MCP         │ │ mihomo  │ │       │
│  │  └──────────┘ └──────────────┘ └──────────────┘ └──────────┘ │       │
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
| 加密 | Node.js crypto (AES-256-GCM) | 内置 |
| 代理客户端 | mihomo (Clash Meta 内核) | latest |
| MCP | Context7 MCP | latest |
| 管理后台 | 独立 HTML/CSS/JS | 无构建依赖 |

---

## 2. 数据模型

### 2.1 users（用户表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `email` | TEXT (UNIQUE) | 邮箱（账号） |
| `password_hash` | TEXT | bcrypt 哈希密码 |
| `role` | TEXT | `'user'` / `'admin'`，默认 `'user'` |
| `status` | TEXT | `'active'` / `'frozen'`，默认 `'active'` |
| `created_at` | INTEGER | 注册时间戳 |

**规则：**
- 注册时邮箱匹配 `SMTP_USER` → `role = 'admin'`
- `status = 'frozen'` 拒绝登录（403）
- 管理员不可冻结管理员，不可删除最后一名管理员

### 2.2 news_items（学习资源表 — 核心表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID |
| `keyword_id` | TEXT (nullable) | 关联关键词 |
| `creator_id` | TEXT (nullable) | 关联博主 |
| `resource_type` | TEXT | `'keyword'` / `'creator'` / `'direct_video'` |
| `title` | TEXT | 标题 |
| `url` | TEXT | 链接 |
| `source` | TEXT | 来源标识（youtube/bilibili/codefather 等） |
| `source_name` | TEXT | 来源显示名称 |
| `published_at` | INTEGER | 发布时间（Unix 毫秒） |
| `matched_at` | INTEGER | 匹配时间（Unix 毫秒） |
| `is_real` | INTEGER | 真实性标记（0/1） |
| `confidence` | REAL | AI 置信度 |
| `summary` | TEXT (nullable) | AI 摘要 |
| `is_urgent` | INTEGER | 紧急标记（0/1） |
| `heat` | INTEGER | 热度分（0-100） |
| `creator_name` | TEXT (nullable) | 创作者名称 |
| `completed` | INTEGER | 学习完成（0/1） |
| `favorited` | INTEGER | 收藏（0/1） |

**resource_type 判定：**
- `keyword`：keyword_id 非空
- `creator`：creator_id 非空
- `direct_video`：两者均为空

### 2.3 keywords（关键词表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID |
| `term` | TEXT | 关键词 |
| `scope` | TEXT | 搜索范围 |
| `enabled` | INTEGER | 启用（0/1） |
| `archived` | INTEGER | 归档（0/1） |
| `created_at` | INTEGER | 创建时间 |
| `last_matched_at` | INTEGER (nullable) | 最近匹配时间 |

### 2.4 followed_creators（博主关注表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `user_id` | TEXT | 用户 ID |
| `platform` | TEXT | `'youtube'` / `'bilibili'` |
| `channel_id` | TEXT | 频道/UP 主 ID |
| `channel_name` | TEXT | 频道名称 |
| `description` | TEXT (nullable) | 描述 |
| `avatar_url` | TEXT (nullable) | 头像 URL |
| `enabled` | INTEGER | 启用（0/1） |
| `archived` | INTEGER | 归档（0/1） |
| `created_at` | INTEGER | 创建时间 |
| `last_fetched_at` | INTEGER (nullable) | 最近采集时间 |

### 2.5 verification_codes（邮箱验证码表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `email` | TEXT | 邮箱 |
| `code` | TEXT | 6 位验证码 |
| `type` | TEXT | 类型（'register'） |
| `expires_at` | INTEGER | 过期时间 |
| `used` | INTEGER | 已使用（0/1） |

### 2.6 user_config（用户配置表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT | 配置键（复合主键） |
| `user_id` | TEXT | 用户 ID（复合主键） |
| `value` | TEXT | 配置值 |

**支持的配置项：**

| key | 类型 | 说明 | 加密存储 |
|-----|------|------|----------|
| `DEEPSEEK_API_KEY` | API 密钥 | DeepSeek API 密钥 | ✅ AES-256-GCM |
| `YOUTUBE_API_KEY` | API 密钥 | YouTube Data API v3 密钥 | ✅ AES-256-GCM |
| `YOUTUBE_PROXY_URL` | 代理地址 | YouTube 代理（系统自动配置） | ✅ AES-256-GCM |
| `YOUTUBE_SUBSCRIPTION_URL` | 订阅链接 | 机场订阅链接（系统自动启动 mihomo） | ✅ AES-256-GCM |
| `ENABLE_BILIBILI` | 开关 | Bilibili 数据源 | ❌ |
| `ENABLE_YOUTUBE` | 开关 | YouTube 数据源 | ❌ |
| `ENABLE_CODENAV` | 开关 | 编程导航数据源 | ❌ |
| `ENABLE_AI_CODEFATHER` | 开关 | 鱼皮AI导航数据源 | ❌ |

**配置读取优先级（getUserConfigValue）：**
1. `user_config` 表（有 userId 时查询，API 密钥自动解密）
2. `process.env`（向后兼容）
3. 数据源开关默认 `'true'`
4. 其他键返回 `null`

### 2.7 config（系统配置表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT (PK) | 配置键 |
| `value` | TEXT | 配置值 |

**全局配置项：**
| key | value | 说明 |
|-----|-------|------|
| `registration_enabled` | `'true'` / `'false'` | 注册开关 |

### 2.8 hot_topics（热点话题表）

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

### 3.1 认证 (`/api/auth`)

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/captcha` | — | `{ captchaId, svg }` | SVG 图形验证码（4 位数字） |
| POST | `/register` | `{ email, password, captchaId, captchaCode }` | `{ success, message, devCode? }` | 注册 Step 1（含注册开关检查） |
| POST | `/register/verify` | `{ email, code, password, captchaId, captchaCode }` | `{ token, user }` | 注册 Step 2（含注册开关检查） |
| POST | `/login` | `{ email, password, captchaId, captchaCode }` | `{ token, user }` | 登录 |
| POST | `/resend-code` | `{ email, captchaId, captchaCode }` | `{ success, message }` | 重发验证码 |
| GET | `/me` | — | `{ user }` | 当前用户信息 |

### 3.2 关键词 (`/api/keywords`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 活跃关键词列表 |
| GET | `/all` | 全部关键词（含归档） |
| POST | `/` | 添加关键词 `{ term }` |
| POST | `/archive` | 归档 `{ id }` |
| POST | `/restore` | 恢复 `{ id }` |
| DELETE | `/permanent` | 永久删除 `?id=` |
| PATCH | `/` | 更新 `{ id, enabled, ... }` |

### 3.3 博主 (`/api/creators`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 活跃博主列表 |
| GET | `/all` | 全部博主（含归档） |
| POST | `/` | 添加博主 `{ platform, query }` |
| PATCH | `/:id` | 更新 |
| DELETE | `/:id` | 归档 |
| POST | `/restore/:id` | 恢复 |
| DELETE | `/permanent/:id` | 永久删除 |
| POST | `/collect` | 触发收集（异步），返回 `{ collectId }` |
| GET | `/collect/progress/:id` | 查询进度 |

### 3.4 视频提交 (`/api/videos`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/submit` | 提交 URL `{ url, platform }` → 自动提取信息入库 |
| GET | `/` | 视频资源列表 `?page=&pageSize=` |

**提交处理流程：**
1. 根据 platform 提取视频 ID（BVID / YouTube ID）
2. 调用对应 API 获取视频信息（传递 userId 使用用户配置的密钥/代理）
3. 去重检查：`SELECT id FROM news_items WHERE url = ? AND user_id = ?`
4. 构造 news_item：`resource_type = 'direct_video'`，`heat = Math.min(100, Math.round(viewCount / 1000))`
5. INSERT → 返回创建的资源

### 3.5 监控 (`/api/monitor`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 触发全量关键词搜索（异步），返回 `{ monitorId }` |
| GET | `/progress/:id` | 查询进度 |
| GET | `/history` | 历史搜索结果 |

### 3.6 仪表盘 (`/api/dashboard`)

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/stats` | — | 统计概览 |
| GET | `/hotspots` | `?page=&pageSize=&source=&resourceType=` | 资源列表 |
| GET | `/search` | `?q=&page=&pageSize=` | 全文搜索 |
| GET | `/favorites` | `?page=&pageSize=` | 收藏列表 |
| PATCH | `/resource/:id` | `{ completed?, favorited? }` | 更新资源 |
| DELETE | `/resource/:id` | — | 删除 |
| POST | `/resources/batch-delete` | `{ type: 'keywords'\|'creators'\|'direct_video' }` | 批量清空 |
| POST | `/resources/batch-delete-by-ids` | `{ ids }` | 按 ID 批量删除 |

### 3.7 用户配置 (`/api/config`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user` | 获取用户配置及来源（需认证） |
| PUT | `/user` | 更新/删除配置 `{ key, value }`（需认证） |

**GET 响应示例：**
```json
{
  "DEEPSEEK_API_KEY": { "value": "sk-***9244", "source": "user" },
  "YOUTUBE_API_KEY": { "value": "AIz***xAYA", "source": "user" },
  "YOUTUBE_PROXY_URL": { "value": "http://***:***@127.0.0.1:15733", "source": "user" },
  "YOUTUBE_SUBSCRIPTION_URL": { "value": "htt***ken", "source": "user" },
  "ENABLE_BILIBILI": { "value": "true", "source": "default" },
  "ENABLE_YOUTUBE": { "value": "true", "source": "default" },
  "ENABLE_CODENAV": { "value": "true", "source": "default" },
  "ENABLE_AI_CODEFATHER": { "value": "true", "source": "default" }
}
```

**source 取值：** `'user'` | `'env'` | `'default'` | `'none'`

**密钥掩码规则：**
- API 密钥：前 3 + `****` + 后 4
- 代理 URL：`http://***:***@hostname:port`
- 订阅链接：前 3 + `****` + 后 4
- 仅 `source === 'user'` 时掩码

**PUT 处理（YOUTUBE_SUBSCRIPTION_URL 特殊逻辑）：**
- value 非空 → 加密存储 + `proxyManager.register(userId, url)` 启动 mihomo
- value 为 null → 删除配置 + `proxyManager.unregister(userId)` 停止 mihomo

### 3.8 管理后台 (`/api/admin`)

所有路由使用 `adminRequired` 中间件。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 用户列表（分页，不含 password_hash） |
| DELETE | `/users/:id` | 删除用户（级联清理，防自删，防删最后管理员） |
| PATCH | `/users/:id/freeze` | 冻结（防冻自己，防冻管理员） |
| PATCH | `/users/:id/unfreeze` | 解冻 |
| GET | `/settings` | 获取 registration_enabled |
| PUT | `/settings` | 更新 registration_enabled |

### 3.9 AI (`/api/ai`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | AI 对话（使用用户 DeepSeek 密钥） |
| POST | `/veracity` | 内容真实性校验 |

### 3.10 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 系统配置 |
| PUT | `/api/config` | 更新系统配置 |
| GET | `/api/health` | 健康检查 `{ status: "ok", timestamp }` |
| GET | `/admin` | 管理后台（静态页面） |

---

## 4. 认证与安全

### 4.1 JWT
- 签发：登录/注册成功，payload `{ userId, email, role }`
- 过期：7 天，传输：`Authorization: Bearer <token>`
- 存储：localStorage，验证：`authRequired` 中间件
- 角色校验：`adminRequired` = `authRequired` + `role === 'admin'`

### 4.2 数据隔离
所有涉及用户数据的查询均包含 `AND user_id = ?`。

### 4.3 密码安全
- bcrypt 10 轮 salt
- 6 位以上，含字母、数字、特殊字符至少 2 类
- 前后端双重校验

### 4.4 图形验证码
- SVG 格式，4 位数字，随机颜色+旋转+干扰线+干扰点
- 服务端 Map 存储，captchaId → `{ text, expiresAt }`
- 一次性使用，5 分钟 TTL，每分钟自动清理

### 4.5 邮箱验证码
- 6 位数字，verification_codes 表存储
- 10 分钟有效期，验证后 `used = 1`
- 开发环境（SMTP 未配置）自动返回 devCode

### 4.6 API 密钥安全
- **加密存储**：AES-256-GCM，随机 IV + AuthTag + 密文
  - 格式：`hexIV:hexAuthTag:hexCiphertext`
  - 密钥派生：`SHA-256(CONFIG_ENCRYPTION_KEY)`
  - 自动加密：`setUserConfigValue` 对 `SECRET_KEYS` 自动加密
  - 自动解密：`getUserConfigValue` 对加密值自动解密
- **响应掩码**：用户来源的密钥字段自动掩码
- **SECRET_KEYS**：`DEEPSEEK_API_KEY`、`YOUTUBE_API_KEY`、`YOUTUBE_PROXY_URL`、`YOUTUBE_SUBSCRIPTION_URL`

### 4.7 管理后台安全
- 管理后台不含敏感前端逻辑，仅通过 API 交互
- 所有管理 API 受 `adminRequired` 中间件保护
- 普通用户访问管理 API 返回 403
- 管理员冻结/删除约束：不能冻自己、不能删自己、不能删最后一名管理员

### 4.8 订阅链接安全
- 订阅 URL 加密存储于 `user_config` 表（AES-256-GCM）
- mihomo 配置文件和缓存存储在 `server/data/proxy/{hash}/` 目录
- API 响应中对订阅 URL 自动掩码（前 3 + `****` + 后 4）

---

## 5. 数据流

### 5.1 关键词搜索流
```
添加关键词 → 启用 → 触发搜索
  → Bilibili API（搜索+统计，含阈值）
  → YouTube API（搜索+统计，含阈值，使用用户密钥/代理）
  → 编程导航（文章列表）
  → 鱼皮AI导航（课程列表）
  → 综合评分 → Bigram Jaccard 去重
  → 存入 SQLite（resource_type='keyword', keyword_id）
```

### 5.2 博主内容收集流
```
关注博主 → 触发收集 / 每日 08:00 自动
  → Bilibili：空间 API → 搜索 API 回退
  → YouTube：Search API + Video Stats（使用用户密钥/代理）
  → 时间过滤（近 7 天），不设质量阈值
  → 存入 SQLite（resource_type='creator', creator_id）
```

### 5.3 视频 URL 提交流
```
粘贴 URL → 提取视频 ID → 调用 API 获取信息
  → 去重检查 → 存入 SQLite（resource_type='direct_video'）
```

### 5.4 用户配置流
```
GET /api/config/user
  → getEffectiveConfig(userId) → 查 DB → 回退 env → 默认值
  → SECRET_KEYS 掩码 → 返回

PUT /api/config/user { key, value }
  → YOUTUBE_SUBSCRIPTION_URL → proxyManager.register/unregister
  → SECRET_KEYS → 加密存储
  → value=null → 删除
```

### 5.5 代理配置流
```
PUT YOUTUBE_SUBSCRIPTION_URL
  → 加密存储
  → proxyManager.register(userId, url)
  → MD5 hash → 分配端口 → 写入 mihomo config.yaml
  → spawn mihomo → 检测启动 → 写入 YOUTUBE_PROXY_URL
```

### 5.6 收藏/取消收藏流
```
收藏 → PATCH favorited=true → 移出总览 → 仅收藏页显示
取消收藏 → PATCH favorited=false → 检查实体存在
  → 任一存在 → 回到总览
  → 全部不存在 → 级联删除
```

---

## 6. 评分体系

### 6.1 综合评分（关键词搜索专用）
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
- 关键词搜索/博主收集：综合播放量、点赞数、收藏数等归一化
- 视频 URL 提交：`Math.min(100, Math.round(viewCount / 1000))`

### 6.3 去重（Bigram Jaccard）
- 标题相似度阈值：0.75
- 来源相似度阈值：0.6
- 仅关键词搜索结果去重，重复时保留可信度更高的条目

---

## 7. 数据源适配器

| 数据源 | 文件 | 鉴权 | 用途 |
|--------|------|------|------|
| Bilibili | `bilibili-api.ts` | 无需密钥 | 搜索/博主收集/视频提交 |
| YouTube | `youtube-api.ts` | API Key + mihomo 代理 | 搜索/博主收集/视频提交 |
| 编程导航 | `codefather-api.ts` | 无需密钥 | 关键词搜索 |
| 鱼皮AI导航 | `ai-codefather-api.ts` | 无需密钥 | 关键词搜索 |

---

## 8. 关键服务模块

### 8.1 配置服务 (`services/config.ts`)
```typescript
USER_CONFIG_KEYS = [
  'DEEPSEEK_API_KEY', 'YOUTUBE_API_KEY', 'YOUTUBE_PROXY_URL',
  'YOUTUBE_SUBSCRIPTION_URL',
  'ENABLE_BILIBILI', 'ENABLE_YOUTUBE', 'ENABLE_CODENAV', 'ENABLE_AI_CODEFATHER',
];

getUserConfigValue(key, userId?)       // 读取（DB → env → 默认）
setUserConfigValue(key, value, userId) // 写入（密钥自动加密）
deleteUserConfigValue(key, userId)     // 删除
getEffectiveConfig(userId)             // 全部配置及来源
```

### 8.2 加密服务 (`services/encryption.ts`)
```typescript
encrypt(text: string): string      // AES-256-GCM → iv:authTag:ciphertext
decrypt(text: string): string      // 解密，非加密数据原样返回
isEncrypted(text: string): boolean // 检测 hex:hex:hex 格式
```

### 8.3 YouTube API 代理获取
```typescript
getProxyAgent(userId?) // getUserConfigValue('YOUTUBE_PROXY_URL', userId)
// 所有 YouTube 服务函数均接受可选 userId 参数
```

### 8.4 DeepSeek AI 密钥获取
```typescript
chat(messages, model?, userId?)          // getUserConfigValue('DEEPSEEK_API_KEY', userId)
checkVeracity(title, content, url, userId?) // 同上
```

### 8.5 代理管理器 (`services/proxy-manager.ts`)

```typescript
class ProxyManager {
  private instances: Map<string, ProxyInstance>  // hash → { hash, url, port, process, userIds }
  private usedPorts: Set<number>                 // 端口池 (15733~15833)

  async init(): Promise<void>                    // 启动时恢复所有代理
  async register(userId: string, url: string): Promise<void>  // 注册订阅
  unregister(userId: string): void               // 注销订阅
  shutdown(): void                               // 关闭所有实例
  getProxyUrl(userId: string): string | null     // 获取代理地址
}
```

**mihomo 配置模板：**
```yaml
mixed-port: {port}
allow-lan: false
mode: rule
log-level: warning
proxy-providers:
  provider1:
    type: http
    url: "{subscriptionUrl}"
    interval: 86400
proxy-groups:
  - name: Proxy
    type: select
    use:
      - provider1
rules:
  - MATCH,Proxy
```

**配置要点：**
- 使用 `type: select` 而非 url-test，避免启动延迟
- 去掉 GEOIP 规则（MMDB 数据库在国内可能无法下载）
- interval: 86400（24 小时自动更新节点列表）

**关键行为：**
- 进程崩溃自动重启（2 秒延迟）
- 同一订阅 URL 共享同一 mihomo 实例（MD5 hash 前 8 位）
- 服务器重启自动恢复（init() 扫描所有用户配置）
- 端口范围 15733~15833（上限 100 个实例）

---

## 9. 数据库迁移策略

所有迁移在 `sqlite.ts` 中顺序执行，try/catch 保证幂等性：

```typescript
// 用户表迁移
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch {}
// 资源表迁移
try { db.exec(`ALTER TABLE news_items ADD COLUMN resource_type TEXT DEFAULT 'keyword'`); } catch {}
try { db.exec(`UPDATE news_items SET resource_type = 'creator' WHERE creator_id IS NOT NULL AND resource_type IS NULL`); } catch {}
```
