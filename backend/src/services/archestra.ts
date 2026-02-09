import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import EventSource from "eventsource";

export class ArchestraService {
  private client: Client;
  private transport: SSEClientTransport;
  private isConnected: boolean = false;

  constructor() {
    const baseUrl = process.env.ARCHESTRA_URL || "http://localhost:9000";
    const profileId = process.env.ARCHESTRA_PROFILE_ID;
    const token = process.env.ARCHESTRA_TOKEN;

    if (!profileId) throw new Error("ARCHESTRA_PROFILE_ID is required");
    
    // Polyfill EventSource for Node.js
    // @ts-ignore
    global.EventSource = EventSource;

    this.transport = new SSEClientTransport(
      new URL(`${baseUrl}/v1/mcp/${profileId}`),
      {
        eventSourceInit: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
      }
    );

    this.client = new Client(
      {
        name: "readmere-backend",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    if (this.isConnected) return;
    await this.client.connect(this.transport);
    this.isConnected = true;
    console.log("Connected to Archestra MCP Gateway");
  }

  async listTools() {
    await this.connect();
    return await this.client.listTools();
  }

  async callTool(name: string, args: any) {
    await this.connect();
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }
}
