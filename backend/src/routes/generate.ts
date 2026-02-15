import { Router, Request, Response } from 'express';
import { Orchestrator } from '../agents/orchestrator.js';

const router = Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

router.post('/', async (req: Request, res: Response) => {
  const { repoUrl, userPrompt, style } = req.body;

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
    }, userPrompt, style || 'standard');

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

// Improve endpoint — takes existing README + suggestions + custom prompt and returns enhanced version
router.post('/improve', async (req: Request, res: Response) => {
  const { readme, suggestions, customPrompt } = req.body;

  if (!readme) {
    return res.status(400).json({ error: 'Missing readme content' });
  }

  const orchestrator = new Orchestrator();

  // Combine suggestions with custom prompt
  let combinedSuggestions = suggestions || 'Improve overall quality, add missing sections, enhance formatting';
  if (customPrompt) {
    combinedSuggestions += `\n\nUser's additional instructions: ${customPrompt}`;
  }

  try {
    const result = await orchestrator.improveReadme(
      readme,
      combinedSuggestions
    );
    res.json(result);
  } catch (error: any) {
    console.error("Improve error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create PR endpoint — creates a GitHub PR with the generated README
router.post('/create-pr', async (req: Request, res: Response) => {
  const { repoUrl, readme, githubToken } = req.body;

  if (!repoUrl || !readme) {
    return res.status(400).json({ error: 'Missing repoUrl or readme content' });
  }

  const token = githubToken || GITHUB_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'GitHub token required. Provide a token with repo write access.' });
  }

  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }
    const owner = match[1];
    const repo = match[2].replace('.git', '');

    const headers: Record<string, string> = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ReadmeResurrector',
    };

    // 1. Get default branch and its SHA
    const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoResp.ok) throw new Error(`Failed to fetch repo info: ${repoResp.statusText}`);
    const repoData: any = await repoResp.json();
    const defaultBranch = repoData.default_branch;

    const refResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
    if (!refResp.ok) throw new Error(`Failed to get branch ref: ${refResp.statusText}`);
    const refData: any = await refResp.json();
    const baseSha = refData.object.sha;

    // 2. Create new branch
    const branchName = `readme-resurrector-${Date.now()}`;
    const branchResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
    if (!branchResp.ok) throw new Error(`Failed to create branch: ${branchResp.statusText}`);

    // 3. Check if README.md exists on default branch
    let existingSha: string | undefined;
    const existingResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=${defaultBranch}`, { headers });
    if (existingResp.ok) {
      const existingData: any = await existingResp.json();
      existingSha = existingData.sha;
    }

    // 4. Create/update README.md on new branch
    const contentBody: any = {
      message: '📝 Update README.md via README Resurrector',
      content: Buffer.from(readme).toString('base64'),
      branch: branchName,
    };
    if (existingSha) contentBody.sha = existingSha;

    const fileResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(contentBody),
    });
    if (!fileResp.ok) throw new Error(`Failed to create file: ${fileResp.statusText}`);

    // 5. Create PR
    const prResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '📝 Update README.md — Generated by README Resurrector',
        body: `## 🧟 README Resurrector\n\nThis README was automatically generated using [README Resurrector](https://readmere.com) — an AI-powered multi-agent system.\n\n**What's included:**\n- Auto-detected tech stack and project structure\n- Verified install/run/test commands from config files\n- Community insights and contributor acknowledgments\n\n---\n*Review the changes and merge when ready!*`,
        head: branchName,
        base: defaultBranch,
      }),
    });
    if (!prResp.ok) {
      const prErr = await prResp.text();
      throw new Error(`Failed to create PR: ${prErr}`);
    }
    const prData: any = await prResp.json();

    res.json({
      success: true,
      prUrl: prData.html_url,
      prNumber: prData.number,
      branchName,
    });
  } catch (error: any) {
    console.error("Create PR error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
