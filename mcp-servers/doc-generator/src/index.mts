#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(messages: any[], maxTokens: number = 4000) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
  
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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const server = new Server(
  {
    name: "doc-generator",
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_readme") {
    const { metadata, analysis, codeSummaries } = args as any;

    // CRITICAL: Truncate analysis to remove the full file tree if it's too large
    // to prevent context window overflow.
    const cleanAnalysis = {
        ...analysis,
        tree: analysis.tree?.length > 100 ? undefined : analysis.tree,
        fileCount: analysis.tree?.length || analysis.fileCount
    };

    const systemPrompt = `You are an expert technical writer specializing in open-source documentation. 
    Your goal is to generate a high-quality, professional, and visually appealing README.md.
    
    Strictly follow this structure and formatting:
    1.  **Header**: Project Name as H1, followed by a catchy one-line description.
    2.  **Badges**: Include relevant shields.io badges (License, Repo Size, Stars, Language, etc.).
    3.  **Visuals**: If appropriate, suggest a placeholder for a logo or banner.
    4.  **Table of Contents**: A linked list for easy navigation.
    5.  **Description**: A deep dive into "What" and "Why".
    6.  **Key Features**: Use a clean list with emojis.
    7.  **Architecture**: Briefly explain the project structure based on the analysis.
    8.  **Tech Stack**: Use a table or a clear list with icons/tags.
    9.  **Getting Started**: 
        - Prerequisites
        - Step-by-step Installation (with code blocks)
        - Basic Usage (with clear examples)
    10. **Configuration**: Table of environment variables or config options.
    11. **Contributing**: Professional standard guide.
    12. **License**: Clear mention.

    Formatting Rules:
    - Use H1 (#) only for the title. Use H2 (##) and H3 (###) for sections.
    - Use professional, active voice.
    - Ensure all code blocks have the correct language identifier.
    - Use tables for structured data like configuration or tech stack.
    - DO NOT include conversational filler like "Here is your README".
    - Return ONLY the raw Markdown content.`;

    const userPrompt = `
    Context for generation:
    - Metadata: ${JSON.stringify(metadata)}
    - Project Analysis: ${JSON.stringify(analysis)}
    - Key Code Context: ${JSON.stringify(codeSummaries)}
    
    Generate the full README.md now. Use all information to be as specific as possible about this project's unique features and setup.`;

    const readme = await callGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], 6000);

    return {
      content: [{ type: "text", text: readme }],
    };
  }

  if (name === "validate_readme") {
    const { readme } = args as { readme: string };

    const prompt = `Analyze the following README.md and provide a quality score (0-100) and specific suggestions for improvement.
    Check for: Title, Install steps, Usage, Code blocks, Badges.
    
    Return JSON format: { "score": number, "suggestions": ["string"] }
    
    README:
    ${readme.substring(0, 10000)}...`;

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

    const prompt = `Improve the following README based on these suggestions: ${suggestions}
    
    Return the full improved README markdown.
    
    Original README:
    ${readme.substring(0, 15000)}`;

    const improved = await callGroq([
      { role: "system", content: "You are an expert technical writer. Improve the README." },
      { role: "user", content: prompt }
    ], 6000);

    return {
      content: [{ type: "text", text: improved }],
    };
  }

  throw new Error(`Tool ${name} not found`);
});

if (process.env.PORT) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let transport: SSEServerTransport;

  app.get("/sse", async (req, res) => {
    transport = new SSEServerTransport("/mcp/generator/messages", res);
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    }
  });

  const port = process.env.PORT;
  app.listen(port, () => {
    console.log(`Doc Generator MCP running on port ${port}`);
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
