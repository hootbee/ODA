export type ChartType = "bar" | "line" | "radar";

export interface ChartSeries {
  name: string;
  dataKey: string;
}

export interface ChartSpec {
  type: ChartType;
  title?: string;
  xKey: string;
  series: ChartSeries[];
  data: Array<Record<string, any>>;
}

function isNumber(v: any) {
  return typeof v === "number" && Number.isFinite(v);
}

function pickChartTypeByHint(hint?: string): ChartType {
  const h = (hint || "").toLowerCase();
  if (h.includes("오각") || h.includes("레이더") || h.includes("radar")) return "radar";
  if (h.includes("추세") || h.includes("시간") || h.includes("월") || h.includes("년") || h.includes("line"))
    return "line";
  return "bar";
}

/**
 * 테이블 데이터를 기반으로 기본 차트 스펙을 추론합니다.
 * - xKey: 문자열/날짜형으로 보이는 첫 번째 컬럼
 * - series: 숫자형 컬럼 최대 3개
 */
export function inferChartSpec(params: {
  table: Array<Record<string, any>>;
  hint?: string;
  title?: string;
}): ChartSpec {
  const { table, hint, title } = params;
  if (!Array.isArray(table) || table.length === 0) {
    throw new Error("시각화할 테이블 데이터가 없습니다.");
  }

  const sample = table[0];
  const keys = Object.keys(sample);

  // xKey: 문자열/날짜형 추정 컬럼 우선, 없으면 첫 컬럼
  let xKey = keys.find((k) => {
    const v = sample[k];
    return typeof v === "string" || v instanceof Date;
  }) || keys[0];

  // numeric columns
  const numericKeys = keys.filter((k) => isNumber(sample[k]));
  const pickedNumeric = numericKeys.slice(0, 3);

  // series 없으면 숫자 1개라도 필요
  if (pickedNumeric.length === 0) {
    // 숫자형이 없을 경우, radar를 만들기 위해 문자열 컬럼을 angle로 두고,
    // count를 1로 하여 단일 series로 그리기(예외 처리)
    return {
      type: "radar",
      title: title || "범주 수 분포",
      xKey,
      series: [{ name: "count", dataKey: "__count__" }],
      data: table.map((row) => ({ ...row, __count__: 1 })),
    };
  }

  const type = pickChartTypeByHint(hint);

  const series = pickedNumeric.map((k) => ({ name: k, dataKey: k }));

  return {
    type,
    title,
    xKey,
    series,
    data: table,
  };
}
