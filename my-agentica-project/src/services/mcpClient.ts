// src/services/mcpClient.ts
export type MCPToolArgs = Record<string, any>;
export type MCPNamespace = "playwright" | "supabase";

export class HttpMCPClient {
  constructor(
    private endpoint: string,
    private opts: { namespaced?: boolean; defaultNs?: MCPNamespace } = {}
  ) {
    if (!endpoint) throw new Error("MCP endpoint is not set");
  }

  async call<T = any>(tool: string, args: MCPToolArgs = {}, ns?: MCPNamespace): Promise<T> {
    const body: any = { tool, args };
    if (this.opts.namespaced) body.ns = ns ?? this.opts.defaultNs ?? "playwright";

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MCP HTTP error ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }
}
