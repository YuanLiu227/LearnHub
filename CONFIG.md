# LearnHub — 配置文件汇总

## 环境变量配置

项目根目录下的 `server/.env.example` 是环境变量配置模板。

**使用方式：**
```bash
# 复制模板为 .env
cp server/.env.example server/.env

# 编辑实际配置
nano server/.env
```

---

## 必需配置

这些变量不配置则对应功能无法使用。

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek V4 Flash API 密钥，用于 AI 内容摘要、真实性校验 |
| `JWT_SECRET` | JWT 签名密钥，用于用户认证令牌签发 |

---

## server/.env 完整内容

```env
# ===== DeepSeek API（AI 服务）=====
# 用于：内容摘要、AI 质量评估
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# ===== Firecrawl API（网页搜索/抓取）=====
# 获取地址：https://www.firecrawl.dev/app/api-keys
FIRECRAWL_API_KEY=fc-your-firecrawl-api-key

# ===== YouTube Data API v3 =====
# 用于：YouTube 视频搜索 + 博主视频收集
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_PROXY_URL=http://127.0.0.1:7890

# ===== Bilibili（免费，无需 Key）=====
BILIBILI_MIN_VIEWS=5000
BILIBILI_MIN_LIKES=200
BILIBILI_MIN_FAVORITES=100

# ===== YouTube 关键词搜索阈值 =====
YOUTUBE_MIN_VIEWS=10000
YOUTUBE_MIN_LIKES=500

# ===== 邮件通知（SMTP）=====
# QQ 邮箱推荐配置（需开启 SMTP 服务并使用授权码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-auth-code
SMTP_FROM=YourName <your-email@qq.com>
NOTIFICATION_EMAIL=recipient@example.com

# ===== JWT 密钥 =====
JWT_SECRET=your-jwt-secret-key

# ===== 服务器配置 =====
PORT=3001
DB_PATH=server/data/hot-monitor.db

# ===== 数据源开关 =====
ENABLE_CODENAV=true
ENABLE_AI_CODEFATHER=true
```

---

## 环境变量详解

### DeepSeek API（必需）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek V4 Flash API 密钥 | — |

配置后启用 AI 内容摘要生成、文章质量评估、真实性校验功能。

### YouTube Data API（可选，但推荐）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `YOUTUBE_API_KEY` | Google Cloud 控制台申请 | — |
| `YOUTUBE_PROXY_URL` | 国内访问 YouTube API 需配置代理 | — |

YouTube 视频搜索需要 API Key（免费配额每日 10000 次）。国内服务器需要配置代理地址。

### Bilibili 搜索阈值

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BILIBILI_MIN_VIEWS` | 最低播放量 | 5000 |
| `BILIBILI_MIN_LIKES` | 最低点赞数 | 200 |
| `BILIBILI_MIN_FAVORITES` | 最低收藏数 | 100 |

仅**关键词搜索**时使用这些阈值过滤。**博主内容收集**不使用阈值。

### SMTP 邮件配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SMTP_HOST` | SMTP 服务器地址 | smtp.qq.com |
| `SMTP_PORT` | SMTP 端口 | 587 |
| `SMTP_SECURE` | 是否使用 SSL | false |
| `SMTP_USER` | SMTP 用户名（邮箱地址） | — |
| `SMTP_PASS` | SMTP 密码/授权码 | — |
| `SMTP_FROM` | 发件人地址，格式 `Name <email>` | — |

SMTP 配置用于发送注册验证码邮件。常见邮箱 SMTP 配置：

| 邮箱 | SMTP 主机 | 端口 | 备注 |
|------|-----------|------|------|
| QQ 邮箱 | smtp.qq.com | 587 | 需开启 SMTP 服务，使用授权码 |
| 163 邮箱 | smtp.163.com | 587 | 需开启 SMTP 服务，使用授权码 |
| Gmail | smtp.gmail.com | 587 | 需使用应用密码 |
| Resend | smtp.resend.com | 587 | SMTP 用户名为 `resend` |

> 如 SMTP 未配置，注册流程自动进入开发模式：验证码不会发送邮件，而是输出到服务端控制台。

### 数据源开关

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENABLE_CODENAV` | 启用编程导航（codefather.cn）搜索 | true |
| `ENABLE_AI_CODEFATHER` | 启用鱼皮AI导航（ai.codefather.cn）搜索 | true |

### 服务器配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | API 服务监听端口 | 3001 |
| `DB_PATH` | SQLite 数据库文件路径 | server/data/hot-monitor.db |

---

## MCP 配置 (.mcp.json)

项目根目录 `.mcp.json`：

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-your-firecrawl-api-key"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "UPSTASH_CONTEXT7_API_KEY": "ctx7sk-your-context7-api-key"
      }
    }
  }
}
```

| MCP 服务 | 用途 | API Key 获取 |
|----------|------|-------------|
| **Firecrawl** | 网页智能抓取与搜索 | https://www.firecrawl.dev/app/api-keys |
| **Context7** | 获取最新技术文档 | 注册 Context7 服务获取 |

---

## 数据库

| 属性 | 值 |
|------|-----|
| **引擎** | node:sqlite（Node.js 内置 v24+） |
| **默认路径** | `server/data/hot-monitor.db` |
| **WAL 模式** | 默认启用，提高并发读写性能 |

### 表结构

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户表 | id, email, password_hash, created_at |
| `verification_codes` | 邮箱验证码 | id, email, code, type, expires_at, used |
| `keywords` | 关键词 | id, term, scope, enabled, archived, created_at, user_id |
| `followed_creators` | 关注博主 | id, platform, channel_id, channel_name, enabled, archived, user_id |
| `news_items` | 学习资源 | id, keyword_id, title, url, source, heat, creator_id, completed, favorited, user_id |
| `hot_topics` | 热点话题 | id, title, url, source, heat, published_at, scope |
| `config` | 应用配置 | key, value, user_id |

---

## 前后端配置

| 配置项 | 值 |
|--------|-----|
| 前端开发地址 | http://localhost:5173 |
| 后端 API 地址 | http://localhost:3001 |
| API 代理（开发） | Vite proxy `/api` → `http://localhost:3001` |
| JWT 过期时间 | 7 天 |
| 图形验证码过期 | 5 分钟 |
| 邮箱验证码过期 | 10 分钟 |
| 博主收集定时任务 | 每天 08:00（node-cron） |
| 进度轮询间隔 | 500ms |
| 进度数据保留 | 任务完成后 5 分钟 |

---

## 功能开关状态

| 功能 | 状态 | 条件 |
|------|------|------|
| 邮箱注册 | ✅ 默认启用 | 需 SMTP 配置（否则开发模式） |
| 关键词搜索 | ✅ 默认启用 | 需至少一个启用关键词 |
| 博主关注 | ✅ 默认启用 | Bilibili（免费）/ YouTube（需 API Key） |
| 博主定时收集 | ✅ 默认启用 | 每天 08:00 自动执行 |
| AI 内容摘要 | ✅ 默认启用 | 需 `DEEPSEEK_API_KEY` |
| AI 真实性校验 | ✅ 默认启用 | 需 `DEEPSEEK_API_KEY` |
| Firecrawl 搜索 | ✅ 已集成 | 需配置 `.mcp.json` |
| Context7 文档 | ✅ 已集成 | 需配置 `.mcp.json` |
| 邮件通知 | ⚙️ 可配置 | 需 SMTP 配置 |
