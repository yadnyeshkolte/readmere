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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(messages: any[], maxTokens = 16384): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const systemInstruction = messages.find((m: any) => m.role === 'system')?.content || '';
    const contents = messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    const maxRetries = 2;
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 180_000);
            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
                    contents,
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: maxTokens,
                    },
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.status === 429) {
                const errText = await response.text();
                if (attempt < maxRetries) {
                    const waitMs = Math.min(30_000 * (attempt + 1), 120_000);
                    console.warn(`Gemini rate limit (attempt ${attempt + 1}), waiting ${waitMs / 1000}s...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }
                throw new Error(`Gemini API error: 429 ${errText}`);
            }

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${response.status} ${error}`);
            }

            const data: any = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
            return text;
        } catch (e: any) {
            lastError = e;
            if (e.name === 'AbortError') {
                throw new Error('Gemini API request timed out after 180s');
            }
            if (attempt < maxRetries && (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED'))) {
                const waitMs = Math.min(30_000 * (attempt + 1), 120_000);
                console.warn(`Gemini rate limit error (attempt ${attempt + 1}), waiting ${waitMs / 1000}s...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

function createServer() {
    const server = new Server(
        { name: "readme-improver", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "enhance_readme",
                    description: "Enhances and improves a README based on quality suggestions",
                    inputSchema: {
                        type: "object",
                        properties: {
                            readme: { type: "string", description: "The current README markdown content" },
                            suggestions: { type: "string", description: "Comma-separated improvement suggestions" },
                        },
                        required: ["readme", "suggestions"],
                    },
                },
            ],
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;

        if (name === "enhance_readme") {
            const { readme, suggestions } = args as { readme: string, suggestions: string };
            const prompt = `You are improving an existing README.md. Here are the specific areas to enhance:

SUGGESTIONS:
${suggestions}

RULES:
- Keep ALL existing content — do not remove any sections
- Add missing sections that were flagged in suggestions
- Fix any formatting issues (broken markdown, inconsistent headers)
- Improve clarity and readability where needed
- Add shields.io badges if missing
- Add emoji to section headers for visual appeal
- Ensure code blocks have correct language tags
- Make installation instructions more specific
- Return ONLY the complete improved README in raw Markdown
- Do NOT wrap in code blocks or add explanations

ORIGINAL README:
${readme.substring(0, 40000)}`;

            const improved = await callGemini([
                { role: "system", content: "You are an expert technical writer who improves open-source documentation. Return ONLY the improved README in raw Markdown. Never wrap in code blocks." },
                { role: "user", content: prompt }
            ], 16384);
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
        console.log(`README Improver MCP running on port ${port} (SSE + Streamable HTTP)`);
    });
} else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
