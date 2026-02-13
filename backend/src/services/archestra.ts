import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import EventSource from "eventsource";

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
      'read_files': 3003,
      'extract_signatures': 3003,
      'smart_chunk': 3003,
      'generate_readme': 3004,
      'validate_readme': 3004,
      'enhance_readme': 3004
    };

    const port = portMap[name];
    if (!port) throw new Error(`Unknown tool: ${name}`);

    console.log(`Calling tool: ${name} on port ${port}`);

    try {
      const client = await this.getLocalClient(port);
      const result = await client.callTool({ name, arguments: args });
      return result;
    } catch (error) {
      // Connection may have dropped — clear cache and retry once
      console.warn(`Tool call failed, retrying with fresh connection: ${(error as Error).message}`);
      this.localClients.delete(port);

      const client = await this.getLocalClient(port);
      return await client.callTool({ name, arguments: args });
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