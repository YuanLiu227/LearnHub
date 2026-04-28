import { Router } from 'express';
import { chat, checkVeracity } from '../services/openrouter.js';

const router = Router();

// AI 对话接口
router.post('/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required and must be an array' });
    }

    const response = await chat(messages, model);
    res.json({ content: response });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message || 'AI chat failed' });
  }
});

// 内容真伪识别
router.post('/veracity', async (req, res) => {
  try {
    const { title, content, url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const result = await checkVeracity(title, content, url || '');
    res.json(result);
  } catch (error: any) {
    console.error('Veracity check error:', error);
    res.status(500).json({ error: error.message || 'Veracity check failed' });
  }
});

export default router;
