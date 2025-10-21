import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";

export type ChartType = "bar" | "line" | "pie" | "scatter";

export interface VisualizationChart {
  chartType: ChartType;
  title: string;
  insight?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<
    | { label: string; value: number }
    | { x: number; y: number; label?: string }
  >;
  notes?: string[];
}

export interface VisualizationResult {
  summary: string;
  charts: VisualizationChart[];
  notes?: string[];
  previewTable?: {
    headers: string[];
    rows: string[][];
  };
}

type VisualizationDeps = {
  llm: GoogleGenerativeAI;
  model: string;
};

export class DataVisualizationService {
  private readonly llm: GoogleGenerativeAI;
  private readonly model: string;

  constructor(deps: VisualizationDeps) {
    this.llm = deps.llm;
    this.model = deps.model;
  }

  public async generateFromCsv(
    filePath: string,
    fileName: string,
    userPrompt = "선택된 데이터를 이해하기 쉬운 그래프로 시각화해줘.",
    previousResult?: VisualizationResult
  ): Promise<VisualizationResult> {
    const fileContent = await this.readFileContent(filePath);

    if (!this.hasDataRows(fileContent)) {
      return {
        summary: `${fileName} 파일에서 시각화를 생성할 수 있는 데이터 행이 발견되지 않았습니다. CSV 내보내기 옵션을 확인해주세요.`,
        charts: [],
        previewTable: this.buildPreviewTable(fileContent),
        notes: ["헤더만 존재하거나 모든 셀이 비어 있어 그래프를 생성할 수 없습니다."],
      };
    }

    const prompt = this.buildPrompt(fileContent, fileName, userPrompt, previousResult);
    const raw = await this.chatForVisualization(prompt);
    return this.sanitizeResult(raw, fileContent, fileName);
  }

  private async readFileContent(filePath: string, rowLimit = 40): Promise<string> {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length <= rowLimit) {
      return content;
    }
    return lines.slice(0, rowLimit).join("\n");
  }

  private hasDataRows(fileContent: string): boolean {
    const lines = (fileContent ?? "").split("\n").map((s) => s.trim());
    if (lines.length < 2) return false;
    return lines.slice(1).some((line) => {
      if (!line) return false;
      const cells = line.split(",").map((c) => c.trim());
      return cells.some((c) => c.length > 0);
    });
  }

  private buildPrompt(
    fileContent: string,
    fileName: string,
    userPrompt: string,
    previousResult?: VisualizationResult
  ): string {
    const lines = fileContent.split("\n");
    const header = lines[0] ?? "";
    const columns = header
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const columnList = columns.length > 0 ? columns.map((c) => `- ${c}`).join("\n") : "- (헤더 정보 없음)";
    const promptLines: string[] = [];

    promptLines.push("# 역할");
    promptLines.push("당신은 한국어를 사용하는 데이터 시각화 전문가입니다. CSV 데이터를 검토하여 가장 통찰력 있는 그래프 1~3개를 제안하세요.");
    promptLines.push("");
    promptLines.push("# 출력 형식 (JSON ONLY)");
    promptLines.push("반드시 순수 JSON으로만 응답하세요. 마크다운 코드블록이나 설명 문구를 포함하지 마세요.");
    promptLines.push("{");
    promptLines.push('  "summary": "한국어 요약",');
    promptLines.push('  "charts": [');
    promptLines.push('    {');
    promptLines.push('      "chartType": "bar|line|pie|scatter" 중 하나,');
    promptLines.push('      "title": "그래프 제목",');
    promptLines.push('      "insight": "그래프에서 읽을 수 있는 핵심 인사이트",');
    promptLines.push('      "xLabel": "X축 레이블",');
    promptLines.push('      "yLabel": "Y축 레이블",');
    promptLines.push('      "data": [],');
    promptLines.push('      "notes": ["필요 시 추가 설명"]');
    promptLines.push('    }');
    promptLines.push('  ],');
    promptLines.push('  "notes": ["전반적인 주의사항"]');
    promptLines.push('}');
    promptLines.push("");
    promptLines.push("# 데이터 정보");
    promptLines.push(`- 대상 파일명: ${fileName}`);
    promptLines.push(`- 사용자가 요청한 목표: "${userPrompt}"`);
    promptLines.push("- CSV 컬럼 목록:");
    promptLines.push(columnList);
    promptLines.push("");
    promptLines.push("# CSV 미리보기 (최대 40줄)");
    promptLines.push(fileContent);
    promptLines.push("");
    promptLines.push("# 그래프 생성 규칙");
    promptLines.push("1. 데이터 값은 반드시 숫자(Number) 타입으로 제공하세요. 문자열이 포함되면 숫자로 변환하세요.");
    promptLines.push("2. 각 차트의 data는 최대 8개 항목까지만 포함합니다. 중요도가 낮은 항목은 제외하세요.");
    promptLines.push("3. chartType은 bar, line, pie, scatter 중 데이터에 가장 적절한 것을 선택하세요.");
    promptLines.push("4. pie 차트는 비율 합계가 100%가 되도록 각 value를 퍼센트(숫자)로 제공하세요.");
    promptLines.push("5. scatter 차트는 data 안에 { \"x\": number, \"y\": number, \"label\"?: string } 형태만 사용하세요.");
    promptLines.push("6. 다른 차트(bar, line, pie)는 data 안에 { \"label\": string, \"value\": number } 구조만 사용하세요.");
    promptLines.push("7. summary, insight, notes는 모두 한국어로 작성하세요.");
    promptLines.push("8. 데이터가 부족해 그래프를 만들 수 없다면 charts를 빈 배열로 두고, 그 이유를 summary와 notes에 명확히 적으세요.");

    if (previousResult) {
      promptLines.push("");
      promptLines.push("# 이전 시각화 참고");
      promptLines.push("직전에 제시한 차트 구성을 참고하되, 중복을 피하고 더 나은 통찰을 제안하세요.");
      promptLines.push("---");
      promptLines.push(JSON.stringify(previousResult, null, 2));
      promptLines.push("---");
    }

    return promptLines.join("\n");
  }

  private async chatForVisualization(prompt: string): Promise<string> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: "너는 한국어로 보고서를 작성하는 데이터 시각화 어시스턴트이다. 반드시 JSON만 반환해라.",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    });

    return result.response.text() ?? "";
  }

  private sanitizeResult(rawText: string, fileContent: string, fileName: string): VisualizationResult {
    const parsed = this.extractJson(rawText);

    const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : `${fileName} 파일에 대한 시각화 요약을 생성하지 못했습니다.`;

    const notes = this.normalizeStringArray(parsed.notes || parsed.warnings || parsed.cautions);
    const chartsInput = Array.isArray(parsed.charts) ? parsed.charts : [];
    const charts: VisualizationChart[] = chartsInput
      .map((chart, index) => this.sanitizeChart(chart, index))
      .filter((chart): chart is VisualizationChart => Boolean(chart) && Array.isArray(chart.data) && chart.data.length > 0);

    return {
      summary,
      charts,
      notes: notes.length > 0 ? notes : undefined,
      previewTable: this.buildPreviewTable(fileContent),
    };
  }

  private extractJson(rawText: string): any {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  private sanitizeChart(input: any, index: number): VisualizationChart | null {
    if (!input || typeof input !== "object") return null;
    const type = this.normalizeChartType(input.chartType || input.type);
    if (!type) return null;

    const title = this.ensureString(input.title) || `차트 ${index + 1}`;
    const insight = this.ensureString(input.insight) || this.ensureString(input.description);
    const description = this.ensureString(input.description);
    const xLabel = this.ensureString(input.xLabel || input.xAxisLabel);
    const yLabel = this.ensureString(input.yLabel || input.yAxisLabel);
    const notes = this.normalizeStringArray(input.notes);

    const dataArray = Array.isArray(input.data) ? input.data : [];

    if (type === "scatter") {
      const points = dataArray
        .map((item) => this.toScatterPoint(item))
        .filter((item): item is { x: number; y: number; label?: string } => Boolean(item));
      if (points.length === 0) return null;
      return {
        chartType: type,
        title,
        insight,
        description,
        xLabel,
        yLabel,
        data: points,
        notes: notes.length > 0 ? notes : undefined,
      };
    }

    const entries = dataArray
      .map((item) => this.toLabelValue(item))
      .filter((item): item is { label: string; value: number } => Boolean(item));

    if (entries.length === 0) return null;

    return {
      chartType: type,
      title,
      insight,
      description,
      xLabel,
      yLabel,
      data: entries,
      notes: notes.length > 0 ? notes : undefined,
    };
  }

  private toScatterPoint(item: any): { x: number; y: number; label?: string } | null {
    if (!item || typeof item !== "object") return null;
    const xRaw = "x" in item ? item.x : item.X;
    const yRaw = "y" in item ? item.y : item.Y;
    if (xRaw === undefined || yRaw === undefined) return null;
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const label = this.ensureString(item.label || item.name || item.category);
    return label ? { x, y, label } : { x, y };
  }

  private toLabelValue(item: any): { label: string; value: number } | null {
    if (!item || typeof item !== "object") return null;
    const label = this.ensureString(item.label || item.name || item.category || item.group);
    const rawValue = item.value ?? item.percent ?? item.percentage ?? item.count ?? item.amount;
    if (label == null || rawValue == null) return null;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return null;
    return { label, value };
  }

  private normalizeChartType(type: any): ChartType | null {
    if (!type || typeof type !== "string") return null;
    const lower = type.toLowerCase();
    if (["bar", "column", "histogram"].includes(lower)) return "bar";
    if (["line", "area"].includes(lower)) return "line";
    if (["pie", "donut", "doughnut"].includes(lower)) return "pie";
    if (["scatter", "bubble"].includes(lower)) return "scatter";
    return null;
  }

  private ensureString(value: any): string | undefined {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  private normalizeStringArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => this.ensureString(item))
        .filter((item): item is string => Boolean(item));
    }
    const single = this.ensureString(value);
    return single ? [single] : [];
  }

  private buildPreviewTable(fileContent: string): { headers: string[]; rows: string[][] } | undefined {
    if (!fileContent) return undefined;
    const lines = fileContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) return undefined;
    const headers = lines[0].split(",").map((cell) => cell.trim());
    const rows = lines.slice(1, Math.min(lines.length, 6)).map((line) =>
      line.split(",").map((cell) => cell.trim())
    );
    return { headers, rows };
  }
}
