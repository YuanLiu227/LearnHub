# LearnHub — 学习内容搜索平台

> 关键词驱动的多源学习资源搜索工具，帮助开发者快速发现高质量学习内容

## 功能特性

- **关键词管理** — 添加感兴趣的关键词，灵活启用/暂停/归档/删除
- **多源聚合搜索** — 跨 Bilibili、YouTube、编程导航、鱼皮AI导航统一搜索
- **综合评分系统** — 热度 + 来源可信度 + 时效性 + 内容类型多维度评分排序
- **AI 内容处理** — 基于 DeepSeek-V3 的智能总结与质量评估
- **实时搜索进度** — 异步搜索 + 轮询进度反馈
- **灵活的资源管理** — 支持单条删除、按关键词归档
- **通知服务** — 浏览器通知和邮件通知

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite 6 + TypeScript + Tailwind CSS 4 |
| **状态管理** | Zustand |
| **后端** | Node.js + Express 5 + TypeScript (tsx 运行时) |
| **数据库** | SQLite (better-sqlite3) |
| **AI 服务** | SiliconFlow API (DeepSeek-V3) |
| **包管理** | npm workspaces |

## 数据源

| 数据源 | 内容类型 | 鉴权 |
|--------|----------|------|
| Bilibili | 视频教程 | 无需密钥 |
| YouTube | 英文视频教程 | YouTube Data API Key |
| 编程导航 (codefather.cn) | 技术文章/教程 | 无需密钥 |
| 鱼皮AI导航 (ai.codefather.cn) | AI 课程/教程 | 无需密钥 |

## 快速开始

### 1. 安装依赖

```bash
npm install
cd client && npm install
```

### 2. 配置环境变量

创建 `server/.env`:

```env
SILICONFLOW_API_KEY=your-api-key
YOUTUBE_API_KEY=your-youtube-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=recipient@example.com
```

### 3. 启动服务

```bash
npm run dev
```

### 4. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api

## 综合评分

```
综合分 = 热度(0.4) + 来源可信度(0.3) + 时效性(0.2) + 内容类型(0.1)
```

## 项目结构

```
├── client/                  # 前端 (React + Vite)
│   └── src/
│       ├── components/     # UI 组件
│       ├── pages/          # 页面
│       ├── services/       # API 服务
│       ├── stores/         # Zustand 状态管理
│       └── types/          # 类型定义
├── server/                  # 后端 (Express)
│   └── src/
│       ├── routes/         # API 路由
│       ├── services/       # 业务服务 (数据源/评分/AI/通知)
│       ├── db/             # SQLite 数据库
│       └── types/          # 类型定义
├── docs/                    # 文档
│   ├── 需求文档.md         # 需求规格说明
│   └── 项目总结.md         # 项目总结
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keywords` | 获取活跃关键词 |
| GET | `/api/keywords/all` | 获取全部关键词 |
| POST | `/api/keywords` | 添加关键词 |
| POST | `/api/keywords/archive` | 归档关键词 |
| DELETE | `/api/keywords/permanent` | 永久删除关键词 |
| PATCH | `/api/keywords` | 更新关键词 |
| POST | `/api/monitor` | 触发搜索 |
| GET | `/api/monitor/progress/:id` | 查询搜索进度 |
| GET | `/api/dashboard/stats` | 获取统计 |
| GET | `/api/dashboard/hotspots` | 获取资源列表 |
| GET | `/api/dashboard/search` | 搜索资源 |
| DELETE | `/api/dashboard/resource/:id` | 删除资源 |
| GET | `/api/config` | 获取配置 |
| PUT | `/api/config` | 更新配置 |

## License

MIT
