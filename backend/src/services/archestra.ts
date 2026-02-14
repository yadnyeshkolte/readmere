import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import EventSource from "eventsource";

// Timeout wrapper to prevent tool calls from hanging indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tool call '${label}' timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Delay helper for rate-limit backoff
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_CLIENT_RETRY_WAIT_MS = 60_000; // Client-side: never wait more than 60s

// Check if an error is a rate-limit (429) error
function isRateLimitError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('429') || msg.includes('rate_limit') || msg.includes('Rate limit') || msg.includes('RESOURCE_EXHAUSTED');
}

// Check if this is a quota exhaustion (unrecoverable by short waits)
function isDailyLimitError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('tokens per day') || msg.includes('TPD') || msg.includes('requests per day') || msg.includes('RPD') || msg.includes('daily token limit') || msg.includes('rate limit exhausted') || msg.includes('quota');
}

// Extract wait time from rate-limit error message, capped to MAX_CLIENT_RETRY_WAIT_MS
function extractRetryDelay(error: any): number {
  const msg = error?.message || '';
  const match = msg.match(/try again in (\d+)m([\d.]+)s/);
  if (match) {
    return Math.min((parseInt(match[1]) * 60 + parseFloat(match[2])) * 1000 + 1000, MAX_CLIENT_RETRY_WAIT_MS);
  }
  const secMatch = msg.match(/try again in ([\d.]+)s/);
  if (secMatch) {
    return Math.min(parseFloat(secMatch[1]) * 1000 + 1000, MAX_CLIENT_RETRY_WAIT_MS);
  }
  return 30_000; // default 30s
}

export class ArchestraService {
  private localClients: Map<number, Client> = new Map();
  private connectionPromises: Map<number, Promise<Client>> = new Map();

  constructor() {
    // Polyfill EventSource for Node.js (needed for SSE fallback)
    // @ts-ignore
    global.EventSource = EventSource;
  }

  /**
   * Get or create a persistent connection to a local MCP server.
   * Reuses existing connections to avoid re-initializing per tool call.
   */
  private async getLocalClient(port: number): Promise<Client> {
    // Return existing connected client
    const existing = this.localClients.get(port);
    if (existing) return existing;

    // If a connection is already in progress, wait for it
    const pending = this.connectionPromises.get(port);
    if (pending) return pending;

    // Create new connection
    const connectPromise = this.connectToLocalServer(port);
    this.connectionPromises.set(port, connectPromise);

    try {
      const client = await connectPromise;
      this.localClients.set(port, client);
      return client;
    } finally {
      this.connectionPromises.delete(port);
    }
  }

  private async connectToLocalServer(port: number): Promise<Client> {
    const client = new Client(
      { name: "readmere-backend", version: "1.0.0" },
      { capabilities: {} }
    );

    // Try Streamable HTTP first
    try {
      console.log(`Connecting to MCP server on port ${port} (Streamable HTTP)...`);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`)
      );
      await client.connect(transport);
      console.log(`Connected to MCP server on port ${port} (Streamable HTTP)`);
      return client;
    } catch (e) {
      console.warn(`Streamable HTTP failed for port ${port}: ${(e as Error).message}`);
    }

    // Fallback to SSE — need a fresh client since connect may change state
    const sseClient = new Client(
      { name: "readmere-backend", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      console.log(`Connecting to MCP server on port ${port} (SSE)...`);
      const sseTransport = new SSEClientTransport(
        new URL(`http://localhost:${port}/sse`)
      );
      await sseClient.connect(sseTransport);
      console.log(`Connected to MCP server on port ${port} (SSE)`);
      return sseClient;
    } catch (e) {
      console.error(`All transports failed for port ${port}: ${(e as Error).message}`);
      throw new Error(`Cannot connect to MCP server on port ${port}`);
    }
  }

  async callTool(name: string, args: any) {
    const portMap: Record<string, number> = {
      'analyze_repository': 3002,
      'get_repo_metadata': 3002,
      'identify_important_files': 3002,
      'get_repo_insights': 3002,
      'read_files': 3003,
      'extract_signatures': 3003,
      'extract_commands': 3003,
      'smart_chunk': 3003,
      'generate_readme': 3004,
      'validate_readme': 3005,
      'enhance_readme': 3006
    };

    const port = portMap[name];
    if (!port) throw new Error(`Unknown tool: ${name}`);

    console.log(`Calling tool: ${name} on port ${port}`);

    // Timeout: LLM-backed tools get 120s, others get 60s
    const llmTools = ['generate_readme', 'enhance_readme', 'validate_readme'];
    const timeoutMs = llmTools.includes(name) ? 120_000 : 60_000;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.getLocalClient(port);
        const result = await withTimeout(
          client.callTool({ name, arguments: args }),
          timeoutMs,
          name
        );
        return result;
      } catch (error: any) {
        const errMsg = (error as Error).message;

        // Daily limit: fail immediately, no point retrying
        if (isDailyLimitError(error)) {
          console.error(`Daily token limit exhausted for '${name}' — failing immediately`);
          throw new Error(`Gemini API rate limit exhausted. Please try again later.`);
        }

        // Rate-limit (burst): wait for capped delay before retrying
        if (isRateLimitError(error) && attempt < maxRetries) {
          const retryDelay = extractRetryDelay(error);
          console.warn(`Rate limit hit for '${name}', waiting ${Math.round(retryDelay / 1000)}s before retry (attempt ${attempt + 1}/${maxRetries})...`);
          this.localClients.delete(port);
          await delay(retryDelay);
          continue;
        }

        // Connection error (not rate-limit): retry once with fresh connection
        if (attempt < maxRetries && !isRateLimitError(error)) {
          console.warn(`Tool call '${name}' failed, retrying with fresh connection: ${errMsg}`);
          this.localClients.delete(port);
          continue;
        }

        // All retries exhausted
        console.error(`Tool call '${name}' failed after ${attempt + 1} attempts: ${errMsg}`);
        throw error;
      }
    }
  }

  async cleanup() {
    for (const [port, client] of this.localClients) {
      try {
        await client.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    this.localClients.clear();
  }
}