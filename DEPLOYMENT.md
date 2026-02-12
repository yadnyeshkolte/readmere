# 🚀 Deployment Guide for README Resurrector

This guide explains how to deploy the full stack (Frontend, Backend, Archestra, and MCP Agents) to a public server (VPS) so anyone can access it.

## 📋 Prerequisites

1.  **A Cloud Server (VPS)**:
    - Providers: DigitalOcean, AWS (EC2), Hetzner, Vultr, Linode.
    - OS: Ubuntu 22.04 LTS (Recommended).
    - Specs: At least 4GB RAM (8GB recommended for comfortable orchestration).
2.  **Domain Name (Optional)**: If you want `your-app.com` instead of an IP address.

## 🛠️ Step 1: Prepare the Server

SSH into your server and install Docker & Docker Compose:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin
```

## 📦 Step 2: Clone & Configure

1.  **Clone the repository** to your server:
    ```bash
    git clone https://github.com/your-repo/readmere.git
    cd readmere
    ```

2.  **Set up Environment Variables**:
    ```bash
    cp .env.example .env
    nano .env
    ```

    **Crucial Configuration:**
    - `GROQ_API_KEY`: Your Groq key.
    - `GITHUB_TOKEN`: Your GitHub PAT.
    - `NEXT_PUBLIC_API_URL`: Set this to your **Public IP or Domain**.
      - Example (IP): `http://123.45.67.89:8080`
      - Example (Domain): `https://api.yourdomain.com` (if using reverse proxy)
      - *Note: If you leave it as localhost, the frontend will try to connect to localhost on the **user's** machine, which won't work.*

## 🚀 Step 3: Build and Run

Run the stack in detached mode:

```bash
docker compose up -d --build
```

This will:
1.  Start the **Archestra Platform** (Port 9000 & 3000).
2.  Build and start the **MCP Agents** (Ports 3002, 3003, 3004).
3.  Start the **Backend** (Port 8080).
4.  Build and start the **Frontend** (Port 3001).

## 🔗 Step 4: Configure Archestra (One-Time Setup)

Since the agents are now running in Docker, you must tell Archestra where to find them.

1.  Open your browser and go to `http://<YOUR_SERVER_IP>:3000` (Archestra Admin).
2.  **Add Tools / Agents**:
    - **Repo Analyzer**:
      - Type: SSE
      - URL: `http://repo-analyzer:3002/sse`
    - **Code Reader**:
      - Type: SSE
      - URL: `http://code-reader:3003/sse`
    - **Doc Generator**:
      - Type: SSE
      - URL: `http://doc-generator:3004/sse`

3.  **Create a Profile**:
    - Name: `readmere-production`
    - Add the 3 agents you just created.
    - Copy the **Profile ID**.

4.  **Update Backend**:
    - SSH back into your server.
    - Update `.env`: `ARCHESTRA_PROFILE_ID=your_copied_id`.
    - Restart backend: `docker compose restart backend`.

## 🌐 Step 5: Access the App

Your application is now live!
- **Frontend**: `http://<YOUR_SERVER_IP>:3001`

### (Optional) Production Polish: Reverse Proxy (Nginx)

To use standard ports (80/443) and proper domains:

1.  Install Nginx: `sudo apt install nginx`
2.  Configure sites to proxy:
    - `yourdomain.com` -> `localhost:3001` (Frontend)
    - `api.yourdomain.com` -> `localhost:8080` (Backend)
    - `admin.yourdomain.com` -> `localhost:3000` (Archestra)

## 🌐 Alternative: Deploy to Hugging Face Spaces

If you don't want to manage a VPS, you can deploy the engine and the platform to Hugging Face Spaces for free (or low cost).

### 1. The Archestra Platform
1.  Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2.  Name: `archestra-admin`.
3.  SDK: **Docker**.
4.  Upload the contents of the **`archestra-platform/`** folder.
5.  Set `ARCHESTRA_CHAT_GROQ_API_KEY` in Space Secrets.

### 2. The Engine (Backend + Agents)
1.  Create another Docker Space.
2.  Name: `readmere-engine`.
3.  Upload the contents of the **`readmere-huggingface-engine/`** folder.
4.  Add Secrets: `GROQ_API_KEY`, `GITHUB_TOKEN`.
5.  Link this engine to your Archestra space using the public URL provided by HF.

### 3. The Frontend
The frontend can be deployed to **Vercel** or **Netlify**.
- Set `NEXT_PUBLIC_API_URL` to the public URL of your `readmere-engine` space.

---

## ⚠️ Important Note on Code Changes

We have modified the MCP servers (`mcp-servers/*/src/index.ts`) to support **SSE (Server-Sent Events)** over HTTP. This allows them to run as proper microservices in the Docker network.
- **Local Development**: They still work in CLI mode if you run them directly.
- **Docker/Cloud**: They automatically detect the `PORT` variable and start an HTTP server.
