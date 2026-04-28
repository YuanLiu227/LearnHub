import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import keywordsRouter from './routes/keywords.js';
import hotRouter from './routes/hot.js';
import aiRouter from './routes/ai.js';
import monitorRouter from './routes/monitor.js';
import configRouter from './routes/config.js';
import docsRouter from './routes/docs.js';
import dashboardRouter from './routes/dashboard.js';

// 加载环境变量 - 从 server 目录向上找 .env 文件
const envPath = path.join(process.cwd(), '.env');
console.log('[Server] Loading env from:', envPath);
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/keywords', keywordsRouter);
app.use('/api/hot', hotRouter);
app.use('/api/ai', aiRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/config', configRouter);
app.use('/api/docs', docsRouter);
app.use('/api/dashboard', dashboardRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 测试环境变量
app.get('/api/test-env', (req, res) => {
  res.json({
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY ? 'set (length: ' + process.env.SILICONFLOW_API_KEY.length + ')' : 'not set',
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY ? 'set' : 'not set',
  });
});

// 测试 veracity 检查
app.get('/api/test-veracity', async (req, res) => {
  const { checkVeracity } = await import('./services/openrouter.js');
  try {
    const result = await checkVeracity(
      '测试标题：AI 技术新突破',
      '这是一篇关于人工智能最新发展的文章...',
      'https://example.com/news'
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🔥 Hot Monitor Server                               ║
║   =========================================           ║
║                                                       ║
║   🚀 Server running on http://localhost:${PORT}         ║
║   📊 API Base: http://localhost:${PORT}/api             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
