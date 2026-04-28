import { Router } from 'express';
import { getContext7Docs, getTechDocs } from '../services/context7-mcp.js';

const router = Router();

interface TechDocRequest {
  technologies: string[];
}

/**
 * GET /api/docs/tech
 * 获取技术文档（使用 Context7 MCP）
 * 查询参数: tech - 技术名称，多个用逗号分隔
 */
router.get('/tech', async (req, res) => {
  try {
    const techParam = req.query.tech as string;
    const technologies = techParam
      ? techParam.split(',').map(t => t.trim())
      : ['React', 'Vite', 'Express', 'Tailwind CSS'];

    const docs = await getTechDocs(technologies);
    res.json({ docs });
  } catch (error: any) {
    console.error('Tech docs error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tech docs' });
  }
});

/**
 * POST /api/docs/query
 * 使用 Context7 查询特定技术文档
 */
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await getContext7Docs(query);
    res.json(result);
  } catch (error: any) {
    console.error('Doc query error:', error);
    res.status(500).json({ error: error.message || 'Failed to query docs' });
  }
});

export default router;
