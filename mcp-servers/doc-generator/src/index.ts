#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

    const systemPrompt = `You are an expert technical writer. Your goal is to generate a comprehensive, professional, and beautiful README.md for a software project. 
    Use the provided repository metadata, file structure analysis, and code summaries to understand the project.
    
    The README must include:
    1. Title & Badges (License, Language, etc.)
    2. Description (What does it do? Why use it?)
    3. Features (Key capabilities)
    4. Tech Stack (Languages, Frameworks, Tools)
    5. Prerequisites & Installation
    6. Usage / Quick Start
    7. Project Structure (Tree view of key files)
    8. Configuration (Env vars, flags)
    9. Contributing
    10. License
    
    Format nicely with Markdown. Use emojis. be concise but informative.`;

    const userPrompt = `
    Repo Metadata: ${JSON.stringify(metadata)}
    Repo Analysis: ${JSON.stringify(analysis)}
    Code Content/Summaries: ${JSON.stringify(codeSummaries)}
    
    Generate the README.md now. Return ONLY the markdown content.`;

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

const transport = new StdioServerTransport();
await server.connect(transport);
