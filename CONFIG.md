# Hot Monitor - 配置文件汇总

## 环境变量配置

项目根目录下的 `.env.example` 是环境变量配置模板。

**使用方式：**
```bash
# 复制模板为 .env
cp .env.example .env

# 编辑实际配置
nano .env
```

### 主要配置项

| 配置项 | 说明 | 必填 |
|--------|------|------|
| OPENROUTER_API_KEY | AI 服务 API Key | ✅ |
| FIRECRAWL_API_KEY | 网页搜索/抓取 API | ✅ |
| UPSTASH_CONTEXT7_API_KEY | 增强上下文 API | ❌ |
| TWITTER_API_* | Twitter API 配置 | ❌ |
| SMTP_* | 邮件通知配置 | ❌ |

---

## server/.env 内容

```env
# OpenRouter API（AI 服务）
OPENROUTER_API_KEY=your-openrouter-api-key

# Firecrawl API（网页搜索/抓取）
FIRECRAWL_API_KEY=your-firecrawl-api-key

# SMTP 邮件配置（通知功能）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=recipient@example.com

# 服务配置
PORT=3001
NODE_ENV=development
```

详细配置项请参考 `.env.example` 文件。

---

## 项目配置

### MCP 服务配置 (.mcp.json)

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-28e43f913a6f4d0298f7c5df1af77ba8"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "UPSTASH_CONTEXT7_API_KEY": "your-context7-api-key"
      }
    }
  }
}
```

---

## 数据源配置 (server/src/services/hot-collector.ts)

| 来源 | URL | 权重 |
|------|-----|------|
| Firecrawl 搜索 | 搜索 "AI编程 AI 技术 最新 2025" | 主来源 |
| Hacker News | https://news.ycombinator.com/ | 1.2 |
| Reddit AI | https://www.reddit.com/r/MachineLearning/ | 1.1 |
| AI Navigation | https://theresanaiforthat.com/ | 0.9 |

---

## 数据库 (SQLite)

- 路径: `server/data/hot-monitor.db`
- 表:
  - `keywords` - 监控关键词
  - `news_items` - 匹配的新闻记录
  - `config` - 应用配置

---

## API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/keywords | 获取所有关键词 |
| POST | /api/keywords | 添加关键词 |
| DELETE | /api/keywords | 删除关键词 |
| PATCH | /api/keywords | 更新关键词 |
| POST | /api/hot | 获取热点列表 |
| POST | /api/monitor | 触发手动监控 |
| GET | /api/monitor/history | 获取匹配历史 |
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |

---

## 前端配置

| 配置项 | 值 |
|--------|-----|
| API 地址 | http://localhost:3001/api |
| 前端端口 | 5173 |
| 热点刷新间隔 | 30 分钟 |
| 默认监控范围 | AI编程 |

---

## 功能开关

| 功能 | 状态 | 说明 |
|------|------|------|
| 浏览器通知 | ✅ | Web Notifications API |
| 邮件通知 | ⚙️ | 需配置 SMTP |
| AI 真伪验证 | ⚠️ | OpenRouter API 区域限制 |
| AI 内容摘要 | ⚠️ | OpenRouter API 区域限制 |

---

## 已知限制

1. **OpenRouter API 区域限制**: Anthropic、DeepSeek 等模型在中国地区不可用
2. **Context7 MCP**: 需要 UPSTASH_CONTEXT7_API_KEY 才能使用
3. **Twitter API**: 未配置，使用 Firecrawl 搜索作为替代

---

## 环境要求

- Node.js >= 18
- npm >= 9
- SQLite3
