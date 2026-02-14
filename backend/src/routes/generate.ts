import { Router, Request, Response } from 'express';
import { Orchestrator } from '../agents/orchestrator.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { repoUrl, userPrompt } = req.body;

  if (!repoUrl || !repoUrl.includes('github.com')) {
    return res.status(400).json({ error: 'Invalid GitHub URL' });
  }

  // Check for SSE request
  const isSSE = req.headers.accept === 'text/event-stream';

  if (isSSE) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: progress\ndata: ${JSON.stringify({ step: "analysis", status: "running", message: "Initializing agents..." })}\n\n`);
  }

  const orchestrator = new Orchestrator();

  const sendEvent = (type: string, data: any) => {
    if (isSSE) {
      try {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        console.error("SSE write error:", e);
      }
    }
  };

  try {
    const result = await orchestrator.generateReadme(repoUrl, (step, status, message) => {
      sendEvent('progress', { step, status, message });
    }, userPrompt);

    if (isSSE) {
      sendEvent('result', result);
      res.end();
    } else {
      res.json(result);
    }
  } catch (error: any) {
    console.error("Generate error:", error);
    if (isSSE) {
      sendEvent('error', { message: error.message || 'Internal server error' });
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Improve endpoint — takes existing README + suggestions and returns enhanced version
router.post('/improve', async (req: Request, res: Response) => {
  const { readme, suggestions } = req.body;

  if (!readme) {
    return res.status(400).json({ error: 'Missing readme content' });
  }

  const orchestrator = new Orchestrator();

  try {
    const result = await orchestrator.improveReadme(
      readme,
      suggestions || 'Improve overall quality, add missing sections, enhance formatting'
    );
    res.json(result);
  } catch (error: any) {
    console.error("Improve error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
