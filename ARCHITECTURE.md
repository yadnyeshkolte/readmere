# Architecture Deep Dive: README Resurrector 🧟‍♂️

> This document explains **exactly how everything works** under the hood. If you're an AI agent or a developer trying to understand the codebase, start here.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [MCP Protocol Basics](#mcp-protocol-basics)
3. [The 5 MCP Servers](#the-5-mcp-servers)
4. [Backend Orchestration](#backend-orchestration)
5. [Frontend Flow](#frontend-flow)
6. [Transport Layer](#transport-layer)
7. [Error Handling & Resilience](#error-handling--resilience)
8. [Design Decisions](#design-decisions)

---

## System Overview

README Resurrector follows a **pipeline architecture**:

```
Frontend → Backend API → Orchestrator → [MCP Servers] → LLM → Response
```

The user submits a GitHub URL. The backend orchestrator calls 5 MCP servers in sequence, each performing a specialized task. Three of the servers use Groq's Llama 3.3 70B model for AI tasks. The frontend receives real-time progress via Server-Sent Events.

### Why MCP (Model Context Protocol)?

MCP is a standardized protocol for connecting AI models to tools. Each MCP server exposes **tools** (like functions) that can be called remotely. Benefits:
- **Standardized interface**: Any MCP client can call any MCP server
- **Transport-agnostic**: Works over HTTP, SSE, or stdio
- **Composable**: Chain multiple servers into pipelines
- **Isolated**: Each server runs in its own process

---

## MCP Protocol Basics

Each MCP server:
1. **Registers tools** via `ListToolsRequestSchema` — declares what tools it offers with JSON schemas
2. **Handles tool calls** via `CallToolRequestSchema` — receives arguments, returns results
3. **Listens on a port** with dual transport support (Streamable HTTP + SSE)

A tool call looks like:
```json
{
  "name": "get_repo_metadata",
  "arguments": { "repoUrl": "https://github.com/owner/repo" }
}
```

And returns:
```json
{
  "content": [{ "type": "text", "text": "{\"name\":\"repo\",\"stars\":100,...}" }]
}
```

---

## The 5 MCP Servers

### MCP #1: Repo Analyzer (Port 3002)
**File**: `mcp-servers/repo-analyzer/src/index.mts`  
**Dependencies**: GitHub API (`GITHUB_TOKEN`)  
**No LLM required**

| Tool | Input | Output | What it does |
|------|-------|--------|-------------|
| `get_repo_metadata` | `repoUrl` | JSON: name, description, stars, language, license, topics | Calls GitHub API `/repos/{owner}/{repo}` |
| `analyze_repository` | `repoUrl` | JSON: file tree, language breakdown, key files, config files, entry points | Recursively lists all files via GitHub Trees API, categorizes them |
| `identify_important_files` | `fileTree` (array) | JSON: list of file paths | Scores each file by importance (entry points, configs, READMEs get high priority), returns top ~20 |

**Key logic**: The `identify_important_files` tool uses a scoring heuristic — files named `index.ts`, `main.py`, `app.js`, `package.json`, etc. score higher. It filters out test files, node_modules, and binary files.

### MCP #2: Code Reader (Port 3003)
**File**: `mcp-servers/code-reader/src/index.mts`  
**Dependencies**: GitHub API (`GITHUB_TOKEN`)  
**No LLM required**

| Tool | Input | Output | What it does |
|------|-------|--------|-------------|
| `read_files` | `repoUrl`, `filePaths` | JSON: array of {path, content} | Fetches raw file contents from GitHub API |
| `extract_signatures` | `files` (array of {path, content}) | JSON: array of {file, signatures} | Regex-based extraction of function/class/method signatures |
| `smart_chunk` | `files`, `maxTokens` (default 12000) | JSON: array of {file, chunk} | Splits files into LLM-friendly chunks, prioritizing important code |

**Key logic**: `smart_chunk` estimates token count (chars/4), prioritizes files with more signatures, and truncates from the end if over the token budget. This ensures the LLM gets the most important code context.

### MCP #3: Doc Generator (Port 3004)
**File**: `mcp-servers/doc-generator/src/index.mts`  
**Dependencies**: Groq API (`GROQ_API_KEY`)  
**Uses LLM**: Llama 3.3 70B, max 4000 completion tokens

| Tool | Input | Output | What it does |
|------|-------|--------|-------------|
| `generate_readme` | `metadata`, `analysis`, `codeSummaries`, `signatures` (optional), `userPrompt` (optional) | Raw markdown string | Generates a full README with 11 sections |

**System prompt** instructs the LLM to create:
1. Title & Badges
2. Description
3. Features (with emoji)
4. Tech Stack
5. Project Structure
6. Getting Started
7. Usage (with real code examples)
8. API Reference
9. Configuration
10. Contributing
11. License

The user content includes repo metadata, analysis summary, chunked source code, function signatures, and optional custom user instructions.

### MCP #4: README Scorer (Port 3005)
**File**: `mcp-servers/readme-scorer/src/index.mts`  
**Dependencies**: Groq API (`GROQ_API_KEY`)  
**Uses LLM**: Llama 3.3 70B, max 1000 completion tokens

| Tool | Input | Output | What it does |
|------|-------|--------|-------------|
| `validate_readme` | `readme` (string, max 12K chars) | JSON: overall score + 5 category scores + suggestions | Evaluates README quality |

Returns structured JSON:
```json
{
  "score": 82,
  "categories": {
    "completeness": { "score": 85, "label": "Completeness", "weight": 30, "detail": "..." },
    "accuracy": { "score": 80, "label": "Accuracy", "weight": 25, "detail": "..." },
    "structure": { "score": 90, "label": "Structure & Formatting", "weight": 20, "detail": "..." },
    "readability": { "score": 75, "label": "Readability", "weight": 15, "detail": "..." },
    "visual": { "score": 70, "label": "Visual Appeal", "weight": 10, "detail": "..." }
  },
  "suggestions": ["Add installation steps", "Include badges", "Fix code examples"]
}
```

### MCP #5: README Improver (Port 3006)
**File**: `mcp-servers/readme-improver/src/index.mts`  
**Dependencies**: Groq API (`GROQ_API_KEY`)  
**Uses LLM**: Llama 3.3 70B, max 4000 completion tokens

| Tool | Input | Output | What it does |
|------|-------|--------|-------------|
| `enhance_readme` | `readme`, `suggestions` | Raw markdown string | Improves the README based on suggestions |

The LLM is told to **keep all existing content** but enhance weak areas, add missing sections, fix formatting, and improve clarity. It never removes content.

---

## Backend Orchestration

### Archestra Service (`backend/src/services/archestra.ts`)

The `ArchestraService` class manages MCP connections:

```
Tool Name → Port Number → MCP Client → Tool Call → Result
```

**Port routing map**:
```typescript
{
  'analyze_repository': 3002,
  'get_repo_metadata': 3002,
  'identify_important_files': 3002,
  'read_files': 3003,
  'extract_signatures': 3003,
  'smart_chunk': 3003,
  'generate_readme': 3004,
  'validate_readme': 3005,
  'enhance_readme': 3006
}
```

**Connection strategy**:
1. Try Streamable HTTP first (`POST /mcp`)
2. Fall back to SSE (`GET /sse` + `POST /messages`)
3. Cache connections per port
4. Auto-retry with fresh connection on failure

### Orchestrator (`backend/src/agents/orchestrator.ts`)

The `Orchestrator` class has two methods:

**`generateReadme(repoUrl, onProgress, userPrompt?)`**:
1. Calls tools 1-9 in sequence
2. Sends SSE progress events via `onProgress` callback
3. Auto-enhances if score < 80
4. Returns `{readme, metadata, quality}`

**`improveReadme(readme, suggestions)`**:
1. Calls `enhance_readme` → `validate_readme`
2. Returns `{readme, quality}` with new score

### API Routes (`backend/src/routes/generate.ts`)

- **`POST /api/generate`**: Creates an SSE stream, runs the full pipeline
- **`POST /api/generate/improve`**: Synchronous JSON endpoint for re-enhancement

---

## Frontend Flow

### Landing Page (`/`)
- `URLInput` component with GitHub URL validation
- Collapsible "Custom Instructions" textarea
- Submits to `/generate?repo={url}&prompt={instructions}`

### Generation Page (`/generate`)
- Reads `repo` and `prompt` from query params
- Opens SSE connection to `POST /api/generate`
- Displays 4-step progress tracker:
  1. Analyzing Repository
  2. Reading Code
  3. Generating Documentation
  4. Quality Check
- On completion: shows README preview + quality report
- Quality report has expandable category breakdown
- "Improve Score" button calls `POST /api/generate/improve`
- "How is this scored?" links to `/score`

### Score Page (`/score`)
- Static page explaining the 5 scoring categories
- Shows the scoring formula with weights
- Lists criteria for each category

---

## Transport Layer

Every MCP server implements the same dual-transport HTTP server pattern:

```
Express App
├── ALL /mcp          → Streamable HTTP (session-based)
├── GET /sse          → SSE transport (creates new session)
└── POST /messages    → SSE message handler
```

**Per-session server instances**: Each new client connection creates a fresh `Server` instance via `createServer()`. This prevents "Already connected to a transport" errors that occur when reusing a single Server instance across multiple sessions.

---

## Error Handling & Resilience

| Error | Cause | Fix |
|-------|-------|-----|
| "Already connected to a transport" | Reusing Server instance | `createServer()` factory pattern |
| PayloadTooLargeError | File trees > 1MB | `express.json({ limit: '50mb' })` on all servers |
| Double URL encoding | `encodeURIComponent` + `URLSearchParams` | Removed manual encoding (URLSearchParams handles it) |
| TypeScript status literal type | `useState` infers status as `"pending"` | Added explicit `Step` interface with `StepStatus` union |

---

## Design Decisions

### Why 5 separate servers instead of 1?
- **Single responsibility**: Each server does one thing well
- **Independent testing**: Test scorer without running generator
- **Scalability**: Scale LLM servers independently from GitHub API servers
- **Context isolation**: Scorer doesn't know generator's instructions (prevents bias)
- **Hackathon wow factor**: 5 MCP agents sounds awesome 🏆

### Why Groq over OpenAI?
- **Speed**: Groq's custom LPU chips make Llama 3.3 70B extremely fast
- **Free tier**: Generous free API access for hackathon use
- **Open source model**: Llama 3.3 70B is open-weight

### Why SSE for progress?
- **Real-time updates**: Users see each step as it happens
- **Simple**: No WebSocket complexity, just HTTP
- **Reliable**: SSE auto-reconnects on connection drop

### Why dual transport (Streamable HTTP + SSE)?
- **Forward compatibility**: Streamable HTTP is the MCP future
- **Backward compatibility**: SSE works with older MCP clients
- **Archestra support**: Archestra platform uses Streamable HTTP
