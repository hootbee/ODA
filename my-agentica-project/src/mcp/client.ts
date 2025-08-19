export type MCPToolArgs = Record<string, any>;
export type MCPNamespace = "playwright" | "supabase";

export interface MCPClient {
  call<T = any>(tool: string, args: MCPToolArgs, ns?: MCPNamespace): Promise<T>;
}

export class HttpMCPClient implements MCPClient {
  constructor(private endpoint = process.env.MCP_BRIDGE_URL) {
    if (!this.endpoint) throw new Error("MCP_BRIDGE_URL is not set");
  }
  async call<T = any>(tool: string, args: MCPToolArgs, ns: MCPNamespace = "playwright"): Promise<T> {
    const res = await fetch(this.endpoint!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ns, tool, args }),
    });
    if (!res.ok) throw new Error(`MCP HTTP error ${res.status}`);
    return (await res.json()) as T;
  }
}