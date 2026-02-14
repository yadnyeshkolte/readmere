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

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(messages: any[], maxTokens: number = 4000) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.5,
          max_completion_tokens: maxTokens,
        }),
      });

      if (response.status === 429) {
        const retryAfter = 2;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API Error: ${err}`);
      }

      const data: any = await response.json();
      return data.choices[0].message.content;
    } catch (e: any) {
      lastError = e;
      if (e.message.includes("Rate limit")) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

function createServer() {
  const server = new Server(
    { name: "doc-generator", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "generate_readme",
          description: "Generates a comprehensive README.md using Groq LLM",
          inputSchema: {
            type: "object",
            properties: {
              metadata: { type: "object" },
              analysis: { type: "object" },
              codeSummaries: { type: "array" },
              signatures: { type: "array", description: "Function/class signatures extracted from code" },
              userPrompt: { type: "string", description: "Optional user instructions for README customization" },
            },
            required: ["metadata", "analysis", "codeSummaries"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    if (name === "generate_readme") {
      const { metadata, analysis, codeSummaries, signatures, userPrompt } = args as any;
      const cleanAnalysis = { ...analysis, tree: undefined, fileCount: analysis.tree?.length || analysis.fileCount };

      const systemPrompt = `You are a world-class technical writer who creates beautiful, comprehensive README.md files for open-source projects. You write READMEs that developers LOVE — clear, professional, and visually appealing.

Your README MUST include ALL of the following sections (skip only if truly irrelevant):

1. **Title & Badges** — Project name as H1, then shields.io badges for language, license, stars, build status
2. **Description** — 2-3 compelling sentences explaining what the project does and why it matters
3. **Features** — Bullet list of key features with emoji icons
4. **Tech Stack** — Table or badge list of technologies used
5. **Project Structure** — File tree showing key directories (use code block)
6. **Getting Started** — Prerequisites, installation steps, environment setup
7. **Usage** — Code examples showing how to use the project (with syntax-highlighted code blocks)
8. **API Reference** — If applicable, document key endpoints/functions with parameters and return types
9. **Configuration** — Environment variables, config files
10. **Contributing** — How to contribute, coding standards
11. **License** — License type

Rules:
- Return ONLY raw Markdown, no wrapping backticks or explanations
- Use proper Markdown formatting: headers, code blocks with language tags, tables, bullet lists
- Include REAL code examples based on the actual source code provided
- Make installation instructions specific to the tech stack detected
- Be thorough but concise — every section should add value`;

      let userContent = `## Repository Information

**Metadata:**
${JSON.stringify(metadata, null, 2).substring(0, 1500)}

**Analysis Summary:**
- Total files: ${cleanAnalysis.fileCount || '?'}
- Languages: ${JSON.stringify(cleanAnalysis.languageBreakdown || {}).substring(0, 500)}
- Key files: ${JSON.stringify(cleanAnalysis.keyFiles || []).substring(0, 500)}
- Entry points: ${JSON.stringify(cleanAnalysis.entryPoints || []).substring(0, 500)}
- Config files: ${JSON.stringify(cleanAnalysis.configFiles || []).substring(0, 300)}

**Key Source Code:**
${JSON.stringify(codeSummaries, null, 2).substring(0, 15000)}`;

      if (signatures && signatures.length > 0) {
        userContent += `\n\n**Function/Class Signatures:**\n${JSON.stringify(signatures, null, 2).substring(0, 3000)}`;
      }

      if (userPrompt) {
        userContent += `\n\n**User's Custom Instructions:**\n${userPrompt}`;
      }

      userContent += `\n\nGenerate the complete README.md now.`;

      const readme = await callGroq([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ], 4000);

      return {
        content: [{ type: "text", text: readme }],
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
    console.log(`Doc Generator MCP running on port ${port} (SSE + Streamable HTTP)`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
