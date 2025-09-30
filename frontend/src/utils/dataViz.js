import Papa from "papaparse";

/** 한글 CSV(UTF-8 with BOM 포함) 안전 파서 */
export async function fetchCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: false,
      complete: (r) => resolve(r),
      error: reject,
    });
  });
}

const TIME_HINTS = ["일시", "시간", "시각", "측정일시", "date", "time", "timestamp"];
const TIME_EXCLUDE_SUBSTR = ["(hhmi)", "hhmi"];

/** 열 이름이 시간/일시 느낌인지 */
function isTimeish(name = "") {
  const n = String(name).toLowerCase();
  if (TIME_HINTS.some((h) => n.includes(h))) return true;
  if (TIME_EXCLUDE_SUBSTR.some((h) => n.includes(h))) return true;
  return false;
}

/** 값이 숫자로 쓸만한지(결측 제외 비율 기반) */
function numericScore(rows, key, sample = 200) {
  const n = Math.min(rows.length, sample);
  if (n === 0) return 0;
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const v = rows[i]?.[key];
    if (v === "" || v == null) continue;
    const num = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isNaN(num)) ok++;
  }
  return ok / n;
}

/** X축 후보 우선순위: 일시/시간 → 첫번째 열 → 인덱스 */
function pickXKey(fields, rows) {
  const byHint = fields.find((f) => isTimeish(f));
  if (byHint) return byHint;

  // 값이 날짜로 파싱 가능한 열
  const dateLike = fields.find((f) => {
    const v = rows[0]?.[f];
    if (v == null) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  });
  if (dateLike) return dateLike;

  return fields[0] ?? "__index";
}

/** Y축(수치형) 열 후보 최대 6개 자동 선택 */
function pickYKeys(fields, rows, xKey) {
  const bad = new Set([xKey, ...fields.filter((f) => isTimeish(f))]);
  const scored = fields
    .filter((f) => !bad.has(f))
    .map((f) => ({ key: f, score: numericScore(rows, f) }))
    .filter((s) => s.score >= 0.6) // 60% 이상이 숫자로 읽히는 열만
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.key);

  // 최후의 보루
  if (!scored.length) {
    const rest = fields.filter((f) => !bad.has(f));
    return rest.slice(0, 3);
  }
  return scored;
}

/** 차트용 데이터로 정규화 */
function normalize(rows, xKey) {
  // X키가 없으면 인덱스 부여
  if (!rows?.length) return [];
  return rows.map((r, idx) => {
    const x = r?.[xKey];
    if (x == null) return { __index: idx, ...r };
    // 날짜 객체로 바꾸면 Recharts가 예쁘게 못 그리니 문자열 포맷 유지
    const asDate = new Date(x);
    if (!isNaN(asDate.getTime())) {
      const yyyy = asDate.getFullYear();
      const mm = String(asDate.getMonth() + 1).padStart(2, "0");
      const dd = String(asDate.getDate()).padStart(2, "0");
      const hh = String(asDate.getHours()).padStart(2, "0");
      const mi = String(asDate.getMinutes()).padStart(2, "0");
      return { ...r, [xKey]: `${yyyy}-${mm}-${dd} ${hh}:${mi}` };
    }
    return r;
  });
}

/**
 * 공개 API
 * CSV에서 차트 config 자동 생성
 */
export async function prepareVizFromCsv(url) {
  const parsed = await fetchCsv(url);
  const fields = parsed?.meta?.fields ?? [];
  const rows = (parsed?.data ?? []).filter((r) => r && Object.keys(r).length);

  const xKey = pickXKey(fields, rows);
  const yKeys = pickYKeys(fields, rows, xKey);
  const data = normalize(rows, xKey);
  const guess = yKeys.length > 4 ? "radar" : "line";

  return {
    data,
    xKey: xKey || "__index",
    yKeys,
    guess,
    fields,
    rowCount: data.length,
    summary: `${url}에서 ${yKeys.length}개 수치열을 감지했습니다. (행 ${data.length}개)`,
  };
}
