# Architecture Deep Dive: README Resurrector 🧟‍♂️

> This document explains **exactly how everything works** under the hood — every component, every data flow, every design decision.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [MCP Protocol](#mcp-protocol)
3. [The 5 MCP Servers](#the-5-mcp-servers)
4. [Backend Orchestration](#backend-orchestration)
5. [Frontend Architecture](#frontend-architecture)
6. [Transport Layer](#transport-layer)
7. [Context Window Strategy](#context-window-strategy)
8. [Archestra Platform Integration](#archestra-platform-integration)
9. [Error Handling & Resilience](#error-handling--resilience)
10. [Design Decisions](#design-decisions)

---

## System Overview

README Resurrector follows a **pipeline architecture** with 5 specialized MCP agents:

```
User → Frontend (Next.js) → Backend (Express) → Orchestrator → [5 MCP Servers] → Gemini 2.5 Flash → Response
```

The user submits a GitHub URL. The backend orchestrator calls 5 MCP servers in sequence, each performing a specialized task. Three servers use Google's Gemini 2.5 Flash model (1M context window, up to 65K output tokens). The frontend receives real-time progress via Server-Sent Events.

### Why Multi-Agent MCP?

Instead of a single monolithic prompt, we split the work into **purpose-built specialists**:

| Principle | How We Apply It |
|-----------|----------------|
| **Single Responsibility** | Each agent does one job — analyzer crawls GitHub, reader handles files, generator writes, scorer evaluates, improver enhances |
| **Context Isolation** | The scorer doesn't know what instructions the generator received — preventing scoring bias |
| **No LLM Waste** | Agents 1 & 2 (analyzer, reader) don't need LLM at all — they use GitHub API and regex |
| **Independent Scaling** | The LLM-backed servers (3, 4, 5) can scale separately from the API-backed ones |
| **Composability** | Any MCP client can use individual servers — the scorer works standalone |

---

## MCP Protocol

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) standardizes how AI models interact with tools. Each MCP server:

1. **Registers tools** via `ListToolsRequestSchema` — declares available tools with JSON input schemas
2. **Handles tool calls** via `CallToolRequestSchema` — receives arguments, returns results
3. **Supports dual transport** — Streamable HTTP (`POST /mcp`) and SSE (`GET /sse`)

A tool call:
```json
// Request
{ "name": "get_repo_metadata", "arguments": { "repoUrl": "https://github.com/owner/repo" } }

// Response
{ "content": [{ "type": "text", "text": "{\"name\":\"repo\",\"stars\":100,...}" }] }
```

---

## The 5 MCP Servers

### MCP #1: Repo Analyzer (Port 3002)
**File**: `mcp-servers/repo-analyzer/src/index.mts`  
**Dependencies**: GitHub API (`GITHUB_TOKEN`)  
**LLM**: None

| Tool | Input | Output |
|------|-------|--------|
| `get_repo_metadata` | `repoUrl` | name, description, stars, forks, language, license, topics, watchers, open issues, creation date |
| `analyze_repository` | `repoUrl` | File tree (GitHub Trees API), language breakdown, key files, config files, entry points |
| `identify_important_files` | `fileTree` | Top ~20 files ranked by importance score (entry points > configs > source > tests) |
| `get_repo_insights` | `repoUrl` | Recent issues (10), merged PRs (10), top contributors (10), latest releases (5), community health profile |

**Key logic**: `identify_important_files` uses a heuristic scoring system — files named `index.ts`, `main.py`, `app.js`, `package.json` score highest. Test files, `node_modules`, and binary files are filtered out. `get_repo_insights` fetches 5 API endpoints in parallel for performance.

### MCP #2: Code Reader (Port 3003)
**File**: `mcp-servers/code-reader/src/index.mts`  
**Dependencies**: GitHub API (`GITHUB_TOKEN`)  
**LLM**: None

| Tool | Input | Output |
|------|-------|--------|
| `read_files` | `repoUrl`, `filePaths` | Array of `{path, content}` — each file up to **30,000 chars** |
| `extract_signatures` | `files` | Function/class signatures per file (regex: JS/TS, Python, Go, Rust, Java) |
| `smart_chunk` | `files`, `maxTokens` (default: **30,000**) | LLM-optimized chunks prioritized by importance, fits within token budget |
| `extract_commands` | `files` | Verified install/run/test/build/lint commands from package.json, Makefile, Dockerfile, Cargo.toml, go.mod, etc. |

**Key logic**: `smart_chunk` estimates tokens as `chars/4`, sorts files by importance (configs first, then entry points, then types), and fills the token budget greedily. If a file exceeds remaining budget, it's truncated with `...[TRUNCATED FOR CONTEXT]`. This ensures the LLM gets the most important code context within its budget.

### MCP #3: Doc Generator (Port 3004)
**File**: `mcp-servers/doc-generator/src/index.mts`  
**Dependencies**: Gemini API (`GEMINI_API_KEY`)  
**LLM**: Gemini 2.5 Flash

| Tool | Input | Output |
|------|-------|--------|
| `generate_readme` | `metadata`, `analysis`, `codeSummaries`, `signatures`, `insights`, `verifiedCommands`, `style`, `userPrompt` | Complete README.md in raw markdown |

**Three style presets**:

| Style | maxOutputTokens | Sections | System Prompt Focus |
|-------|----------------|----------|-------------------|
| **Minimal** | 8,192 | ~5 (title, description, quick start, usage, license) | Concise, actionable, ~150 lines max |
| **Standard** | 16,384 | ~11 (+ features, tech stack, API, config, contributing, activity) | Balanced, professional |
| **Detailed** | 32,768 | ~14 (+ project structure, changelog, known issues, community) | Comprehensive, everything included |

**Input context budget** (what gets sent to Gemini):
- Metadata: up to 4,000 chars
- Language breakdown: up to 1,500 chars
- Key files & entry points: up to 2,500 chars
- Source code chunks: up to **50,000 chars** (~12,500 tokens)
- Function signatures: up to 10,000 chars
- Verified commands: full inclusion
- Community insights: condensed (contributors, issues, PRs, releases, health)
- User custom instructions: full inclusion

### MCP #4: README Scorer (Port 3005)
**File**: `mcp-servers/readme-scorer/src/index.mts`  
**Dependencies**: Gemini API (`GEMINI_API_KEY`)  
**LLM**: Gemini 2.5 Flash

| Tool | Input | Output |
|------|-------|--------|
| `validate_readme` | `readme` (up to 30K chars) | JSON: overall score + 5 category scores + suggestions |

Returns structured JSON with `responseMimeType: "application/json"`:
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

**maxOutputTokens**: 4,096 — sufficient for the structured JSON response.

### MCP #5: README Improver (Port 3006)
**File**: `mcp-servers/readme-improver/src/index.mts`  
**Dependencies**: Gemini API (`GEMINI_API_KEY`)  
**LLM**: Gemini 2.5 Flash

| Tool | Input | Output |
|------|-------|--------|
| `enhance_readme` | `readme` (up to 40K chars), `suggestions` | Complete improved README in raw markdown |

**maxOutputTokens**: 16,384 — the improver keeps all existing content and adds/fixes sections.  
**Key rule**: Never removes content, only enhances weak areas based on specific scoring feedback.

---

## Backend Orchestration

### Archestra Service (`backend/src/services/archestra.ts`)

The `ArchestraService` class manages MCP connections with a `tool→port` routing map:

```typescript
{
  'get_repo_metadata': 3002,     'analyze_repository': 3002,
  'identify_important_files': 3002, 'get_repo_insights': 3002,
  'read_files': 3003,            'extract_signatures': 3003,
  'smart_chunk': 3003,           'extract_commands': 3003,
  'generate_readme': 3004,
  'validate_readme': 3005,
  'enhance_readme': 3006,
}
```

**Connection strategy**:
1. Try Streamable HTTP first (`POST /mcp`)
2. Fall back to SSE (`GET /sse` + `POST /messages`)
3. Cache connections per port (persistent)
4. Auto-retry with fresh connection on failure (max 2 retries)
5. LLM-backed tools get 120s timeout, others get 60s
6. Rate-limit detection with capped retry delays (max 60s client-side)

### Orchestrator (`backend/src/agents/orchestrator.ts`)

Two methods:

**`generateReadme(repoUrl, onProgress, userPrompt?, style?)`**:
1. Calls 10 MCP tools in sequence (4 analyzer → 4 reader → 1 generator → 1 scorer → optional improver)
2. Sends SSE progress events via callback
3. Auto-enhances if score < 80
4. Falls back to basic metadata-only README if full pipeline fails
5. Returns `{readme, metadata, quality, originalReadme, verifiedCommands}`

**`improveReadme(readme, suggestions)`**:
1. Calls `enhance_readme` → `validate_readme`
2. Returns new README with updated score

### API Routes (`backend/src/routes/generate.ts`)

| Endpoint | Method | Transport | Purpose |
|----------|--------|-----------|---------|
| `/api/generate` | POST | SSE stream | Full pipeline — sends `progress` and `result` events |
| `/api/generate/improve` | POST | JSON | Re-enhancement with custom prompt |
| `/api/generate/create-pr` | POST | JSON | Creates GitHub PR via GitHub API |

---

## Frontend Architecture

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `page.tsx` | Landing page — URL input, pipeline visualization, agent cards, tech stack, MCP architecture diagram |
| `/generate` | `GenerateContent` | Generation page — SSE consumer, 5-step progress, README preview/edit/markdown, diff views, quality report, PR creation |
| `/score` | `page.tsx` | Static scoring methodology page |

### Key Components

| Component | Purpose |
|-----------|---------|
| `URLInput` | URL input + 3-style selector + collapsible custom instructions |
| `ProgressTracker` | 5-step pipeline UI with animated status indicators |
| `ReadmePreview` | preview/markdown/edit tabs, react-markdown + syntax highlighting, copy/download |
| `DiffView` | LCS-based unified diff with added/removed highlighting |
| `PRModal` | GitHub token input, PR creation, token guide |

### Frontend Features
- **SSE streaming** for real-time progress
- **Session persistence** via `sessionStorage` (navigate away and come back)
- **Confetti celebration** on scores ≥ 70
- **Toast notifications** for copy, improve, and PR actions
- **GitHub Dark Mode CSS** for pixel-perfect README preview
- **Responsive** layout with glassmorphism dark theme

---

## Transport Layer

Every MCP server implements dual transport via Express:

```
Express App
├── ALL /mcp          → Streamable HTTP (session-based, MCP 2025-11-25)
├── GET /sse          → SSE transport (creates new session, MCP 2024-11-05)
└── POST /messages    → SSE message handler
```

**Per-session server instances**: Each client connection creates a fresh `Server` instance via `createServer()` factory. This prevents "Already connected to a transport" errors.

All servers use `express.json({ limit: '50mb' })` to handle large payloads (file trees can be several MB).

---

## Context Window Strategy

Gemini 2.5 Flash offers a **1M token input context** and **65K token output**. We leverage this aggressively:

| Component | Old Limit | New Limit | Improvement |
|-----------|-----------|-----------|-------------|
| File content per file | 10K chars | 30K chars | 3× more code context |
| Smart chunk budget | 12K tokens | 30K tokens | 2.5× more code sent to LLM |
| Source code in prompt | 15K chars | 50K chars | 3.3× richer code context |
| Signatures in prompt | 3K chars | 10K chars | 3.3× more API surface |
| Scorer input | 12K chars | 30K chars | 2.5× fuller README evaluation |
| Improver input | 15K chars | 40K chars | 2.7× more content preserved |
| Generator output (standard) | 8K tokens | 16K tokens | 2× longer READMEs |
| Generator output (detailed) | 16K tokens | 32K tokens | 2× longer detailed READMEs |
| Improver output | 8K tokens | 16K tokens | 2× longer improvements |
| API timeout | 90s | 180s | Accommodates larger contexts |

**Why this matters**: More context = the LLM sees more of the actual codebase, producing more accurate, specific, and detailed READMEs. The free Gemini tier allows 1500 requests/day — we're well within limits.

---

## Archestra Platform Integration

The [Archestra Platform](https://archestra.ai) provides the orchestration layer:

1. **MCP Server Registry**: All 5 agents are registered with their endpoints and tool schemas
2. **Admin Dashboard**: Available at [yadnyeshkolte-archestra-platform.hf.space](https://yadnyeshkolte-archestra-platform.hf.space)
3. **Chat UI**: Archestra's built-in chat allows direct interaction with registered MCP agents
4. **Centralized Runtime**: Coordinates the multi-agent pipeline

The Archestra Platform is deployed as a separate HF Space (`archestra-platform/`) and connects to the engine's MCP servers via their public endpoints.

---

## Error Handling & Resilience

| Scenario | Strategy |
|----------|----------|
| Gemini rate limit (429) | Exponential backoff: 30s → 60s → 120s, max 3 retries |
| Gemini timeout | 180s AbortController timeout, throws descriptive error |
| MCP connection failure | Auto-retry with fresh connection (max 2 retries) |
| Scoring failure | Non-fatal — applies default score of 70, continues pipeline |
| Enhancement failure | Non-fatal — keeps original README |
| Insights failure | Non-fatal — partial insights, pipeline continues |
| Full pipeline failure | Falls back to basic metadata-only README |
| Malformed Gemini JSON | `safeJsonParse()` with 3 fallback strategies (code fence strip, brace extraction, truncated JSON repair) |
| Large payloads | 50MB body limit on all Express servers |
| Session conflicts | Per-session `Server` instances via factory pattern |

---

## Design Decisions

### Why Gemini 2.5 Flash?
- **1M token context window** — we can send massive amounts of code
- **65K token output** — supports generating very long detailed READMEs
- **Speed** — optimized for fast inference
- **Free tier** — 1500 requests/day via Google AI Studio, no credit card needed
- **JSON mode** — `responseMimeType: "application/json"` for structured scorer output

### Why SSE for Progress?
- **Real-time updates**: Users see each agent working as it happens
- **Simple**: No WebSocket complexity, just HTTP
- **Reliable**: SSE auto-reconnects on connection drop
- **One-directional**: Perfect for server→client progress updates

### Why Dual MCP Transport?
- **Streamable HTTP**: Modern standard (MCP 2025-11-25), session-based, preferred
- **SSE**: Legacy fallback (MCP 2024-11-05), broader client compatibility
- **Archestra compatibility**: Platform uses Streamable HTTP

### Why 5 Agents and Not 1?
See the [System Overview](#system-overview) section — TL;DR: single responsibility, context isolation, independent scaling, composability, and it makes for a compelling hackathon demo showing MCP's power.
