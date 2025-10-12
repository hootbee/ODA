import Papa from "papaparse";

/* ---------------- CSV 유틸 ---------------- */
export function parseCSVText(csvText) {
  const { data, errors } = Papa.parse((csvText || "").trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (errors?.length) console.warn("CSV parse warnings:", errors.slice(0, 3));
  return (data || []).map((row) => {
    const clean = {};
    Object.keys(row || {}).forEach((k) => (clean[(k || "").trim()] = row[k]));
    return clean;
  });
}

export async function fetchCsv(pathFromPublic) {
  const res = await fetch(pathFromPublic, { cache: "no-store" });
  const txt = await res.text();
  return parseCSVText(txt);
}

/* ---------------- 컬럼 특성 판별 ---------------- */
function isMostlyNumeric(values, minRatio = 0.7) {
  if (!values.length) return false;
  let ok = 0, n = 0;
  for (const v of values) {
    if (v === "" || v == null) continue;
    const num = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(num)) ok++;
    n++;
  }
  return n > 0 && ok / n >= minRatio;
}

/** 문자열 기반의 “날짜/시간” 판별:
 *  - 값이 문자열이어야 함
 *  - -, /, : 중 하나 이상 포함
 *  - Date.parse 성공률이 minRatio 이상
 *  (숫자형 값은 ‘날짜’로 보지 않습니다: scatter 오탐 방지)
 */
function isMostlyDateString(values, minRatio = 0.7) {
  if (!values.length) return false;
  let ok = 0, n = 0;
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!/[\/:\-]/.test(s)) continue;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) ok++;
    n++;
  }
  return n > 0 && ok / n >= minRatio;
}

function headerHasTimeHint(h = "") {
  return /date|날짜|일시|시간|시각|time|timestamp|년|월|일|시|일자|hhmi/i.test(h);
}

function headerHasPercentHint(h = "") {
  return /%|퍼센트|점유율|비율|율|rate|ratio|share/i.test(h);
}

function approxEquals(a, b, tol = 0.05) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.abs(b) * tol;
}

function isMonotonicNonDecreasing(values, minRatio = 0.85) {
  let prev = -Infinity, ok = 0, steps = 0;
  for (const v of values) {
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    if (num >= prev) ok++;
    prev = num;
    steps++;
  }
  return steps > 0 && ok / steps >= minRatio;
}

/* ---------------- 차트 추천 ---------------- */
export function recommendChart(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { type: "none", xField: null, yFields: [] };
  }
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return { type: "none", xField: null, yFields: [] };

  // 열별 특성 수집
  const cols = headers.map((h) => {
    const values = rows.map((r) => r[h]).filter((v) => v !== "" && v != null);
    const numeric = isMostlyNumeric(values);
    const dateLike = headerHasTimeHint(h) || isMostlyDateString(values);
    return { key: h, numeric, dateLike, values };
  });

  const timeCols = cols.filter((c) => c.dateLike);
  const numCols  = cols.filter((c) => c.numeric);
  const catCols  = cols.filter((c) => !c.numeric && !c.dateLike);

  // ---------- PIE (엄격 조건) ----------
  // ① 범주 1개 이상
  // ② 숫자열 "정확히 1개" (여러 개면 파이 부적절 → 막대)
  // ③ (퍼센트 컬럼명) 또는 (값 합계 ≈ 100%)
  if (catCols.length >= 1 && numCols.length === 1) {
    const cat = catCols[0].key;
    const yKey = numCols[0].key;

    const uniq = new Set(rows.map((r) => String(r[cat]).trim())).size;
    if (uniq >= 2 && uniq <= 12) {
      const sum = rows
        .map((r) => Number(r[yKey]))
        .filter((v) => Number.isFinite(v))
        .reduce((a, b) => a + b, 0);

      const percenty = headerHasPercentHint(yKey) || approxEquals(sum, 100, 0.05);
      if (percenty) {
        return { type: "pie", xField: cat, yFields: [yKey] };
      }
    }
    // 퍼센트 성격이 아니면 막대로
    return { type: "bar", xField: cat, yFields: [yKey] };
  }

  // ---------- TIME SERIES ----------
  if (timeCols.length >= 1 && numCols.length >= 1) {
    const xField = timeCols[0].key;
    const yFields = numCols.map((c) => c.key);

    // 누적/합계 힌트 또는 실측 비감소 → AREA
    const hasCumulativeByName = yFields.some((k) =>
      /누적|합계|total|cum|accum|cumulative|sum/i.test(k)
    );
    const hasCumulativeByShape = yFields.some((k) =>
      isMonotonicNonDecreasing(rows.map((r) => r[k]))
    );
    if (hasCumulativeByName || hasCumulativeByShape) {
      return { type: "area", xField, yFields };
    }

    // 혼합은 규칙 단순화: 지금은 다중 라인을 기본으로
    return { type: "line", xField, yFields };
  }

  // ---------- SCATTER (숫자×숫자, 시간축 없음) ----------
   if (timeCols.length === 0 && catCols.length === 0 && numCols.length >= 2) {
     return { type: "scatter", xField: numCols[0].key, yFields: [numCols[1].key] };
  }

  // ---------- BAR (범주 + 숫자) ----------
  if (catCols.length >= 1 && numCols.length >= 1) {
    const xField = catCols[0].key;
    const yFields = numCols.map((c) => c.key).slice(0, 3);
    return { type: "bar", xField, yFields };
  }

  // ---------- Fallback ----------
  const [first, ...rest] = headers;
  return { type: "line", xField: first, yFields: rest.slice(0, 1) };
}

/* ---------------- CSV 파일 준비 ---------------- */
export async function prepareVizFromCsv(csvPath) {
  const rows = await fetchCsv(csvPath);
  const chart = recommendChart(rows);
  return { data: rows, chart };
}
