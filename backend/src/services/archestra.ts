import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import EventSource from "eventsource";

export class ArchestraService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private useLocalFallback: boolean = false;
  private archestraUrl: string | undefined;
  private profileId: string | undefined;
  private token: string | undefined;

  constructor() {
    this.profileId = process.env.ARCHESTRA_PROFILE_ID;
    this.archestraUrl = process.env.ARCHESTRA_URL;
    this.token = process.env.ARCHESTRA_TOKEN;

    // Polyfill EventSource for Node.js (needed for SSE fallback)
    // @ts-ignore
    global.EventSource = EventSource;

    if (this.profileId && this.archestraUrl) {
      console.log("Configuring Archestra Platform connection...");
      this.client = new Client(
        { name: "readmere-backend", version: "1.0.0" },
        { capabilities: {} }
      );
    } else {
      console.warn("ARCHESTRA_PROFILE_ID or URL not found. Using direct local agent connection.");
      this.useLocalFallback = true;
    }
  }

  async connect() {
    if (this.useLocalFallback || this.isConnected) return;
    if (!this.client) return;

    const mcpUrl = new URL(`${this.archestraUrl}/v1/mcp/${this.profileId}`);

    // Try Streamable HTTP first (modern protocol), fall back to SSE
    try {
      console.log("Attempting Streamable HTTP connection to Archestra...");
      const transport = new StreamableHTTPClientTransport(mcpUrl, {
        requestInit: {
          headers: {
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
        },
      });
      await this.client.connect(transport);
      this.isConnected = true;
      console.log("Connected to Archestra MCP Gateway (Streamable HTTP)");
      return;
    } catch (e) {
      console.warn("Streamable HTTP failed, trying SSE transport...", (e as Error).message);
    }

    // Fallback to SSE transport
    try {
      // Re-create client since previous connect may have changed state
      this.client = new Client(
        { name: "readmere-backend", version: "1.0.0" },
        { capabilities: {} }
      );
      const sseTransport = new SSEClientTransport(mcpUrl, {
        eventSourceInit: {
          headers: {
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
        },
      } as any);
      await this.client.connect(sseTransport);
      this.isConnected = true;
      console.log("Connected to Archestra MCP Gateway (SSE)");
    } catch (e) {
      console.error("Failed to connect to Archestra, falling back to local agents.");
      this.useLocalFallback = true;
    }
  }

  private async callLocalAgent(port: number, toolName: string, args: any) {
    const localClient = new Client(
      { name: "local-dispatcher", version: "1.0.0" },
      { capabilities: {} }
    );

    // Try Streamable HTTP first (new protocol), fall back to SSE
    try {
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`)
      );
      await localClient.connect(transport);
    } catch {
      // Fallback to SSE
      const sseTransport = new SSEClientTransport(
        new URL(`http://localhost:${port}/sse`)
      );
      await localClient.connect(sseTransport);
    }

    const result = await localClient.callTool({
      name: toolName,
      arguments: args,
    });

    await localClient.close();
    return result;
  }

  async callTool(name: string, args: any) {
    await this.connect();

    if (this.useLocalFallback) {
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
      if (!port) throw new Error(`Tool ${name} not supported in local mode`);

      console.log(`Direct Call: ${name} on port ${port}`);
      return await this.callLocalAgent(port, name, args);
    }

    return await this.client!.callTool({
      name,
      arguments: args,
    });
  }
}