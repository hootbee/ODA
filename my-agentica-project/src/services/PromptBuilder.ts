import type { Column } from "./DataGoKrExtractor";

export type DataInfo = {
  fileName: string;
  title: string;
  category: string;
  keywords: string;
  description: string;
  providerAgency: string;
};

export function buildDataInfoFromColumns(
  base: Partial<DataInfo>,
  columns: Column[],
): DataInfo {
  const colNames = columns.map(c => c.ko || c.en || "").filter(Boolean);
  const keywords = (base.keywords ?? colNames.slice(0, 10).join(", ")) || "공공데이터, 데이터 활용";

  const description =
    (base.description ?? "컬럼 기반의 실무 활용 아이디어를 제시합니다.") +
    `\n[컬럼요약]\n` +
    columns.slice(0, 50).map(c =>
      `- ${c.ko}${c.en ? ` (${c.en})` : ""}${c.type ? ` [${c.type}]` : ""}${c.desc ? `: ${c.desc}` : ""}`
    ).join("\n");

  return {
    fileName: base.fileName ?? "data.go.kr",
    title: base.title ?? "공공데이터(컬럼 기반 활용)",
    category: base.category ?? "일반공공행정",
    keywords,
    description,
    providerAgency: base.providerAgency ?? "data.go.kr",
  };
}