import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import generateRouter from './routes/generate.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Health check before other routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy routes for MCP Agents
// These allow Archestra to talk to the agents through the single public port 7860
app.use('/mcp/analyzer', createProxyMiddleware({ target: 'http://localhost:3002', pathRewrite: { '^/mcp/analyzer': '' }, changeOrigin: true }));
app.use('/mcp/reader', createProxyMiddleware({ target: 'http://localhost:3003', pathRewrite: { '^/mcp/reader': '' }, changeOrigin: true }));
app.use('/mcp/generator', createProxyMiddleware({ target: 'http://localhost:3004', pathRewrite: { '^/mcp/generator': '' }, changeOrigin: true }));

app.use(express.json());
app.use('/api/generate', generateRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
