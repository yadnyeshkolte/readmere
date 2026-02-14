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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const HEADERS = {
  "User-Agent": "ReadmeResurrector-CodeReader",
  "Accept": "application/vnd.github.v3.raw",
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

function createServer() {
  const server = new Server(
    { name: "code-reader", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "read_files",
          description: "Reads file contents from GitHub repo",
          inputSchema: {
            type: "object",
            properties: {
              repoUrl: { type: "string" },
              filePaths: { type: "array", items: { type: "string" } },
            },
            required: ["repoUrl", "filePaths"],
          },
        },
        {
          name: "extract_signatures",
          description: "Extracts function/class signatures from code",
          inputSchema: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" }
                  }
                }
              }
            },
            required: ["files"],
          },
        },
        {
          name: "smart_chunk",
          description: "Chunks code to fit context window",
          inputSchema: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" }
                  }
                }
              },
              maxTokens: { type: "number", default: 12000 }
            },
            required: ["files"],
          },
        },
        {
          name: "extract_commands",
          description: "Extracts verified install/run/test/build commands from project config files",
          inputSchema: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" }
                  }
                }
              }
            },
            required: ["files"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    if (name === "read_files") {
      const { repoUrl, filePaths } = args as { repoUrl: string; filePaths: string[] };
      const repoInfo = parseGithubUrl(repoUrl);
      if (!repoInfo) throw new Error("Invalid GitHub URL");

      const results = await Promise.all(filePaths.map(async (path) => {
        try {
          const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${path}`;
          const resp = await fetch(url, { headers: HEADERS });
          if (!resp.ok) return { path, content: `Error reading file: ${resp.statusText}` };
          const text = await resp.text();
          if (text.length > 10000) return { path, content: text.substring(0, 10000) + "\n...[TRUNCATED]" };
          return { path, content: text };
        } catch (e: any) {
          return { path, content: `Error: ${e.message}` };
        }
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }

    if (name === "extract_signatures") {
      const { files } = args as { files: { path: string, content: string }[] };
      const signatures = files.map(f => {
        const ext = f.path.split('.').pop()?.toLowerCase();
        let regex;
        if (['js', 'ts', 'tsx', 'jsx'].includes(ext || '')) {
          regex = /function\s+\w+\s*\(.*?\)|const\s+\w+\s*=\s*\(.*?\)\s*=>|class\s+\w+/g;
        } else if (ext === 'py') {
          regex = /def\s+\w+\s*\(.*?\):|class\s+\w+:/g;
        } else if (ext === 'go') {
          regex = /func\s+\w+\s*\(.*?\)/g;
        } else if (ext === 'rs') {
          regex = /fn\s+\w+\s*\(.*?\)|struct\s+\w+|impl\s+\w+/g;
        } else if (ext === 'java') {
          regex = /(public|private|protected)\s+[\w<>]+\s+\w+\s*\(.*?\)/g;
        }
        const matches = regex ? (f.content.match(regex) || []) : [];
        return { path: f.path, signatures: matches };
      });
      return {
        content: [{ type: "text", text: JSON.stringify(signatures, null, 2) }],
      };
    }

    if (name === "smart_chunk") {
      const { files, maxTokens = 12000 } = args as { files: { path: string, content: string }[], maxTokens?: number };
      let currentTokens = 0;
      const chunkedFiles = [];
      const sortedFiles = [...files].sort((a, b) => {
        const score = (name: string) => {
          if (name.includes('package.json') || name.includes('toml')) return 100;
          if (/^(main|index|app)\./.test(name)) return 80;
          if (name.includes('types') || name.includes('interface')) return 60;
          return 10;
        }
        return score(b.path.split('/').pop() || '') - score(a.path.split('/').pop() || '');
      });
      for (const file of sortedFiles) {
        if (currentTokens >= maxTokens) break;
        const tokens = Math.ceil(file.content.length / 4);
        if (currentTokens + tokens <= maxTokens) {
          chunkedFiles.push(file);
          currentTokens += tokens;
        } else {
          const remainingTokens = maxTokens - currentTokens;
          if (remainingTokens > 100) {
            const chars = remainingTokens * 4;
            chunkedFiles.push({ path: file.path, content: file.content.substring(0, chars) + "\n...[TRUNCATED FOR CONTEXT]" });
            currentTokens += remainingTokens;
          }
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify(chunkedFiles, null, 2) }],
      };
    }

    if (name === "extract_commands") {
      const { files } = args as { files: { path: string, content: string }[] };
      const commands: Record<string, string[]> = {
        install: [],
        run: [],
        test: [],
        build: [],
        lint: [],
        other: [],
      };

      for (const file of files) {
        const fileName = file.path.split('/').pop()?.toLowerCase() || '';

        // package.json — extract npm scripts
        if (fileName === 'package.json') {
          try {
            const pkg = JSON.parse(file.content);
            if (pkg.scripts) {
              for (const [key, val] of Object.entries(pkg.scripts)) {
                const cmd = `npm run ${key}`;
                if (['start', 'serve', 'dev'].includes(key)) commands.run.push(cmd);
                else if (['test', 'test:unit', 'test:e2e', 'test:watch'].includes(key)) commands.test.push(cmd);
                else if (['build', 'compile'].includes(key)) commands.build.push(cmd);
                else if (['lint', 'format', 'prettier'].includes(key)) commands.lint.push(cmd);
                else commands.other.push(cmd);
              }
            }
            // Detect package manager
            commands.install.push(pkg.packageManager?.startsWith('yarn') ? 'yarn install' :
              pkg.packageManager?.startsWith('pnpm') ? 'pnpm install' : 'npm install');
          } catch { }
        }

        // Makefile — extract targets
        if (fileName === 'makefile') {
          const targets = file.content.match(/^([a-zA-Z_-]+)\s*:/gm);
          if (targets) {
            for (const t of targets) {
              const target = t.replace(':', '').trim();
              if (['all', '.PHONY', '.DEFAULT'].includes(target)) continue;
              const cmd = `make ${target}`;
              if (['install', 'setup', 'deps'].includes(target)) commands.install.push(cmd);
              else if (['run', 'start', 'serve', 'dev'].includes(target)) commands.run.push(cmd);
              else if (['test', 'check'].includes(target)) commands.test.push(cmd);
              else if (['build', 'compile', 'release'].includes(target)) commands.build.push(cmd);
              else if (['lint', 'fmt', 'format'].includes(target)) commands.lint.push(cmd);
              else commands.other.push(cmd);
            }
          }
        }

        // Dockerfile — extract CMD and EXPOSE
        if (fileName === 'dockerfile') {
          const cmdMatch = file.content.match(/^(CMD|ENTRYPOINT)\s+(.+)$/m);
          if (cmdMatch) commands.run.push(`docker run <image> (${cmdMatch[2].trim()})`);
          commands.build.push('docker build -t <image-name> .');
          commands.run.push('docker run -p <port>:<port> <image-name>');
        }

        // docker-compose.yml
        if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml' || fileName === 'compose.yml') {
          commands.run.push('docker-compose up');
          commands.build.push('docker-compose build');
        }

        // requirements.txt
        if (fileName === 'requirements.txt') {
          commands.install.push('pip install -r requirements.txt');
        }

        // setup.py / pyproject.toml
        if (fileName === 'setup.py') {
          commands.install.push('pip install -e .');
        }
        if (fileName === 'pyproject.toml') {
          if (file.content.includes('[tool.poetry]')) {
            commands.install.push('poetry install');
            commands.run.push('poetry run python -m <module>');
          } else {
            commands.install.push('pip install -e .');
          }
        }

        // Cargo.toml
        if (fileName === 'cargo.toml') {
          commands.install.push('cargo build');
          commands.run.push('cargo run');
          commands.test.push('cargo test');
          commands.build.push('cargo build --release');
        }

        // go.mod
        if (fileName === 'go.mod') {
          commands.install.push('go mod download');
          commands.run.push('go run .');
          commands.test.push('go test ./...');
          commands.build.push('go build -o <binary> .');
        }

        // Gemfile
        if (fileName === 'gemfile') {
          commands.install.push('bundle install');
        }
      }

      // Deduplicate
      for (const key of Object.keys(commands)) {
        commands[key] = [...new Set(commands[key])];
      }

      // Remove empty categories
      const cleaned: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(commands)) {
        if (val.length > 0) cleaned[key] = val;
      }

      return {
        content: [{ type: "text", text: JSON.stringify(cleaned, null, 2) }],
      };
    }

    throw new Error(`Tool ${name} not found`);
  });

  return server;
}

if (process.env.PORT) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

  // ── Streamable HTTP Transport (MCP 2025-11-25) ──
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

  // ── Legacy SSE Transport (MCP 2024-11-05) ──
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
    console.log(`Code Reader MCP running on port ${port} (SSE + Streamable HTTP)`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
