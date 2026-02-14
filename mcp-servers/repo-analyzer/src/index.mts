#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

// Types
interface FileNode {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface RepoAnalysis {
  tree: FileNode[];
  languageBreakdown: Record<string, number>;
  keyFiles: string[];
  entryPoints: string[];
  configFiles: string[];
  testDirs: string[];
  fileCount: number;
  totalSize: number;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const HEADERS = {
  "User-Agent": "ReadmeResurrector-Analyzer",
  "Accept": "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
};

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
}

function isKeyFile(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase();
  return [
    'readme.md', 'package.json', 'cargo.toml', 'pyproject.toml',
    'go.mod', 'makefile', 'dockerfile', 'gemfile', 'pom.xml',
    'requirements.txt', 'setup.py', 'composer.json'
  ].includes(name || '');
}

function isEntryPoint(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase();
  if (!name) return false;
  return /^(main|index|app|server|cli)\.(js|ts|py|go|rs|java|rb|php)$/.test(name);
}

function isConfigFile(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase();
  if (!name) return false;
  return name.includes('config') || name.startsWith('.') || name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.json');
}

function isTestDir(path: string): boolean {
  return path.includes('test') || path.includes('spec') || path.includes('__tests__');
}

function createServer() {
  const s = new Server(
    { name: "repo-analyzer", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  s.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "analyze_repository",
          description: "Analyzes a GitHub repository structure via GitHub API",
          inputSchema: {
            type: "object",
            properties: {
              repoUrl: { type: "string", description: "Full GitHub repository URL" },
            },
            required: ["repoUrl"],
          },
        },
        {
          name: "get_repo_metadata",
          description: "Fetches repository metadata",
          inputSchema: {
            type: "object",
            properties: {
              repoUrl: { type: "string" },
            },
            required: ["repoUrl"],
          },
        },
        {
          name: "identify_important_files",
          description: "ranks top 20 most important files",
          inputSchema: {
            type: "object",
            properties: {
              fileTree: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    type: { type: "string" }
                  }
                },
              },
            },
            required: ["fileTree"],
          },
        },
      ],
    };
  });

  s.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    if (name === "analyze_repository") {
      const { repoUrl } = args as { repoUrl: string };
      const repoInfo = parseGithubUrl(repoUrl);
      if (!repoInfo) throw new Error("Invalid GitHub URL");

      const repoResp = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, { headers: HEADERS });
      if (!repoResp.ok) throw new Error(`Failed to fetch repo info: ${repoResp.statusText}`);
      const repoData: any = await repoResp.json();
      const defaultBranch = repoData.default_branch;

      const treeResp = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`, { headers: HEADERS });
      if (!treeResp.ok) throw new Error(`Failed to fetch repo tree: ${treeResp.statusText}`);
      const treeData: any = await treeResp.json();

      const files: FileNode[] = treeData.tree;

      const analysis: RepoAnalysis = {
        tree: files,
        languageBreakdown: {},
        keyFiles: [],
        entryPoints: [],
        configFiles: [],
        testDirs: [],
        fileCount: files.length,
        totalSize: files.reduce((acc, f) => acc + (f.size || 0), 0)
      };

      files.forEach(file => {
        if (file.type === 'blob') {
          const ext = getExtension(file.path);
          analysis.languageBreakdown[ext] = (analysis.languageBreakdown[ext] || 0) + 1;
          if (isKeyFile(file.path)) analysis.keyFiles.push(file.path);
          if (isEntryPoint(file.path)) analysis.entryPoints.push(file.path);
          if (isConfigFile(file.path)) analysis.configFiles.push(file.path);
          if (isTestDir(file.path)) {
            const dir = file.path.split('/')[0];
            if (!analysis.testDirs.includes(dir)) analysis.testDirs.push(dir);
          }
        }
      });

      return {
        content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
      };
    }

    if (name === "get_repo_metadata") {
      const { repoUrl } = args as { repoUrl: string };
      const repoInfo = parseGithubUrl(repoUrl);
      if (!repoInfo) throw new Error("Invalid GitHub URL");

      const resp = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, { headers: HEADERS });
      if (!resp.ok) throw new Error(`Failed to fetch repo metadata: ${resp.statusText}`);
      const data: any = await resp.json();

      const metadata = {
        name: data.name,
        description: data.description,
        stars: data.stargazers_count,
        language: data.language,
        license: data.license?.name || "None",
        topics: data.topics,
        defaultBranch: data.default_branch,
        updatedAt: data.updated_at
      };

      return {
        content: [{ type: "text", text: JSON.stringify(metadata, null, 2) }],
      };
    }

    if (name === "identify_important_files") {
      const { fileTree } = args as { fileTree: { path: string, type: string }[] };

      const scoredFiles = fileTree
        .filter(f => f.type === 'blob')
        .map(f => {
          let score = 0;
          const path = f.path.toLowerCase();
          const name = path.split('/').pop() || '';
          if (['package.json', 'cargo.toml', 'pyproject.toml', 'go.mod', 'pom.xml', 'build.gradle'].includes(name)) score += 100;
          if (name.includes('readme')) score += 90;
          if (/^(main|index|app|server)\./.test(name)) score += 80;
          if (name.includes('config') || name.includes('dockerfile') || name.includes('compose')) score += 60;
          if ((!path.includes('/') || path.startsWith('src/')) && !path.includes('test')) score += 50;
          if (name.includes('lock')) score -= 50;
          if (path.match(/\.(png|jpg|svg|ico|json|map)$/)) score -= 20;
          if (path.split('/').length > 4) score -= 10;
          if (path.includes('node_modules') || path.includes('dist') || path.includes('vendor')) score = -100;
          return { path: f.path, score };
        });

      scoredFiles.sort((a, b) => b.score - a.score);
      const topFiles = scoredFiles.slice(0, 20).map(f => f.path);

      return {
        content: [{ type: "text", text: JSON.stringify(topFiles, null, 2) }],
      };
    }

    throw new Error(`Tool ${name} not found`);
  });

  return s;
}

if (process.env.PORT) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

  // ── Streamable HTTP Transport ──
  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId] instanceof StreamableHTTPServerTransport) {
      transport = transports[sessionId] as StreamableHTTPServerTransport;
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
        },
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) delete transports[sid];
      };
      const server = createServer();
      await server.connect(transport);
    } else {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session" }, id: null });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  });

  // ── Legacy SSE Transport ──
  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;
    res.on("close", () => { delete transports[transport.sessionId]; });
    const server = createServer();
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport instanceof SSEServerTransport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No active SSE stream for session");
    }
  });

  const port = process.env.PORT;
  app.listen(port, () => {
    console.log(`Repo Analyzer MCP running on port ${port} (SSE + Streamable HTTP)`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

