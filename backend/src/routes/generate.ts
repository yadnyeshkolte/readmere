import { Router, Request, Response } from 'express';
import { Orchestrator } from '../agents/orchestrator.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { repoUrl } = req.body;

  if (!repoUrl || !repoUrl.includes('github.com')) {
    return res.status(400).json({ error: 'Invalid GitHub URL' });
  }

  // Check for SSE request
  const isSSE = req.headers.accept === 'text/event-stream';

  if (isSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  const orchestrator = new Orchestrator();

  const sendEvent = (type: string, data: any) => {
    if (isSSE) {
      res.write(`event: ${type}
`);
      res.write(`data: ${JSON.stringify(data)}

`);
    }
  };

  try {
    const result = await orchestrator.generateReadme(repoUrl, (step, status, message) => {
      sendEvent('progress', { step, status, message });
    });

    if (isSSE) {
      sendEvent('result', result);
      res.end();
    } else {
      res.json(result);
    }
  } catch (error: any) {
    if (isSSE) {
      sendEvent('error', { message: error.message });
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
