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

async function callGroq(messages: any[], maxTokens = 1000): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            max_completion_tokens: maxTokens,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.choices[0].message.content;
}

function createServer() {
    const server = new Server(
        { name: "readme-scorer", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "validate_readme",
                    description: "Validates a generated README for quality and completeness with detailed category breakdown",
                    inputSchema: {
                        type: "object",
                        properties: {
                            readme: { type: "string", description: "The README markdown content to validate" },
                        },
                        required: ["readme"],
                    },
                },
            ],
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;

        if (name === "validate_readme") {
            const { readme } = args as { readme: string };
            const prompt = `Analyze this README.md and score it across 5 categories. Return ONLY valid JSON in this exact format:
{
  "score": <overall 0-100>,
  "categories": {
    "completeness": { "score": <0-100>, "label": "Completeness", "weight": 30, "detail": "<one line>" },
    "accuracy": { "score": <0-100>, "label": "Accuracy", "weight": 25, "detail": "<one line>" },
    "structure": { "score": <0-100>, "label": "Structure & Formatting", "weight": 20, "detail": "<one line>" },
    "readability": { "score": <0-100>, "label": "Readability", "weight": 15, "detail": "<one line>" },
    "visual": { "score": <0-100>, "label": "Visual Appeal", "weight": 10, "detail": "<one line>" }
  },
  "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Scoring guide:
- Completeness (30%): Has all essential sections — title, description, install, usage, features, tech stack, contributing, license
- Accuracy (25%): Code examples and instructions match the actual tech stack, commands are correct
- Structure (20%): Proper markdown formatting, logical section order, correct heading hierarchy
- Readability (15%): Clear language, good flow, appropriate length, no jargon without explanation
- Visual Appeal (10%): Badges, emoji, tables, syntax-highlighted code blocks, proper spacing

The overall score should be the weighted average of category scores.

README to analyze:
${readme.substring(0, 12000)}`;

            const validation = await callGroq([
                { role: "system", content: "You are a documentation QA specialist who scores README files. Return ONLY valid JSON, no markdown wrapping, no backticks." },
                { role: "user", content: prompt }
            ]);
            return {
                content: [{ type: "text", text: validation }],
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
        console.log(`README Scorer MCP running on port ${port} (SSE + Streamable HTTP)`);
    });
} else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
