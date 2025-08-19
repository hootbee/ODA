// src/services/SupabaseDbService.ts
import { HttpMCPClient } from "./mcpClient";

/**
 * Supabase SQL only — talk to the Supabase bridge in plain mode.
 */
export class SupabaseDbService {
  private mcp = new HttpMCPClient(
    process.env.SUPABASE_MCP_BRIDGE_URL || "",
    { namespaced: false }
  );

  async listByRegion(region: string, limit = 50) {
    const like = region.replace(/[%_]/g, "");
    const sql = `
      SELECT
        "공공데이터 제목" AS title,
        "파일데이터명"   AS file_name,
        "분류체계"       AS category,
        "제공기관"       AS provider,
        "수정일"         AS modified_at
      FROM public.public_data
      WHERE "지역" ILIKE '%${like}%' OR "제공기관" ILIKE '%${like}%'
      ORDER BY "수정일" DESC
      LIMIT ${Math.max(1, Math.min(limit, 200))}
    `;
    const out = await this.mcp.call<any>("execute_sql", { sql });
    return out?.result ?? out;
  }

  async searchByKeyword(keyword: string, limit = 50) {
    const like = keyword.replace(/[%_]/g, "");
    const sql = `
      SELECT "공공데이터 제목" AS title, "파일데이터명" AS file_name, "제공기관" AS provider, "수정일" AS modified_at
      FROM public.public_data
      WHERE "공공데이터 제목" ILIKE '%${like}%' OR "키워드" ILIKE '%${like}%'
      ORDER BY "수정일" DESC
      LIMIT ${Math.max(1, Math.min(limit, 200))}
    `;
    const out = await this.mcp.call<any>("execute_sql", { sql });
    return out?.result ?? out;
  }
}
