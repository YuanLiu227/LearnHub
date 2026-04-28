# Hot Monitor - AI 资讯监控系统

> 自动发现 AI 领域资讯，及时通知用户，保持技术敏感度

## 功能特性

- **关键词监控** - 添加感兴趣的关键词，自动匹配相关内容
- **多源聚合** - 从 Hacker News、Reddit、AI 导航站等多个来源获取热点
- **AI 识别** - 使用 OpenRouter AI 判断内容真伪，过滤虚假信息
- **实时通知** - 支持浏览器通知和邮件通知
- **响应式设计** - 适配桌面/平板/手机

## 技术栈

### 前端
- React 19 + Vite 6 + TypeScript
- Tailwind CSS 4
- Zustand 状态管理
- Lucide React 图标

### 后端
- Node.js + Express 5 + TypeScript
- SQLite 数据库
- OpenRouter AI API
- Firecrawl MCP (网页抓取)
- Context7 MCP (上下文增强)

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 2. 配置环境变量

```bash
# server/.env
OPENROUTER_API_KEY=your-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=recipient@example.com
PORT=3001

# client/.env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. 启动服务

```bash
# 启动后端 (在 server 目录)
npm run dev

# 启动前端 (在 client 目录)
npm run dev
```

### 4. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/keywords | 获取所有关键词 |
| POST | /api/keywords | 添加关键词 |
| DELETE | /api/keywords?id=xxx | 删除关键词 |
| POST | /api/monitor | 触发监控 |
| POST | /api/hot | 获取热点列表 |
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |

## 项目结构

```
hot-monitor/
├── client/               # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面
│   │   ├── services/    # API 服务
│   │   ├── stores/      # 状态管理
│   │   └── hooks/       # 自定义 Hooks
│   └── package.json
├── server/               # 后端 (Express)
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务服务
│   │   ├── db/          # 数据库
│   │   └── types/       # 类型定义
│   └── package.json
├── .mcp.json            # MCP 服务配置
├── SPEC.md              # 项目规格文档
└── README.md
```

## License

MIT
