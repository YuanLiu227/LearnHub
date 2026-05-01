# LearnHub 配置文档

## 1. 环境变量配置

### 1.1 必需配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥，用于 AI 摘要和质量评估 | — |
| `JWT_SECRET` | JWT 签名密钥，用于用户认证令牌签发 | — |

### 1.2 数据源配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 密钥，用于搜索和视频信息获取 | — |
| `YOUTUBE_PROXY_URL` | YouTube API 代理地址（国内环境需要配置） | — |
| `BILIBILI_MIN_VIEWS` | Bilibili 关键词搜索最低播放量阈值 | 5000 |
| `BILIBILI_MIN_LIKES` | Bilibili 关键词搜索最低点赞数阈值 | 200 |
| `BILIBILI_MIN_FAVORITES` | Bilibili 关键词搜索最低收藏数阈值 | 100 |
| `YOUTUBE_MIN_VIEWS` | YouTube 关键词搜索最低播放量阈值 | 10000 |
| `YOUTUBE_MIN_LIKES` | YouTube 关键词搜索最低点赞数阈值 | 500 |

### 1.3 SMTP 邮件配置

用于发送注册验证码。如不配置，开发模式会在控制台输出验证码。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SMTP_HOST` | SMTP 服务器地址 | smtp.gmail.com |
| `SMTP_PORT` | SMTP 端口 | 587 |
| `SMTP_USER` | SMTP 用户名（邮箱地址） | — |
| `SMTP_PASS` | SMTP 密码/应用密码 | — |
| `SMTP_FROM` | 发件人地址，格式 `Name <email>` | — |
| `NOTIFICATION_EMAIL` | 通知接收邮箱 | — |

**常用 SMTP 配置：**

| 邮箱服务 | SMTP 主机 | 端口 | 密码类型 |
|----------|-----------|------|----------|
| QQ 邮箱 | `smtp.qq.com` | 587 / 465 | 授权码（需开启 SMTP 服务） |
| 163 邮箱 | `smtp.163.com` | 587 / 465 | 授权码（需开启 SMTP 服务） |
| Brevo | `smtp-relay.brevo.com` | 587 | SMTP API Key |
| Resend | `smtp.resend.com` | 465 | API Key |

### 1.4 MCP 配置

| 变量 | 说明 |
|------|------|
| `FIRECRAWL_API_KEY` | Firecrawl API 密钥，用于网页智能抓取与搜索 |
| `UPSTASH_CONTEXT7_API_KEY` | Context7 API 密钥，用于获取最新技术文档 |

### 1.5 数据源开关

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENABLE_CODENAV` | 启用编程导航数据源 | `true` |
| `ENABLE_AI_CODEFATHER` | 启用鱼皮AI导航数据源 | `true` |

### 1.6 服务器配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | API 服务端口 | `3001` |
| `DB_PATH` | 数据库文件路径 | `server/data/hot-monitor.db` |

---

## 2. 数据库配置

### 2.1 数据库引擎

- **技术**：Node.js 内置 `node:sqlite`（`DatabaseSync`）
- **文件位置**：默认 `server/data/hot-monitor.db`，可通过 `DB_PATH` 自定义
- **WAL 模式**：启用 WAL（Write-Ahead Logging）提高并发读写性能

### 2.2 表结构

#### users（用户表）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

#### keywords（关键词表）

```sql
CREATE TABLE keywords (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  term TEXT NOT NULL,
  scope TEXT DEFAULT 'all',
  enabled INTEGER DEFAULT 1,
  archived INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_matched_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### followed_creators（博主关注表）

```sql
CREATE TABLE followed_creators (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('youtube', 'bilibili')),
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  enabled INTEGER DEFAULT 1,
  archived INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_fetched_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### news_items（学习资源表 — 核心表）

```sql
CREATE TABLE news_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keyword_id TEXT,
  creator_id TEXT,
  resource_type TEXT DEFAULT 'keyword',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_name TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  matched_at INTEGER NOT NULL,
  is_real INTEGER DEFAULT 1,
  confidence REAL DEFAULT 1.0,
  summary TEXT,
  is_urgent INTEGER DEFAULT 0,
  heat INTEGER DEFAULT 0,
  creator_name TEXT,
  completed INTEGER DEFAULT 0,
  favorited INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**resource_type 取值说明：**

| 值 | 含义 | 来源方式 | keyword_id | creator_id |
|-----|------|----------|------------|------------|
| `'keyword'` | 关键词搜索结果 | 关键词搜索触发 | 非空 | null |
| `'creator'` | 博主内容收集 | 博主收集触发 | null | 非空 |
| `'direct_video'` | 视频 URL 提交 | 用户直接粘贴链接 | null | null |

#### verification_codes（邮箱验证码表）

```sql
CREATE TABLE verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);
```

#### config（配置表）

```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  user_id TEXT
);
```

#### hot_topics（热点话题表）

```sql
CREATE TABLE hot_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  source TEXT,
  source_name TEXT,
  heat INTEGER DEFAULT 0,
  published_at INTEGER,
  scope TEXT,
  summary TEXT,
  fetched_at INTEGER
);
```

### 2.3 索引

```sql
CREATE INDEX idx_news_items_user_id ON news_items(user_id);
CREATE INDEX idx_news_items_keyword_id ON news_items(keyword_id);
CREATE INDEX idx_news_items_creator_id ON news_items(creator_id);
CREATE INDEX idx_news_items_resource_type ON news_items(resource_type);
CREATE INDEX idx_news_items_favorited ON news_items(favorited);
CREATE INDEX idx_keywords_user_id ON keywords(user_id);
CREATE INDEX idx_creators_user_id ON followed_creators(user_id);
```

### 2.4 迁移策略

所有迁移在 `server/src/db/sqlite.ts` 中顺序执行，使用 try/catch 保证幂等性：

```typescript
// 示例：新增 resource_type 列
try { db.exec(`ALTER TABLE news_items ADD COLUMN resource_type TEXT DEFAULT 'keyword'`); } catch (e) {}
try { db.exec(`UPDATE news_items SET resource_type = 'creator' WHERE creator_id IS NOT NULL`); } catch (e) {}
try { db.exec(`UPDATE news_items SET resource_type = 'keyword' WHERE keyword_id IS NOT NULL`); } catch (e) {}
```

---

## 3. API 批量操作

### 3.1 批量清空（按类型）

`POST /api/dashboard/resources/batch-delete`

支持的 type 值：

| type | 效果 |
|------|------|
| `'keywords'` | 删除所有 `keyword_id IS NOT NULL` 的资源 |
| `'creators'` | 删除所有 `creator_id IS NOT NULL` 的资源 |
| `'direct_video'` | 删除所有 `resource_type = 'direct_video'` 的资源 |

### 3.2 批量删除（按 ID）

`POST /api/dashboard/resources/batch-delete-by-ids`

```json
{ "ids": ["id1", "id2", "id3"] }
```

---

## 4. 定时任务

| 任务 | 时间 | 说明 |
|------|------|------|
| 博主内容自动收集 | 每天 08:00 | `node-cron` 定时触发全量博主内容收集 |
| 过期验证码清理 | 每小时 | 清理过期的邮箱验证码记录 |

---

## 5. 前端配置

### 5.1 Vite 代理

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### 5.2 API 基础路径

```typescript
// client/src/services/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

---

## 6. 错误处理

### 6.1 标准错误响应

```json
{
  "error": "错误描述信息"
}
```

### 6.2 HTTP 状态码

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 | 显示错误提示 |
| 401 | 未认证 | 清除 token，跳转登录页 |
| 404 | 资源不存在 | 显示 404 提示 |
| 500 | 服务器错误 | 显示错误提示，控制台打印错误 |

---

## 7. 健康检查

`GET /api/health` 返回：

```json
{ "status": "ok", "timestamp": 1714550400000 }
```

前端定时（60 秒间隔）轮询健康检查端点，监控服务状态。
