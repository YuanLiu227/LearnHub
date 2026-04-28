# Hot Monitor - AI 资讯监控系统

> 自动发现 AI 领域资讯，及时通知用户，保持技术敏感度

---

## 一、需求说明

### 1.1 背景

AI 领域发展日新月异（Agent、Harness、Multi-Agent 等新概念层不出穷），开发人员需要及时获取最新资讯。手动搜索耗时且容易错过热点。

### 1.2 核心功能

| 功能 | 描述 |
|------|------|
| **手动监控** | 用户输入关键词，当该关键词相关真实内容出现时，第一时间通知 |
| **自动监控** | 定时搜集用户指定范围内的热点，用户可查看 |
| **AI 识别** | 利用 AI 判断内容真伪，过滤虚假/夸大内容 |
| **多源聚合** | 从多个数据源获取信息，避免单一来源 |

### 1.3 产品形式

| 形式 | 说明 |
|------|------|
| **响应式 Web 页面** | 兼容桌面/平板/手机 |
| **Agent Skills** | 封装成技能，供其他 AI 调用 |

---

## 二、技术选型

### 2.1 前端技术栈

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| **React** | 19.x | 虚拟 DOM 性能优秀，生态成熟 |
| **Vite** | 6.x | 极快的冷启动和 HMR，替代 webpack |
| **TypeScript** | 5.x | 类型安全，减少运行时错误 |
| **Tailwind CSS** | 4.x | 原子化 CSS，快速构建响应式界面 |
| **shadcn/ui** | latest | 可复制粘贴源码，完全自定义 |
| **Zustand** | latest | 轻量状态管理，比 Redux 简单 |
| **Lucide React** | latest | 图标库，树摇友好 |
| **Axios** | latest | HTTP 客户端，拦截器完善 |

### 2.2 后端技术栈

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| **Node.js** | 22.x LTS | 最新 LTS，支持 ESM，性能优秀 |
| **Express** | 5.x | 轻量 Web 框架，中间件生态丰富 |
| **TypeScript** | 5.x | 与前端保持一致，类型共享 |
| **better-sqlite3** | 11.x | 同步 API，简单直接，性能优秀 |
| **nodemailer** | 6.x | Node.js 标准邮件库 |
| **axios** | latest | HTTP 客户端，调用 OpenRouter |
| **cors** | latest | Express CORS 中间件 |

### 2.3 AI 服务

| 服务 | 用途 |
|------|------|
| **OpenRouter** | 统一入口，支持 Claude、DeepSeek、Gemma 等多种模型 |

### 2.4 MCP 服务（已集成）

| 服务 | NPM 包 | 用途 | 实现文件 |
|------|--------|------|----------|
| **Firecrawl** | `@firecrawl/mcp-server` | 智能网页抓取，提取正文 | `server/src/services/firecrawl-mcp.ts` |
| **Context7** | `@upstash/context7-mcp` | 获取最新技术文档，增强 AI 理解 | `server/src/services/context7-mcp.ts` |

### 2.5 数据源

| 数据源 | 获取方式 | 数据类型 |
|--------|----------|----------|
| **Hacker News** | Firecrawl 抓取 | 技术/AI 热点 |
| **Reddit** | Firecrawl 抓取 | 社区讨论热点 |
| **Twitter/X** | TwitterAPI.io API（可选） | 实时热点讨论 |
| **AI 导航站** | Firecrawl 抓取 | AI 产品/资讯 |
| **Google News** | Firecrawl 抓取 | 新闻热点 |

### 2.6 通知方式

| 方式 | 说明 |
|------|------|
| **浏览器通知** | Web Notifications API，桌面弹窗 |
| **邮件通知** | nodemailer + SMTP |

---

## 三、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              React + Vite 前端                       │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │     │
│  │  │Dashboard │ │关键词管理 │ │热点展示  │            │     │
│  │  └──────────┘ └──────────┘ └──────────┘            │     │
│  │  ┌──────────────────────────────────────────┐      │     │
│  │  │        浏览器通知 (Web Notifications)      │      │     │
│  │  └──────────────────────────────────────────┘      │     │
│  └─────────────────────────────────────────────────────┘     │
│                            │                                  │
│                       HTTP REST                              │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     Express 后端                             │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                    API Routes                       │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │     │
│  │  │Keywords │ │Monitor  │ │  Hot   │ │   AI   │   │     │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                    Services                           │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │     │
│  │  │OpenRouter│ │Veracity │ │Hot-     │ │Notifier│  │     │
│  │  │ Client   │ │ Check   │ │Collector│ │        │  │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              SQLite 数据库                           │     │
│  └─────────────────────────────────────────────────────┘     │
│                            │                                 │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│  ┌──────┴──────┐  ┌───────┴───────┐  ┌──────┴──────┐        │
│  │  Firecrawl  │  │   TwitterAPI  │  │ OpenRouter  │        │
│  │  (MCP)     │  │     .io       │  │    API      │        │
│  └─────────────┘  └───────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、目录结构

```
d:\AiCode\Hot-Monitor\
├── SPEC.md                          # 项目规格文档
├── README.md                        # 项目说明
├── .mcp.json                        # MCP 服务配置
├── client/                          # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.tsx   # 仪表盘
│   │   │   ├── keyword-manager/
│   │   │   │   ├── KeywordForm.tsx  # 关键词表单
│   │   │   │   └── KeywordList.tsx  # 关键词列表
│   │   │   ├── hot-topics/
│   │   │   │   └── HotTopics.tsx    # 热点展示
│   │   │   └── notification/
│   │   │       └── Notification.tsx # 通知组件
│   │   ├── pages/
│   │   │   └── Home.tsx             # 首页
│   │   ├── services/
│   │   │   └── api.ts               # API 客户端
│   │   ├── stores/
│   │   │   └── appStore.ts          # Zustand 状态
│   │   ├── App.tsx                  # 根组件
│   │   ├── main.tsx                 # 入口
│   │   └── index.css                # 全局样式
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── components.json
│   └── package.json
├── server/                           # 后端 (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── keywords.ts          # 关键词 CRUD
│   │   │   ├── monitor.ts          # 监控触发
│   │   │   ├── hot.ts              # 热点获取
│   │   │   └── ai.ts              # AI 对话
│   │   ├── services/
│   │   │   ├── openrouter.ts       # OpenRouter 客户端
│   │   │   ├── veracity.ts        # 内容真伪识别
│   │   │   ├── hot-collector.ts   # 热点搜集
│   │   │   ├── keyword-monitor.ts # 关键词监控
│   │   │   └── notifier.ts        # 通知服务
│   │   ├── db/
│   │   │   ├── sqlite.ts          # SQLite 连接
│   │   │   └── schema.ts          # 数据库 Schema
│   │   ├── types/
│   │   │   └── index.ts           # 类型定义
│   │   └── index.ts               # 服务入口
│   ├── package.json
│   └── tsconfig.json
└── skills/                           # Agent Skills（第二步）
    └── hot-monitor/
        └── skill.md
```

---

## 五、数据模型

### 5.1 Keyword（监控关键词）

```typescript
interface Keyword {
  id: string;              // 唯一标识，格式：kw_xxxxxxxx
  term: string;            // 关键词，如 "AI Agent"
  scope: string;           // 监控范围，如 "AI编程"
  enabled: boolean;        // 是否启用
  createdAt: number;       // 创建时间戳
  lastMatchedAt?: number;  // 最后匹配时间
}
```

### 5.2 NewsItem（新闻条目）

```typescript
interface NewsItem {
  id: string;              // 唯一标识
  keywordId: string;       // 关联的关键词 ID
  title: string;           // 标题
  url: string;            // 原文链接
  source: string;         // 数据来源
  sourceName: string;     // 来源名称
  publishedAt: number;    // 发布时间
  isReal: boolean;        // AI 识别是否为真实内容
  confidence: number;     // AI 置信度 (0-1)
  summary?: string;       // AI 生成的摘要
  matchedAt: number;      // 匹配时间
}
```

### 5.3 HotTopic（热点条目）

```typescript
interface HotTopic {
  id: string;              // 唯一标识
  title: string;           // 标题
  url: string;            // 原文链接
  source: string;         // 数据来源：hackernews | reddit | twitter | ainavigation | googlenews
  sourceName: string;     // 来源名称：Hacker News | Reddit | Twitter 等
  heat: number;           // 热度指数
  publishedAt: number;   // 发布时间
  scope: string;          // 所属范围
  summary?: string;       // AI 生成的摘要
}
```

---

## 六、API 设计

### 6.1 关键词管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/keywords | 添加关键词 |
| GET | /api/keywords | 获取所有关键词 |
| DELETE | /api/keywords?id=xxx | 删除关键词 |
| PATCH | /api/keywords?id=xxx | 更新关键词状态 |

### 6.2 监控功能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/monitor | 手动触发监控 |

### 6.3 热点功能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/hot | 获取热点列表 |

### 6.4 AI 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat | AI 对话接口 |

### 6.5 配置接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |

---

## 七、监控频率与提醒

### 7.1 监控频率

| 模式 | 频率 | 说明 |
|------|------|------|
| **自动热点搜集** | 每 30 分钟 | 定时抓取多源数据 |
| **关键词监控** | 每 15 分钟 | 检测用户关键词匹配的新内容 |
| **手动刷新** | 随时 | 用户点击刷新按钮 |

### 7.2 提醒方式

| 方式 | 说明 |
|------|------|
| **浏览器通知** | Web Notifications API，桌面弹窗 |
| **邮件通知** | nodemailer 发送到用户邮箱 |

---

## 八、开发步骤

### 第一阶段：后端开发

1. 初始化 server 项目
2. 配置 Express + CORS + SQLite
3. 实现 OpenRouter 客户端
4. 实现关键词 CRUD API
5. 实现热点搜集服务
6. 实现内容真伪识别
7. 实现关键词监控
8. 实现通知服务

### 第二阶段：前端开发

9. 初始化 client 项目
10. 配置 Tailwind + shadcn/ui
11. 实现 Zustand Store
12. 开发 Dashboard 页面
13. 开发关键词管理组件
14. 开发热点展示组件
15. 实现浏览器通知

### 第三阶段：Agent Skills

16. 设计 Skill 规范
17. 实现 Skill 逻辑
18. 编写 Skill 文档

---

## 九、环境变量

### 9.1 后端环境变量 (.env)

```env
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx

# SMTP 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=recipient@example.com

# 服务配置
PORT=3001
NODE_ENV=development
```

### 9.2 前端环境变量 (.env)

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 十、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-04-25 | 初始版本 |
