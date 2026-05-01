# LearnHub 配置文档

## 1. 环境变量配置

### 1.1 必需配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥，用于用户认证令牌签发 | — |

### 1.2 加密配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CONFIG_ENCRYPTION_KEY` | 用户 API 密钥加密密钥（AES-256-GCM），**生产环境务必自定义** | `learnhub-default-key-not-for-prod!!` |

> `CONFIG_ENCRYPTION_KEY` 用于派生 AES-256 加密密钥（通过 SHA-256 哈希）。生产环境应设置为足够强度的随机字符串。默认密钥仅用于开发，生产环境必须修改。

### 1.3 数据源搜索质量阈值

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BILIBILI_MIN_VIEWS` | Bilibili 关键词搜索最低播放量阈值 | 5000 |
| `BILIBILI_MIN_LIKES` | Bilibili 关键词搜索最低点赞数阈值 | 200 |
| `BILIBILI_MIN_FAVORITES` | Bilibili 关键词搜索最低收藏数阈值 | 100 |
| `YOUTUBE_MIN_VIEWS` | YouTube 关键词搜索最低播放量阈值 | 10000 |
| `YOUTUBE_MIN_LIKES` | YouTube 关键词搜索最低点赞数阈值 | 500 |

**注意**：API 密钥（`DEEPSEEK_API_KEY`、`YOUTUBE_API_KEY`）、代理地址（`YOUTUBE_PROXY_URL`）和订阅链接（`YOUTUBE_SUBSCRIPTION_URL`）不再需要全局环境变量。每个用户可在前端设置页自行配置，配置值加密存储于 `user_config` 表。开发者可在 `.env` 中保留这些变量用于本地开发和测试。

**代理自动配置**：`YOUTUBE_PROXY_URL` 不再需要用户手动输入。用户配置 `YOUTUBE_SUBSCRIPTION_URL`（机场订阅链接）后，服务器自动启动 mihomo 实例并写入 `YOUTUBE_PROXY_URL`，整个过程对用户透明。

### 1.4 SMTP 邮件配置（同时决定管理员账号）

用于发送注册验证码。如不配置，开发模式会在控制台输出验证码。

**重要**：`SMTP_USER` 邮箱对应的注册账号会自动成为管理员（`role = 'admin'`），可访问管理后台。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SMTP_HOST` | SMTP 服务器地址 | smtp.gmail.com |
| `SMTP_PORT` | SMTP 端口 | 587 |
| `SMTP_USER` | SMTP 用户名（邮箱地址）— **此邮箱注册时自动成为管理员** | — |
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

### 1.5 MCP 配置

| 变量 | 说明 |
|------|------|
| `UPSTASH_CONTEXT7_API_KEY` | Context7 API 密钥，用于获取最新技术文档 |

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
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);
```

| 字段 | 说明 |
|------|------|
| `role` | `'user'` 普通用户 / `'admin'` 管理员（可访问管理后台） |
| `status` | `'active'` 正常 / `'frozen'` 已冻结（无法登录） |

**管理员分配规则：**
- 注册时邮箱匹配 `SMTP_USER` 环境变量 → `role = 'admin'`
- 其他邮箱 → `role = 'user'`

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

#### user_config（用户配置表）

```sql
CREATE TABLE user_config (
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (key, user_id)
);
```

**支持的配置项：**

| key | 类型 | 加密存储 | 默认行为 |
|-----|------|----------|----------|
| `DEEPSEEK_API_KEY` | API 密钥 | ✅ AES-256-GCM | 无全局默认，用户必须配置才能使用 AI 功能 |
| `YOUTUBE_API_KEY` | API 密钥 | ✅ AES-256-GCM | 无全局默认，用户必须配置才能使用 YouTube 搜索 |
| `YOUTUBE_PROXY_URL` | 代理地址 | ✅ AES-256-GCM | 系统自动配置（用户配置订阅链接后自动生成），无需手动设置 |
| `YOUTUBE_SUBSCRIPTION_URL` | 订阅链接 | ✅ AES-256-GCM | 无全局默认，用户输入机场订阅链接后服务器自动启动代理 |
| `ENABLE_BILIBILI` | 开关 | ❌ | 默认为 `'true'` |
| `ENABLE_YOUTUBE` | 开关 | ❌ | 默认为 `'true'` |
| `ENABLE_CODENAV` | 开关 | ❌ | 默认为 `'true'` |
| `ENABLE_AI_CODEFATHER` | 开关 | ❌ | 默认为 `'true'` |

**加密存储格式**（AES-256-GCM）：
```
hexIV(32字符):hexAuthTag(32字符):hexCiphertext(可变)
```

#### config（系统配置表）

```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**系统配置键：**

| key | value | 说明 |
|-----|-------|------|
| `registration_enabled` | `'true'` / `'false'` | 是否允许新用户注册（管理后台控制） |

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
// 管理员迁移
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch (e) {}
// resource_type 迁移
try { db.exec(`ALTER TABLE news_items ADD COLUMN resource_type TEXT DEFAULT 'keyword'`); } catch (e) {}
try { db.exec(`UPDATE news_items SET resource_type = 'creator' WHERE creator_id IS NOT NULL AND resource_type IS NULL`); } catch (e) {}
```

---

## 3. 用户配置系统

### 3.1 配置服务函数

所有配置读取/写入集中管理在 `server/src/services/config.ts`：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getUserConfigValue` | `(key, userId?)` | `string \| null` | 查询用户配置 → 回退 env → 默认值 |
| `setUserConfigValue` | `(key, value, userId)` | `void` | 写入用户配置（密钥自动加密） |
| `deleteUserConfigValue` | `(key, userId)` | `void` | 删除用户配置（恢复默认） |
| `getEffectiveConfig` | `(userId)` | `Record<string, {value, source}>` | 获取全部配置及来源信息 |

### 3.2 配置读取优先级

```
1. user_config 表（用户设置）        ← 优先级最高
2. process.env 环境变量               ← 回退（向后兼容）
3. ENABLE_* 键 → 默认 'true'         ← 数据源开关默认开启
4. 其他键 → null                      ← 未配置
```

### 3.3 配置来源指示

| source | 含义 | 前端显示 |
|--------|------|----------|
| `'user'` | 用户自己在设置页配置 | "使用个人密钥" |
| `'env'` | 继承自环境变量 | "使用服务器默认值" |
| `'none'` | 未配置 | "未配置" |
| `'default'` | 系统默认开启（仅开关） | "默认开启" |

### 3.4 前端设置页面

路径：`client/src/components/settings/SettingsView.tsx`

**API 密钥区：**
- DeepSeek API 密钥：密码输入框，显示/隐藏切换，保存/清除按钮
- YouTube API 密钥：同上
- 机场订阅链接：密码输入框，配置后系统自动设置 YouTube 代理
- 提示文字："配置订阅链接后自动设置 YouTube 代理，可访问 YouTube 数据源"

**数据源开关区：**
- Bilibili：开关 + "Bilibili 视频搜索（免费，无需密钥）" 说明
- YouTube：开关 + "YouTube 视频搜索（需要配置 API 密钥）" 说明
- 编程导航：开关 + "编程导航官方教程内容" 说明
- 鱼皮AI导航：开关 + "鱼皮AI导航官方教程内容" 说明

---

## 4. 代理管理

### 4.1 代理工作流程

```
用户输入订阅链接 → 服务器启动 mihomo → 自动写入 YOUTUBE_PROXY_URL → YouTube API 通过代理访问
```

用户只需在前端设置页输入机场订阅链接，系统自动完成以下流程：
1. 订阅链接加密存储于 `user_config` 表（AES-256-GCM）
2. `proxyManager.register()` 分配端口，生成 mihomo 配置，启动 mihomo 进程
3. 自动写入 `YOUTUBE_PROXY_URL` 到用户配置
4. YouTube API 调用时自动使用该代理

### 4.2 mihomo 安装

服务器需安装 mihomo（Clash Meta 内核）：

```bash
# 从 GitHub Release 下载（国内服务器需使用 ghproxy.net 镜像）
wget -O mihomo.deb https://github.com/MetaCubeX/mihomo/releases/latest/download/mihomo-linux-amd64-compatible.deb
dpkg -i mihomo.deb
mihomo --version
```

### 4.3 配置文件路径

| 路径 | 说明 |
|------|------|
| `server/data/proxy/{hash}/config.yaml` | 每个订阅实例的 mihomo 配置 |
| `server/data/proxy/{hash}/` | 实例运行目录（含缓存） |

### 4.4 SECRET_KEYS 定义

以下配置键在 `setUserConfigValue` 写入时自动加密，在 API 响应中自动掩码：

| key | 加密 | 掩码规则 |
|-----|------|----------|
| `DEEPSEEK_API_KEY` | ✅ AES-256-GCM | 前 3 + `****` + 后 4 |
| `YOUTUBE_API_KEY` | ✅ AES-256-GCM | 前 3 + `****` + 后 4 |
| `YOUTUBE_PROXY_URL` | ✅ AES-256-GCM | `http://***:***@hostname:port` |
| `YOUTUBE_SUBSCRIPTION_URL` | ✅ AES-256-GCM | 前 3 + `****` + 后 4 |

### 4.5 端口分配

| 属性 | 值 |
|------|-----|
| 起始端口 | 15733 |
| 结束端口 | 15833 |
| 最大实例数 | 100 |
| 分配方式 | 自动寻找最小可用端口，实例销毁时释放回池 |

---

## 5. 管理后台配置

### 5.1 访问方式

| 访问地址 | 说明 |
|----------|------|
| `http://localhost:3001/admin` | 管理后台（独立 HTML 页面，无需构建） |

### 5.2 管理员账号

管理员账号由 SMTP 配置决定：

1. 配置 `SMTP_USER` 环境变量（如 `your-email@qq.com`）
2. 使用该邮箱在系统中注册
3. 系统自动分配 `role = 'admin'`
4. 使用该账号登录管理后台即可

### 5.3 系统设置

| 配置项 | 说明 | 管理后台操作 |
|--------|------|-------------|
| `registration_enabled` | 允许新用户注册 | 设置页开关按钮 |

### 5.4 API 批量操作

`POST /api/dashboard/resources/batch-delete`

支持的 type 值：

| type | 效果 |
|------|------|
| `'keywords'` | 删除所有 `keyword_id IS NOT NULL` 的资源 |
| `'creators'` | 删除所有 `creator_id IS NOT NULL` 的资源 |
| `'direct_video'` | 删除所有 `resource_type = 'direct_video'` 的资源 |

`POST /api/dashboard/resources/batch-delete-by-ids`

```json
{ "ids": ["id1", "id2", "id3"] }
```

---

## 6. 定时任务

| 任务 | 时间 | 说明 |
|------|------|------|
| 博主内容自动收集 | 每天 08:00 | `node-cron` 定时触发全量博主内容收集 |
| 过期验证码清理 | 每小时 | 清理过期的邮箱验证码记录 |

---

## 7. 前端配置

### 7.1 Vite 代理

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### 7.2 API 基础路径

```typescript
// client/src/services/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

---

## 8. 错误处理

### 7.1 标准错误响应

```json
{
  "error": "错误描述信息"
}
```

### 7.2 HTTP 状态码

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 | 显示错误提示 |
| 401 | 未认证 | 清除 token，跳转登录页 |
| 403 | 无权限 / 账号冻结 | 显示无权限提示 / "账号已被冻结" |
| 404 | 资源不存在 | 显示 404 提示 |
| 500 | 服务器错误 | 显示错误提示，控制台打印错误 |

### 7.3 管理后台特殊状态码

| 状态码 | 场景 | 响应 |
|--------|------|------|
| 400 | 注册关闭时尝试注册 | `{ error: "当前服务已停用，无法注册新账号" }` |
| 403 | 非 admin 访问管理 API | `{ error: "无权限，仅管理员可操作" }` |
| 403 | 冻结账号尝试登录 | `{ error: "账号已被冻结，无法登录" }` |
| 400 | 管理员删除自己 | `{ error: "不能删除自己的账号" }` |
| 400 | 删除最后一名管理员 | `{ error: "不能删除最后一个管理员账号" }` |
| 400 | 冻结自己 | `{ error: "不能冻结自己的账号" }` |
| 400 | 冻结管理员 | `{ error: "不能冻结管理员账号" }` |

---

## 9. 健康检查

`GET /api/health` 返回：

```json
{ "status": "ok", "timestamp": 1714550400000 }
```

前端定时（60 秒间隔）轮询健康检查端点，监控服务状态。
