import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import keywordsRouter from './routes/keywords.js';
import aiRouter from './routes/ai.js';
import monitorRouter, { runMonitorInBackground } from './routes/monitor.js';
import configRouter from './routes/config.js';
import docsRouter from './routes/docs.js';
import dashboardRouter from './routes/dashboard.js';
import creatorsRouter, { runCreatorCollection } from './routes/creators.js';
import authRouter from './routes/auth.js';
import videosRouter from './routes/videos.js';
import adminRouter from './routes/admin.js';

// 加载环境变量 - 从 server 目录向上找 .env 文件
const envPath = path.join(process.cwd(), '.env');
console.log('[Server] Loading env from:', envPath);
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175',
  ],
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
app.use('/api/ai', aiRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/config', configRouter);
app.use('/api/docs', docsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/creators', creatorsRouter);
app.use('/api/auth', authRouter);
app.use('/api/videos', videosRouter);
app.use('/api/admin', adminRouter);

// 管理后台静态页面
app.use('/admin', express.static(path.join(process.cwd(), 'public/admin')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 测试环境变量
app.get('/api/test-env', (req, res) => {
  res.json({
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'set (length: ' + process.env.DEEPSEEK_API_KEY.length + ')' : 'not set',
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY ? 'set' : 'not set',
  });
});

// 测试 veracity 检查
app.get('/api/test-veracity', async (req, res) => {
  const { checkVeracity } = await import('./services/deepseek.js');
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
║   📚 LearnHub Server                                    ║
║   =========================================           ║
║                                                       ║
║   🚀 Server running on http://localhost:${PORT}         ║
║   📊 API Base: http://localhost:${PORT}/api             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

});

// 每日定时任务：早上 8:00 自动收集博主内容
import cron from 'node-cron';
cron.schedule('0 8 * * *', () => {
  console.log('[Cron] Running daily creator content collection at 08:00');
  runCreatorCollection('scheduled_daily');
});

export default app;
