// src/mcp/assertMcpController.ts
import { IAgenticaController } from "@agentica/core";
import typia from "typia";

export class GenericMcpInvoker {
  constructor(private endpoint: string) {
    if (!endpoint) throw new Error("MCP endpoint is required");
  }

  /**
   * 어떤 MCP 툴이든 호출 (tool 명과 args 그대로 전달)
   */
  async invoke(input: { tool: string; args?: Record<string, any> }) {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: input.tool, args: input.args ?? {} }),
    });
    if (!res.ok) throw new Error(`MCP invoke error ${res.status}`);
    return await res.json();
  }
}

/**
 * Agentica 컨트롤러로 래핑
 */
export function assertMcpController(opts: {
  name: string; // 컨트롤러 이름
  endpoint: string; // HTTP 브리지의 /call URL
  model: "gemini" | "openai";
}): IAgenticaController<any> {
  const exec = new GenericMcpInvoker(opts.endpoint);
  return {
    protocol: "class",
    name: opts.name,
    application: typia.llm.application<GenericMcpInvoker, typeof opts.model>(),
    execute: exec,
  };
}
