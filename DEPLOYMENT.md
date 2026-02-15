# 🚀 Deployment Guide

> Deploy README Resurrector to production. Three components: **Engine** (backend + 5 MCP servers), **Frontend**, and **Archestra Platform**.

---

## Prerequisites

| Requirement | How to Get |
|-------------|-----------|
| **Gemini API Key** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free, 1500 req/day |
| **GitHub Token** | [github.com/settings/tokens](https://github.com/settings/tokens) — optional, increases rate limits |
| **Node.js 20+** | For local development |
| **Docker** | For containerized deployment |

---

## Option 1: Hugging Face Spaces (Current Production Setup)

### Engine (Backend + MCP Servers)
1. Create a new HF Space → SDK: **Docker**
2. Upload the contents of `readmere-huggingface-engine/`
3. Add Secrets: `GEMINI_API_KEY`, `GITHUB_TOKEN`
4. The Dockerfile builds all 5 MCP servers + backend and starts them
5. Engine listens on port **7860** (HF default)

### Archestra Platform
1. Create another HF Space → SDK: **Docker**
2. Upload the contents of `archestra-platform/`
3. Add Secret: `ARCHESTRA_CHAT_GEMINI_API_KEY`
4. Register MCP servers via the Archestra admin UI using the engine Space's public URL

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Add env var: `NEXT_PUBLIC_API_URL` = your engine Space's public URL (e.g., `https://yadnyeshkolte-readmere.hf.space`)
4. Deploy

---

## Option 2: Docker Compose (Local/VPS)

```bash
# Clone
git clone https://github.com/yadnyeshkolte/readmere.git
cd readmere

# Configure
cp .env.example .env
# Edit .env:
#   GEMINI_API_KEY=your_key
#   GITHUB_TOKEN=your_token
#   NEXT_PUBLIC_API_URL=http://localhost:8080  (or your public IP/domain)

# Start everything
docker compose up -d --build
```

This starts:
- **Archestra Platform** — Port 3000 (admin), Port 9000 (runtime)
- **Repo Analyzer** — Port 3002
- **Code Reader** — Port 3003
- **Doc Generator** — Port 3004
- **Backend** — Port 8080
- **Frontend** — Port 3001

> **Note**: The docker-compose currently starts 3 MCP servers. The scorer (3005) and improver (3006) run inside the backend container. For full separation, add them as services.

### Configure Archestra (One-Time)
1. Open `http://localhost:3000` (Archestra Admin)
2. Add agents:
   - Repo Analyzer: SSE → `http://repo-analyzer:3002/sse`
   - Code Reader: SSE → `http://code-reader:3003/sse`
   - Doc Generator: SSE → `http://doc-generator:3004/sse`
3. Create a profile, copy the Profile ID
4. Set `ARCHESTRA_PROFILE_ID` in `.env` and restart backend

---

## Option 3: VPS (Manual)

### 1. Server Setup
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo apt install docker-compose-plugin
```

### 2. Deploy
```bash
git clone https://github.com/yadnyeshkolte/readmere.git
cd readmere
# Configure .env (see above)
docker compose up -d --build
```

### 3. Reverse Proxy (Optional)
For proper domains with HTTPS:
```nginx
# /etc/nginx/sites-available/readmere
server {
    listen 80;
    server_name readmere.yourdomain.com;
    location / { proxy_pass http://localhost:3001; }
}
server {
    listen 80;
    server_name api.readmere.yourdomain.com;
    location / { proxy_pass http://localhost:8080; }
}
```

---

## Option 4: Run Without Docker

```bash
# Install dependencies
for dir in mcp-servers/repo-analyzer mcp-servers/code-reader mcp-servers/doc-generator mcp-servers/readme-scorer mcp-servers/readme-improver backend frontend; do
  (cd $dir && npm install)
done

# Set environment
export GEMINI_API_KEY=your_key
export GITHUB_TOKEN=your_token

# Start 5 MCP servers
PORT=3002 npx tsx mcp-servers/repo-analyzer/src/index.mts &
PORT=3003 npx tsx mcp-servers/code-reader/src/index.mts &
PORT=3004 npx tsx mcp-servers/doc-generator/src/index.mts &
PORT=3005 npx tsx mcp-servers/readme-scorer/src/index.mts &
PORT=3006 npx tsx mcp-servers/readme-improver/src/index.mts &

# Start backend & frontend
cd backend && npm run dev &
cd ../frontend && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GITHUB_TOKEN` | Recommended | GitHub PAT for higher rate limits |
| `NEXT_PUBLIC_API_URL` | Yes (frontend) | Backend URL — must be accessible from user's browser |
| `PORT` | Auto-set | Backend port (7860 for HF, 8080 for docker-compose) |

## File Sync Workflow

The project has two copies of backend + MCP servers:
- `backend/` and `mcp-servers/` — root level (for local dev)
- `readmere-huggingface-engine/backend/` and `readmere-huggingface-engine/mcp-servers/` — HF deployment

**Always edit root-level files first**, then sync:
```bash
# Sync to HF engine
Copy-Item -Force "mcp-servers\*\src\*" "readmere-huggingface-engine\mcp-servers\*\src\"
Copy-Item -Force "backend\src\*" "readmere-huggingface-engine\backend\src\"
```
