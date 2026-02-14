# Project Progress: README Resurrector 🧟‍♂️

> **Last Updated**: February 14, 2026  
> **Hackathon**: 2 Fast 2 MCP (Ends Feb 15, 2026)  
> **Status**: Feature-complete, deployed on Hugging Face Spaces

---

## 🤖 AI Agent Context (Read This First)

If you are an AI agent starting a new session, this file is your **single source of truth** for the entire project state. Read it completely before doing anything.

### What This Project Is
README Resurrector is a **multi-agent MCP (Model Context Protocol) system** that generates professional README files for any GitHub repository. A user pastes a GitHub URL, and 5 specialized AI agents analyze the repo, read the code, generate documentation, score it, and improve it.

### Project Location
- **Root**: `c:\Users\Yadnyesh Kolte\readmere`
- **HF Engine** (deployable): `readmere-huggingface-engine/` — contains the backend + all MCP servers, deployed as a Docker container to Hugging Face Spaces
- **Frontend**: `frontend/` — Next.js app deployed to Vercel
- **Root-level copies**: `backend/` and `mcp-servers/` are mirrors of what's inside `readmere-huggingface-engine/`. **Always edit inside `readmere-huggingface-engine/` first, then sync to root**.

### Key Environment Variables
```
GROQ_API_KEY=<Groq API key for Llama 3 70B>
GITHUB_TOKEN=<GitHub Personal Access Token for repo access>
NEXT_PUBLIC_API_URL=<Backend URL, e.g. https://yadnyeshkolte-readmere.hf.space>
```

---

## 🏗️ Architecture Overview

### 5 MCP Servers

| Port | Server | File | Tools | LLM? |
|------|--------|------|-------|------|
| 3002 | **repo-analyzer** | `mcp-servers/repo-analyzer/src/index.mts` | `get_repo_metadata`, `analyze_repository`, `identify_important_files`, `get_repo_insights` | No |
| 3003 | **code-reader** | `mcp-servers/code-reader/src/index.mts` | `read_files`, `extract_signatures`, `smart_chunk` | No |
| 3004 | **doc-generator** | `mcp-servers/doc-generator/src/index.mts` | `generate_readme` | Yes (Groq) |
| 3005 | **readme-scorer** | `mcp-servers/readme-scorer/src/index.mts` | `validate_readme` | Yes (Groq) |
| 3006 | **readme-improver** | `mcp-servers/readme-improver/src/index.mts` | `enhance_readme` | Yes (Groq) |

### Data Flow
```
User → Frontend (Next.js) → Backend API (Express, port 7860)
  → Orchestrator calls MCP tools via Archestra service:
    1. get_repo_metadata (3002) → repo metadata JSON (stars, forks, issues, watchers, etc.)
    2. analyze_repository (3002) → file tree + language breakdown
    3. identify_important_files (3002) → list of key file paths
    4. get_repo_insights (3002) → issues, PRs, contributors, releases, community health
    5. read_files (3003) → raw file contents
    6. extract_signatures (3003) → function/class signatures
    7. smart_chunk (3003, maxTokens=12000) → LLM-optimized code chunks
    8. generate_readme (3004) → README markdown (Llama 3 70B, 4000 tokens, enriched with insights)
    9. validate_readme (3005) → quality score JSON with 5 categories
   10. enhance_readme (3006) → improved README (if score < 80)
  ← SSE stream progress events back to frontend (5 steps)
```

### Key Backend Files
| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Express server setup, mounts routes |
| `backend/src/routes/generate.ts` | POST `/api/generate` (SSE) + POST `/api/generate/improve` |
| `backend/src/agents/orchestrator.ts` | `Orchestrator` class — `generateReadme()` and `improveReadme()` methods |
| `backend/src/services/archestra.ts` | `ArchestraService` — tool→port routing map, MCP client connections |
| `backend/src/utils/json.ts` | `safeJsonParse()` utility |

### Key Frontend Files
| File | Purpose |
|------|---------|
| `frontend/src/app/page.tsx` | Landing page |
| `frontend/src/app/generate/page.tsx` | Generation page — SSE progress, preview, quality report |
| `frontend/src/app/score/page.tsx` | Score methodology explainer page |
| `frontend/src/app/layout.tsx` | Root layout, zombie emoji favicon |
| `frontend/src/components/URLInput.tsx` | URL input + custom instructions textarea |
| `frontend/src/components/ProgressTracker.tsx` | Step-by-step progress UI |
| `frontend/src/components/ReadmePreview.tsx` | Markdown preview with copy/download |
| `frontend/src/components/Header.tsx` | Navigation header |
| `frontend/src/components/Footer.tsx` | Page footer |

---

## ✅ Completed Features

### Core Pipeline
- [x] 5 MCP servers (repo-analyzer, code-reader, doc-generator, readme-scorer, readme-improver)
- [x] Archestra orchestration with tool→port routing
- [x] Dual transport: Streamable HTTP (`/mcp`) + SSE (`/sse`) fallback
- [x] Per-session `Server` instances (factory pattern via `createServer()`)
- [x] SSE streaming for real-time progress updates

### README Generation
- [x] Detailed system prompt requiring 14 sections (title, badges, features, tech stack, changelog, known issues, community, etc.)
- [x] Function/class signatures passed to LLM
- [x] 12K token code context via smart chunking
- [x] 4000 max completion tokens
- [x] Optional user custom instructions (userPrompt)
- [x] Auto-enhancement when score < 80
- [x] Community insights injected into LLM prompt (issues, PRs, contributors, releases, community health)

### User Experience & Generation 2.0
- [x] **Diff View**: Visual comparison between original and generated READMEs
- [x] **Verified Commands**: Auto-extraction of run/install/test commands from config files (package.json, Makefile, etc.)
- [x] **One-Click PR**: Create a GitHub PR with the new README directly from the UI
- [x] **3 Output Styles**: Minimal, Standard, and Detailed styles
- [x] **Fast Fallback**: Analysis failure fallback
- [x] **Smart Improvement**: Custom prompts + Diff visualization

### Repository Insights
- [x] `get_repo_insights` MCP tool fetching 5 data categories in parallel
- [x] Recent open issues (top 10, with labels and comment counts)
- [x] Recently merged PRs (top 10, with authors)
- [x] Top contributors (top 10, with commit counts)
- [x] Latest releases (top 5, with tag names and dates)
- [x] Community health profile (contributing guide, CoC, issue/PR templates)
- [x] Enriched repo metadata (forks, open issues, watchers, created date, wiki, discussions, pages)
- [x] Graceful error handling — partial insight failures don't block the pipeline

### Quality Scoring
- [x] 5-category weighted scoring: Completeness (30%), Accuracy (25%), Structure (20%), Readability (15%), Visual Appeal (10%)
- [x] Detailed per-category scores with labels and details
- [x] Suggestions for improvement
- [x] Dedicated scorer MCP server

### Frontend
- [x] Dark theme with glassmorphism, emerald/cyan gradients
- [x] URL input with validation
- [x] Collapsible "Custom Instructions" textarea
- [x] 5-step progress tracker with animations (Analysis → Insights → Reading → Generation → Quality)
- [x] README preview with markdown rendering, copy, and download
- [x] Quality report with expandable category breakdown
- [x] "Improve Score" button for re-enhancement
- [x] Score methodology page (`/score`)
- [x] Zombie emoji favicon (🧟)
- [x] Responsive design

### Infrastructure
- [x] Dockerfile: builds and starts all 5 MCP servers + backend
- [x] 50MB body limit on all Express servers (handles large file trees)
- [x] Deployed to Hugging Face Spaces (Docker)
- [x] Frontend on Vercel

---

## 🐛 Known Issues & Fixes Applied
- **"Already connected to a transport"**: Fixed by using `createServer()` factory pattern (new Server instance per session)
- **PayloadTooLargeError**: Fixed by setting `express.json({ limit: '50mb' })` on all servers
- **Double URL encoding**: Fixed by removing `encodeURIComponent()` before `URLSearchParams` (URLSearchParams encodes automatically)
- **TypeScript status type error**: Fixed by adding explicit `Step` interface with `StepStatus` union type

---

## 📋 Pending / Future Ideas
- [ ] Add unit tests for orchestrator logic
- [ ] Caching layer for repository analysis (avoid redundant GitHub API calls)
- [ ] Support for local repository analysis (not just GitHub URLs)
- [ ] Enhanced UI with detailed agent logs
- [ ] Rate limiting and error retry with backoff

---

## 🔧 How to Deploy

### Hugging Face Space (Backend + MCP Servers)
1. Push changes to `readmere-huggingface-engine/` 
2. HF Space auto-builds from Dockerfile
3. All 5 MCP servers start on ports 3002-3006, backend on 7860

### Vercel (Frontend)
1. Push changes to `frontend/`
2. Vercel auto-deploys
3. Set `NEXT_PUBLIC_API_URL` env var to point to HF Space URL

### File Sync Workflow
When editing backend/MCP source files:
```bash
# Always edit in readmere-huggingface-engine/ first, then sync:
copy /Y "readmere-huggingface-engine\mcp-servers\<server>\src\index.mts" "mcp-servers\<server>\src\index.mts"
copy /Y "readmere-huggingface-engine\backend\src\<path>" "backend\src\<path>"
```
