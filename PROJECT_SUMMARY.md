# LearnHub — 项目概要

> 此文档已被 `docs/项目总结.md` 取代。保留此文件作为快速参考入口。

---

## 项目概述

LearnHub 是一个关键词驱动的多源学习资源搜索平台（原名 Hot Monitor），从 AI 热点监控系统演进为完整的学习内容发现与管理工具。支持跨 Bilibili、YouTube、编程导航、鱼皮AI导航搜索，以及博主关注自动收集。

## 快速链接

- [完整需求文档](docs/需求文档.md)
- [项目总结（含架构演进与设计决策）](docs/项目总结.md)
- [配置指南](CONFIG.md)
- [技术规格](SPEC.md)

## 核心数据

| 项目 | 值 |
|------|-----|
| **技术栈** | React 19 + Express 5 + SQLite (node:sqlite) + DeepSeek V4 Flash |
| **包管理** | npm workspaces（client/ + server/） |
| **前端端口** | 5173（Vite dev server） |
| **后端端口** | 3001（Express API） |
| **数据库** | SQLite + WAL 模式，默认路径 `server/data/hot-monitor.db` |
| **认证** | JWT（7 天过期）+ bcryptjs + SVG 图形验证码 + 邮箱验证码 |
| **AI 服务** | DeepSeek V4 Flash API |
| **邮件** | nodemailer + SMTP（支持 QQ/163/Brevo/Resend） |
| **MCP** | Firecrawl + Context7 |

## 项目结构

```
LearnHub/
├── client/           # React 19 + Vite 6 前端
├── server/           # Express 5 + TypeScript 后端
├── docs/             # 项目文档
└── package.json      # npm workspaces 根配置
```

## 快速命令

```bash
npm install          # 安装所有依赖
npm run dev          # 同时启动前后端开发服务器
cd client && npm run build  # 构建前端
cd server && npm run build  # 构建后端
```

## 必需环境变量

```env
DEEPSEEK_API_KEY=sk-xxx    # AI 服务
JWT_SECRET=xxx             # 用户认证
```

---

*详细文档请参阅 [docs/项目总结.md](docs/项目总结.md) 和 [docs/需求文档.md](docs/需求文档.md)。*
