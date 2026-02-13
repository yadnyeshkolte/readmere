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
    // Send headers and flush immediately to establish the SSE connection
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx/proxies
    });
    // Send an initial heartbeat to confirm stream is open
    res.write(`event: progress\ndata: ${JSON.stringify({ step: "analysis", status: "running", message: "Initializing agents..." })}\n\n`);
  }

  const orchestrator = new Orchestrator();

  const sendEvent = (type: string, data: any) => {
    if (isSSE) {
      try {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        // Connection may have been closed by client
        console.error("SSE write error:", e);
      }
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
    console.error("Generate error:", error);
    if (isSSE) {
      sendEvent('error', { message: error.message || 'Internal server error' });
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
