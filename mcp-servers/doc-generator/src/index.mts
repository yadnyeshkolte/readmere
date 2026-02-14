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
            },
            required: ["metadata", "analysis", "codeSummaries"],
          },
        },
        {
          name: "validate_readme",
          description: "Validates a generated README for quality and completeness",
          inputSchema: {
            type: "object",
            properties: {
              readme: { type: "string" },
            },
            required: ["readme"],
          },
        },
        {
          name: "enhance_readme",
          description: "Enhances specific sections of a README based on suggestions",
          inputSchema: {
            type: "object",
            properties: {
              readme: { type: "string" },
              suggestions: { type: "string" },
            },
            required: ["readme", "suggestions"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    if (name === "generate_readme") {
      const { metadata, analysis, codeSummaries } = args as any;
      const cleanAnalysis = { ...analysis, tree: undefined, fileCount: analysis.tree?.length || analysis.fileCount };

      const systemPrompt = `You are an expert technical writer specializing in open-source documentation. 
    Return ONLY the raw Markdown content.`;

      const userPrompt = `
    Repo Metadata: ${JSON.stringify(metadata).substring(0, 1000)}
    Repo Analysis Summary: ${JSON.stringify(cleanAnalysis).substring(0, 2000)}
    Key Code Chunks: ${JSON.stringify(codeSummaries).substring(0, 10000)}
    Generate the full README.md now. Return ONLY markdown.`;

      const readme = await callGroq([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], 2500);

      return {
        content: [{ type: "text", text: readme }],
      };
    }

    if (name === "validate_readme") {
      const { readme } = args as { readme: string };
      const prompt = `Analyze README and provide score/suggestions. JSON: { "score": number, "suggestions": ["string"] }\n\nREADME:\n${readme.substring(0, 10000)}`;
      const validation = await callGroq([
        { role: "system", content: "You are a documentation QA specialist. Return ONLY JSON." },
        { role: "user", content: prompt }
      ]);
      return {
        content: [{ type: "text", text: validation }],
      };
    }

    if (name === "enhance_readme") {
      const { readme, suggestions } = args as { readme: string, suggestions: string };
      const prompt = `Improve README based on: ${suggestions}\n\nOriginal README:\n${readme.substring(0, 15000)}`;
      const improved = await callGroq([
        { role: "system", content: "You are an expert technical writer. Improve the README." },
        { role: "user", content: prompt }
      ], 3000);
      return {
        content: [{ type: "text", text: improved }],
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
