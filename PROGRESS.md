# Project Progress: README Resurrector 🧟‍♂️

> **Last Updated**: February 15, 2026  
> **Hackathon**: 2 Fast 2 MCP (Deadline: Feb 15, 2026)  
> **Status**: ✅ Feature-complete, deployed, submission-ready

---

## 🤖 AI Agent Context

If you are an AI agent, this file is your **single source of truth** for project state.

### What This Project Is
Multi-agent MCP system: 5 specialized AI agents analyze GitHub repos and generate professional README documentation. Built on Archestra MCP Platform + Gemini 2.5 Flash.

### Project Location
- **Root**: `c:\Users\Yadnyesh Kolte\readmere`
- **HF Engine**: `readmere-huggingface-engine/` — Docker deployable (backend + 5 MCP servers)
- **Frontend**: `frontend/` — Next.js on Vercel
- **Root copies**: `backend/` and `mcp-servers/` mirror HF engine. Edit root first, sync to HF.

### Environment
```
GEMINI_API_KEY=<from Google AI Studio>
GITHUB_TOKEN=<GitHub PAT>
NEXT_PUBLIC_API_URL=<backend URL>
```

---

## 🏗️ Architecture

### 5 MCP Servers

| Port | Server | Tools | LLM? |
|------|--------|-------|------|
| 3002 | **repo-analyzer** | `get_repo_metadata`, `analyze_repository`, `identify_important_files`, `get_repo_insights` | No |
| 3003 | **code-reader** | `read_files`, `extract_signatures`, `smart_chunk`, `extract_commands` | No |
| 3004 | **doc-generator** | `generate_readme` | Gemini (8K/16K/32K output) |
| 3005 | **readme-scorer** | `validate_readme` | Gemini (4K output) |
| 3006 | **readme-improver** | `enhance_readme` | Gemini (16K output) |

### Data Flow
```
User → Frontend (Next.js) → Backend (Express, port 7860)
  → Orchestrator calls MCP tools:
    1. get_repo_metadata (3002)
    2. analyze_repository (3002)
    3. identify_important_files (3002)
    4. get_repo_insights (3002)
    5. read_files (3003) — up to 30K chars/file
    6. extract_signatures (3003)
    7. extract_commands (3003)
    8. smart_chunk (3003, 30K token budget)
    9. generate_readme (3004) — up to 50K chars source context
   10. validate_readme (3005) — up to 30K chars README
   11. enhance_readme (3006) — if score < 80, up to 40K chars
  ← SSE stream progress events back to frontend
```

### Key Files
| File | Purpose |
|------|---------|
| `backend/src/agents/orchestrator.ts` | Pipeline controller |
| `backend/src/services/archestra.ts` | MCP client, tool→port routing |
| `backend/src/routes/generate.ts` | SSE stream + improve + PR endpoints |
| `frontend/src/app/page.tsx` | Landing page |
| `frontend/src/app/generate/page.tsx` | Generation page |

---

## ✅ Completed Features

### Core Pipeline
- [x] 5 MCP servers with dual transport (Streamable HTTP + SSE)
- [x] Per-session Server instances (factory pattern)
- [x] SSE streaming for real-time progress
- [x] Archestra orchestration with tool→port routing
- [x] Auto-retry with exponential backoff for rate limits

### Context Window Optimization
- [x] File reading: 30K chars per file (up from 10K)
- [x] Smart chunking: 30K token budget (up from 12K)
- [x] Generator input: 50K chars source code (up from 15K)
- [x] Generator output: 8K/16K/32K by style (up from 4K/8K/16K)
- [x] Scorer input: 30K chars (up from 12K)
- [x] Improver I/O: 40K input, 16K output (up from 15K/8K)
- [x] Signatures: 10K chars (up from 3K)
- [x] Timeout: 180s (up from 90s)

### README Generation
- [x] 3 output styles (minimal, standard, detailed)
- [x] Custom user instructions
- [x] Verified command extraction (package.json, Makefile, Cargo.toml, etc.)
- [x] Community insights (issues, PRs, contributors, releases, health)
- [x] Function/class signature injection
- [x] Auto-improvement when score < 80
- [x] Fallback mode (basic README from metadata if LLM fails)

### User Experience
- [x] Diff views (original vs generated, before vs after improvement)
- [x] One-click PR creation (GitHub API)
- [x] Iterative improvement with custom prompts
- [x] Quality scoring with 5-category breakdown
- [x] Confetti celebration on good scores
- [x] Session persistence (sessionStorage)
- [x] Toast notifications
- [x] GitHub Dark Mode markdown preview

### Frontend
- [x] Dark theme with glassmorphism
- [x] Animated pipeline visualization
- [x] 5 agent cards with tool badges
- [x] MCP architecture diagram
- [x] Tech stack display
- [x] Responsive design

### Deployment
- [x] HF Spaces engine (Docker — all 5 MCP servers + backend)
- [x] Vercel frontend
- [x] Archestra Platform HF Space
- [x] Docker Compose for local dev

### Documentation
- [x] README.md with judge instructions
- [x] ARCHITECTURE.md deep dive
- [x] DEPLOYMENT.md full guide
- [x] Score methodology page

---

## 🐛 Known Issues & Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| "Already connected to a transport" | ✅ Fixed | `createServer()` factory pattern |
| PayloadTooLargeError | ✅ Fixed | `express.json({ limit: '50mb' })` |
| Double URL encoding | ✅ Fixed | Removed `encodeURIComponent()` before `URLSearchParams` |
| TypeScript status type error | ✅ Fixed | Explicit `Step` interface with `StepStatus` union |

---

## 📋 Submission Checklist
- [x] Live demo working on Vercel
- [x] Engine deployed on HF Spaces
- [x] Archestra Platform deployed
- [x] README with judge instructions
- [x] Architecture documentation
- [x] All 5 MCP servers functional
- [x] Context windows optimized for best results
- [x] Homepage with MCP pipeline visualization
