import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import EventSource from "eventsource";

export class ArchestraService {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private isConnected: boolean = false;
  private useLocalFallback: boolean = false;

  constructor() {
    const profileId = process.env.ARCHESTRA_PROFILE_ID;
    const baseUrl = process.env.ARCHESTRA_URL;

    // Polyfill EventSource for Node.js
    // @ts-ignore
    global.EventSource = EventSource;

    if (profileId && baseUrl) {
      console.log("Configuring Archestra Platform connection...");
      this.transport = new SSEClientTransport(
        new URL(`${baseUrl}/v1/mcp/${profileId}`),
        {
          eventSourceInit: {
            headers: {
              Authorization: `Bearer ${process.env.ARCHESTRA_TOKEN}`
            }
          }
        } as any
      );

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
    if (!this.client || !this.transport) return;

    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log("Connected to Archestra MCP Gateway");
    } catch (e) {
      console.error("Failed to connect to Archestra, falling back to local agents.");
      this.useLocalFallback = true;
    }
  }

  private async callLocalAgent(port: number, toolName: string, args: any) {
    const localTransport = new SSEClientTransport(new URL(`http://localhost:${port}/sse`));
    const localClient = new Client(
      { name: "local-dispatcher", version: "1.0.0" },
      { capabilities: {} }
    );

    await localClient.connect(localTransport);
    const result = await localClient.callTool({
      name: toolName,
      arguments: args,
    });
    
    // Cleanup connection
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