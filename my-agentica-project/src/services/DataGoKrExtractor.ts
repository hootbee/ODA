import type { MCPClient } from "../mcp/client";

export type Column = { ko: string; en?: string; desc?: string; type?: string };

type MCPContent = { type: "json" | "text"; json?: any; text?: string };

type MCPResult = { content?: MCPContent[]; result?: any; [k: string]: any } | any;

export class DataGoKrExtractor {
  constructor(private mcp: MCPClient) {}

  private getPageType(url: string): "openapi" | "filedata" {
    return /openapi\.do/.test(url) ? "openapi" : "filedata";
  }

  /** MCP result → 항상 string[][] 반환하도록 관용적으로 언래핑 */
  private unwrapRows(res: MCPResult): string[][] {
    const payload: any = res?.content?.[0]?.json ?? res?.result ?? res;
    const rows = payload?.rows ?? payload?.table ?? payload;
    if (Array.isArray(rows)) return rows as string[][];
    if (typeof rows === "string") {
      try { return JSON.parse(rows)?.rows ?? []; } catch { return []; }
    }
    return [];
  }

  /** data.go.kr 상세 페이지로 이동 */
  async goto(url: string) {
    await this.mcp.call("browser_navigate", { url }, "playwright");
  }

  /** 페이지 유형별로 컬럼 추출 로직 분기 */
  async extractColumns(url: string): Promise<Column[]> {
    await this.goto(url);
    const type = this.getPageType(url);
    return type === "openapi" ? this.extractOpenApi() : this.extractFileData();
  }

  private async extractOpenApi(): Promise<Column[]> {
    const res = await this.mcp.call("browser_evaluate", {
      script: `
      (() => {
        const heading = Array.from(document.querySelectorAll('h3,h4,h5'))
          .find(h => /출력결과.*\(Sample\)|응답.*필드|Response/i.test(h.textContent||''));
        const table = heading?.parentElement?.querySelector('table')
          || heading?.nextElementSibling?.querySelector?.('table');
        let rows = [];
        if (table) {
          rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
            const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.textContent||'').trim());
            const [ko, en, desc, type] = [tds[0]||'', tds[1]||'', tds[2]||'', tds[3]||'']
            return [ko, en, desc, type];
          });
        }
        return JSON.stringify({ rows });
      })();
      `
    }, "playwright");

    const rows = this.unwrapRows(res);
    return rows
      .filter(r => Array.isArray(r) && r[0])
      .map(([ko, en, desc, type]) => ({ ko, en, desc, type }));
  }

  private async extractFileData(): Promise<Column[]> {
    const res = await this.mcp.call("browser_evaluate", {
      script: `
      (() => {
        const isHeader = (el) => /데이터항목\\(컬럼\\) 정보/.test(el.textContent || "");
        const heading = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5")).find(isHeader);
        const table = heading?.parentElement?.querySelector("table")
              || heading?.nextElementSibling?.querySelector?.("table")
              || heading?.closest("section,div")?.querySelector?.("table");
        let rows = [];
        if (table) {
          rows = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
            const tds = Array.from(tr.querySelectorAll("td")).map(td => (td.textContent||"")
              .replace(/\s+/g,' ').trim());
            const [ko, en, desc, type] = [tds[0]||'', tds[1]||'', tds[2]||'', tds[3]||''];
            return [ko, en, desc, type];
          });
        }
        return JSON.stringify({ rows });
      })();
      `
    }, "playwright");

    const rows = this.unwrapRows(res);
    return rows
      .filter(r => Array.isArray(r) && r[0])
      .map(([ko, en, desc, type]) => ({ ko, en, desc, type }));
  }
}