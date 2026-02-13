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
} from "@modelcontextprotocol/sdk/types.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const HEADERS = {
  "User-Agent": "ReadmeResurrector-CodeReader",
  "Accept": "application/vnd.github.v3.raw", // Request raw content
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

const server = new Server(
  {
    name: "code-reader",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
        // GitHub API 'contents' endpoint without 'raw' header returns JSON with base64. 
        // But with "Accept: application/vnd.github.v3.raw", it returns raw content.

        // Limit to 10KB
        if (text.length > 10000) {
          return { path, content: text.substring(0, 10000) + "\n...[TRUNCATED]" };
        }
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
      // Very basic regexes for demonstration
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

    // Priority sorting
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
        // Truncate
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 100) {
          const chars = remainingTokens * 4;
          chunkedFiles.push({
            path: file.path,
            content: file.content.substring(0, chars) + "\n...[TRUNCATED FOR CONTEXT]"
          });
          currentTokens += remainingTokens;
        }
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(chunkedFiles, null, 2) }],
    };
  }

  throw new Error(`Tool ${name} not found`);
});

if (process.env.PORT) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId] instanceof StreamableHTTPServerTransport) {
      transport = transports[sessionId] as StreamableHTTPServerTransport;
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { transports[id] = transport; },
      });
      transport.onclose = () => { const sid = transport.sessionId; if (sid) delete transports[sid]; };
      await server.connect(transport);
    } else {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session" }, id: null });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;
    res.on("close", () => { delete transports[transport.sessionId]; });
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
