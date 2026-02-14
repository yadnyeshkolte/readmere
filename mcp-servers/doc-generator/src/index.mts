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
const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(messages: any[], maxTokens: number = 4000) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  // Convert OpenAI-style messages to Gemini format
  const systemInstruction = messages.find((m: any) => m.role === 'system')?.content || '';
  const contents = messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
          contents,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 429) {
        const errText = await response.text();
        const waitMs = Math.min(30_000 * (attempt + 1), 120_000);
        console.warn(`Gemini rate limit (attempt ${attempt + 1}), waiting ${waitMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${err}`);
      }

      const data: any = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
      return text;
    } catch (e: any) {
      lastError = e;
      if (e.name === 'AbortError') {
        throw new Error('Gemini API request timed out after 90s');
      }
      if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) {
        const waitMs = Math.min(30_000 * (attempt + 1), 120_000);
        console.warn(`Gemini rate limit error (attempt ${attempt + 1}), waiting ${waitMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
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
          description: "Generates a comprehensive README.md using Gemini LLM",
          inputSchema: {
            type: "object",
            properties: {
              metadata: { type: "object" },
              analysis: { type: "object" },
              codeSummaries: { type: "array" },
              signatures: { type: "array", description: "Function/class signatures extracted from code" },
              insights: { type: "object", description: "Community insights: issues, PRs, contributors, releases" },
              verifiedCommands: { type: "object", description: "Verified install/run/test commands from config files" },
              style: { type: "string", enum: ["minimal", "standard", "detailed"], description: "Output style preset" },
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
      const { metadata, analysis, codeSummaries, signatures, insights, verifiedCommands, style = "standard", userPrompt } = args as any;
      const cleanAnalysis = { ...analysis, tree: undefined, fileCount: analysis.tree?.length || analysis.fileCount };

      // Style-specific system prompts and token limits
      const stylePrompts: Record<string, { prompt: string; tokens: number }> = {
        minimal: {
          tokens: 1500,
          prompt: `You are a concise technical writer. Generate a MINIMAL README.md — short, clean, and actionable.

Include ONLY these sections:
1. **Title & Badges** — H1 + key shields.io badges
2. **Description** — 1-2 sentences
3. **Quick Start** — Install + run commands ONLY (use verified commands if provided)
4. **Usage** — One simple code example
5. **License**

Rules:
- Return ONLY raw Markdown, no wrapping backticks
- Be extremely concise — no filler text
- Use verified commands exactly as provided when available
- Maximum ~150 lines total`
        },
        standard: {
          tokens: 3000,
          prompt: `You are a world-class technical writer who creates beautiful, comprehensive README.md files. You write READMEs that developers LOVE — clear, professional, and visually appealing.

Include these sections:
1. **Title & Badges** — H1 + shields.io badges
2. **Description** — 2-3 sentences
3. **Features** — Bullet list with emoji icons
4. **Tech Stack** — Technologies used
5. **Quick Start** — Prerequisites + install + run. Use verified commands if provided.
6. **Usage** — Code examples from actual source
7. **API Reference** — If applicable
8. **Configuration** — Env vars, config files
9. **Contributing** — Mention top contributors if available
10. **License**
11. **Recent Activity** — If release/PR data provided

Rules:
- Return ONLY raw Markdown, no wrapping backticks
- Use verified commands instead of guessing when available
- Include REAL code examples based on actual source code
- Be thorough but concise`
        },
        detailed: {
          tokens: 4000,
          prompt: `You are a world-class technical writer who creates beautiful, comprehensive README.md files for open-source projects. You write READMEs that developers LOVE — clear, professional, and visually appealing.

Your README MUST include ALL of the following sections (skip only if truly irrelevant):

1. **Title & Badges** — Project name as H1, then shields.io badges for language, license, stars, build status
2. **Description** — 2-3 compelling sentences explaining what the project does and why it matters
3. **Features** — Bullet list of key features with emoji icons
4. **Tech Stack** — Table or badge list of technologies used
5. **Project Structure** — File tree showing key directories (use code block)
6. **Getting Started** — Prerequisites, installation steps, environment setup. USE VERIFIED COMMANDS when provided.
7. **Usage** — Code examples showing how to use the project (with syntax-highlighted code blocks)
8. **API Reference** — If applicable, document key endpoints/functions with parameters and return types
9. **Configuration** — Environment variables, config files
10. **Contributing** — How to contribute, coding standards, mention top contributors if available
11. **License** — License type
12. **Changelog / Recent Activity** — If release or PR data is provided, include a changelog section
13. **Known Issues / Roadmap** — If open issues data is provided, mention notable known issues
14. **Community & Support** — If community health data is available, mention contributing guidelines, code of conduct

Rules:
- Return ONLY raw Markdown, no wrapping backticks or explanations
- Use proper Markdown formatting: headers, code blocks with language tags, tables, bullet lists
- Include REAL code examples based on the actual source code provided
- Use verified commands exactly as provided instead of guessing
- Be thorough — every section should add value
- When contributor data is available, acknowledge top contributors
- When issue/PR data is available, use it to show project activity and health`
        }
      };

      const styleConfig = stylePrompts[style] || stylePrompts.standard;
      const systemPrompt = styleConfig.prompt;
      const maxTokens = styleConfig.tokens;

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

      // Verified commands — high trust section
      if (verifiedCommands && Object.keys(verifiedCommands).length > 0) {
        userContent += `\n\n**⚠️ VERIFIED COMMANDS (use these exactly — extracted from actual config files):**`;
        for (const [category, cmds] of Object.entries(verifiedCommands)) {
          userContent += `\n${category}: ${JSON.stringify(cmds)}`;
        }
      }

      if (insights && Object.keys(insights).length > 0) {
        userContent += `\n\n**Community & Activity Insights:**`;
        if (insights.topContributors?.length > 0) {
          userContent += `\n- Top Contributors: ${JSON.stringify(insights.topContributors.map((c: any) => `${c.login} (${c.contributions} commits)`)).substring(0, 500)}`;
        }
        if (insights.recentIssues?.length > 0) {
          userContent += `\n- Recent Open Issues: ${JSON.stringify(insights.recentIssues.map((i: any) => `#${i.number}: ${i.title} [${i.labels.join(', ')}]`)).substring(0, 800)}`;
        }
        if (insights.recentPRs?.length > 0) {
          userContent += `\n- Recently Merged PRs: ${JSON.stringify(insights.recentPRs.map((p: any) => `#${p.number}: ${p.title} by ${p.author}`)).substring(0, 800)}`;
        }
        if (insights.latestReleases?.length > 0) {
          userContent += `\n- Latest Releases: ${JSON.stringify(insights.latestReleases.map((r: any) => `${r.tagName} - ${r.name} (${r.publishedAt})`)).substring(0, 500)}`;
        }
        if (insights.communityHealth) {
          userContent += `\n- Community Health Score: ${insights.communityHealth.healthPercentage}%`;
          userContent += `\n- Has Contributing Guide: ${insights.communityHealth.hasContributing}`;
          userContent += `\n- Has Code of Conduct: ${insights.communityHealth.hasCodeOfConduct}`;
          userContent += `\n- Has Issue Template: ${insights.communityHealth.hasIssueTemplate}`;
          userContent += `\n- Has PR Template: ${insights.communityHealth.hasPullRequestTemplate}`;
        }
      }

      if (userPrompt) {
        userContent += `\n\n**User's Custom Instructions:**\n${userPrompt}`;
      }

      userContent += `\n\nGenerate the complete README.md now.`;

      const readme = await callGemini([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ], maxTokens);

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
