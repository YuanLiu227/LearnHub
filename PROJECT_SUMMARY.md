# Hot Monitor - AI 资讯监控系统

## 项目概述

AI 资讯监控系统（Hot Monitor）是一个用于收集、监控 AI 相关资讯的智能系统。支持从多个权威渠道获取 AI 热点信息，并对用户关键词进行实时监控。

---

## 项目架构（v2.0）

### 三页面架构

| 页面 | 功能 |
|------|------|
| **仪表盘** | 统计卡片 + 热点列表 + 紧急热点标记 |
| **关键词** | 关键词管理（添加/删除/启用/禁用） |
| **搜索** | 搜索已收集的热点（标题/内容搜索） |

### 顶部功能栏

```
┌─────────────────────────────────────────────────────────────┐
│ 🔥 Hot Monitor                    [通知按钮] [立即检查] [设置] │
├─────────────────────────────────────────────────────────────┤
│ [仪表盘] [关键词] [搜索]                                      │
└─────────────────────────────────────────────────────────────┘
```

### 通知按钮（常驻右上角）

- **有更新时**：红色背景，显示 "X 条新热点"，可点击展开详情面板
- **无更新时**：灰色背景，显示 "暂无更新"
- **展开面板**：显示统计数据（总热点/今日新增/紧急/关键词数）

---

## 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + TypeScript + Tailwind CSS + Zustand |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | SQLite |
| AI 服务 | SiliconFlow (DeepSeek-V3) |
| 搜索服务 | Firecrawl MCP + Firecrawl API |
| 社交媒体 | TwitterAPI.io |

---

## 功能实现

### 1. 仪表盘页面

**统计卡片**：

| 卡片 | 计算方式 |
|------|---------|
| **总热点** | `SELECT COUNT(*) FROM news_items` |
| **今日新增** | `SELECT COUNT(*) FROM news_items WHERE matched_at > todayStart` |
| **紧急热点** | `SELECT COUNT(*) FROM news_items WHERE is_urgent = 1` |
| **监控关键词** | `SELECT COUNT(*) FROM keywords WHERE enabled = 1` |

**热点列表显示**：

| 字段 | 说明 |
|------|------|
| 紧急标记 | `is_urgent = 1` 时显示红色"紧急"标签 |
| 来源 | `sourceName` (Firecrawl Search / Twitter) |
| 热点等级 | `heat / 20` 转换为 1-5 级 |
| 关键词 | 触发该热点的监控关键词 |
| 标题 | 热点标题，点击跳转原文 |
| 时间 | 匹配时间 |

### 2. 关键词页面

- 关键词列表（显示启用/禁用状态）
- 添加关键词表单
- 启用/禁用切换
- 删除关键词

### 3. 搜索页面

- 搜索框（支持回车搜索）
- 搜索结果列表（同热点列表格式）
- 显示匹配数量

### 4. 立即检查按钮

点击后立即触发监控流程：
1. 获取所有启用的关键词
2. 并行 Firecrawl + Twitter 搜索
3. 保存结果到数据库
4. 更新统计和列表

### 5. 通知面板（常驻）

点击右上角通知按钮展开：
- 显示统计摘要
- 有新热点时显示"查看新热点"链接
- 点击外部自动关闭

---

## 数据库设计

### news_items 表

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT | 主键 |
| `keyword_id` | TEXT | 关联的关键词ID |
| `title` | TEXT | 热点标题 |
| `url` | TEXT | 原文链接 |
| `source` | TEXT | 来源标识（firecrawl/twitter） |
| `source_name` | TEXT | 来源名称 |
| `published_at` | INTEGER | 发布时间 |
| `is_real` | INTEGER | 是否真实 |
| `confidence` | REAL | 置信度 0-1 |
| `summary` | TEXT | 内容摘要 |
| `matched_at` | INTEGER | 匹配时间 |
| `is_urgent` | INTEGER | 是否紧急热点（0/1） |
| `heat` | REAL | 热度分数 0-100 |

---

## API 接口

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/dashboard/stats` | GET | 获取统计 |
| `/api/dashboard/hotspots` | GET | 获取热点列表 |
| `/api/dashboard/search` | GET | 搜索热点 |
| `/api/keywords` | GET/POST/DELETE/PATCH | 关键词管理 |
| `/api/monitor` | POST | 触发监控 |
| `/api/monitor/progress/:id` | GET | 获取监控进度 |

---

## 启动方式

```bash
npm run dev
```

访问 http://localhost:5173

---

## 环境变量

```bash
# AI 服务 (SiliconFlow)
SILICONFLOW_API_KEY=your_key

# Firecrawl
FIRECRAWL_API_KEY=your_key

# Twitter
TWITTERAPI_IO_KEY=your_key
ENABLE_TWITTER=true
```

---

## 版本记录

### v1.0 - 初始版本
- 热点动态 + 关键词监控
- Firecrawl + Twitter 双渠道
- AI 相关性/热度筛选

### v2.0 - 三页面重构
- 移除独立热点动态页面
- 仪表盘 + 关键词 + 搜索三页面
- 常驻通知按钮 + 展开面板
- 热点列表显示等级和关键词
- 立即检查按钮
