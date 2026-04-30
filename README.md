# Hot Monitor — 多源学习内容搜索平台

> 关键词驱动的多源学习资源搜索工具，支持关注博主内容自动收集，帮助开发者快速发现高质量学习内容

## 功能特性

- **关键词管理** — 添加感兴趣的关键词，灵活启用/暂停/归档/恢复/永久删除
- **博主关注** — 关注 Bilibili UP 主或 YouTube 频道，自动收集最新视频（仅按时间，无质量阈值）
- **多源聚合搜索** — 跨 Bilibili、YouTube、编程导航、鱼皮AI导航统一搜索
- **内容收藏** — 收藏/取消收藏资源，关联实体删除时自动级联清理
- **资源管理** — 标记完成（含视觉反馈）、单条删除、选择式批量删除、一键清空
- **关键词总览** — 展示所有关键词和博主（含已归档），支持一键恢复
- **AI 内容处理** — 基于 DeepSeek V4 Flash 的智能总结与质量评估
- **实时进度反馈** — 异步搜索 + 轮询进度反馈

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite 6 + TypeScript + Tailwind CSS 4 |
| **状态管理** | Zustand 5 |
| **动画** | motion/react |
| **后端** | Node.js + Express 5 + TypeScript (tsx 运行时) |
| **数据库** | SQLite (better-sqlite3) |
| **AI 服务** | DeepSeek API (DeepSeek V4 Flash) |
| **包管理** | npm workspaces |

## 数据源

| 数据源 | 内容类型 | 鉴权 | 用途 |
|--------|----------|------|------|
| Bilibili | 视频教程 | 无需密钥 | 关键词搜索 + 博主关注 |
| YouTube | 视频教程 | API Key | 关键词搜索 + 博主关注 |
| 编程导航 (codefather.cn) | 技术文章/教程 | 无需密钥 | 关键词搜索 |
| 鱼皮AI导航 (ai.codefather.cn) | AI 课程/教程 | 无需密钥 | 关键词搜索 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `server/.env`（参考 `server/.env.example`）:

```env
# 必需：AI 服务（DeepSeek 官方 API）
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 必需（如需 YouTube）：YouTube Data API
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_PROXY_URL=http://127.0.0.1:7890
```

### 3. 启动服务

```bash
npm run dev
```

### 4. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api

## 使用指南

### 关键词搜索
1. 在「关键词」标签页添加关键词（如 "React"、"机器学习"）
2. 切换到「搜索」标签页点击「开始搜索」
3. 系统自动跨源搜索并展示结果

### 关注博主
1. 在「博主」标签页输入 UP 主名称或频道 @handle
2. 系统自动收集该博主最新视频（仅按时间筛选，不设热度阈值）
3. 点击博主卡片上的外部链接图标可跳转到博主主页

### 资源批量管理
- **清空**：一键删除当前标签页（关键词/博主）所有资源，含确认弹窗
- **选择模式**：点击「选择」进入选择模式，勾选目标资源后点击「批量删除」
- 选择模式下底部浮动栏显示已选数量，确认后只删除勾选的资源

### 收藏与资源管理
- 点击星标收藏资源，收藏后自动移出资源总览，仅在「收藏资源」标签页显示
- 点击勾选标记为已完成（绿色边框 + 删除线视觉反馈）
- 收藏/归档操作含二次确认，防止误操作

## 综合评分公式（关键词搜索）

```
综合分 = 热度(0.4) + 来源可信度(0.3) + 时效性(0.2) + 内容类型(0.1)
```

## 项目结构

```
├── client/                   # 前端 (React + Vite)
│   └── src/
│       ├── components/       # UI 组件（含 creator-manager/）
│       ├── pages/            # 页面（Home.tsx 主页面）
│       ├── services/         # API 服务
│       ├── stores/           # Zustand 状态管理
│       └── types/            # 类型定义
├── server/                   # 后端 (Express)
│   └── src/
│       ├── routes/           # API 路由
│       ├── services/         # 业务服务（数据源/评分/AI/博主收集）
│       ├── db/               # SQLite 数据库
│       └── types/            # 类型定义
├── docs/                     # 文档
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| **关键词** | | |
| GET | `/api/keywords` | 获取活跃关键词 |
| GET | `/api/keywords/all` | 获取全部关键词（含归档） |
| POST | `/api/keywords` | 添加关键词 |
| POST | `/api/keywords/archive` | 归档关键词 |
| POST | `/api/keywords/restore` | 恢复关键词 |
| DELETE | `/api/keywords/permanent` | 永久删除关键词 |
| PATCH | `/api/keywords/:id` | 更新关键词 |
| **博主关注** | | |
| GET | `/api/creators` | 获取活跃博主 |
| GET | `/api/creators/all` | 获取全部博主（含归档） |
| POST | `/api/creators` | 添加博主 |
| POST | `/api/creators/archive/:id` | 归档博主 |
| POST | `/api/creators/restore/:id` | 恢复博主 |
| DELETE | `/api/creators/permanent/:id` | 永久删除博主 |
| PATCH | `/api/creators/:id` | 更新博主 |
| POST | `/api/creators/collect` | 触发博主内容收集 |
| GET | `/api/creators/collect/progress/:id` | 收集进度查询 |
| **监控/搜索** | | |
| POST | `/api/monitor` | 触发全量关键词搜索 |
| GET | `/api/monitor/progress/:id` | 查询搜索进度 |
| **资源管理** | | |
| GET | `/api/dashboard/stats` | 获取统计概览 |
| GET | `/api/dashboard/hotspots` | 获取资源列表（分页） |
| GET | `/api/dashboard/search` | 搜索已有资源 |
| PATCH | `/api/dashboard/resource/:id` | 更新资源（收藏/完成） |
| DELETE | `/api/dashboard/resource/:id` | 删除单个资源 |
| POST | `/api/dashboard/resources/batch-delete` | 按类型清空资源 |
| POST | `/api/dashboard/resources/batch-delete-by-ids` | 按 ID 批量删除 |
| **配置** | | |
| GET | `/api/config` | 获取配置 |
| PUT | `/api/config` | 更新配置 |
| **其他** | | |
| GET | `/api/health` | 健康检查 |

## License

MIT
