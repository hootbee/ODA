import React, { useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import Papa from "papaparse";
import AutoChart from "../AutoChart";
import { prepareVizFromCsv } from "../../utils/dataViz";

/* ----------------------------- 표 렌더러 ----------------------------- */
const DataTable = ({ tableData }) => {
  if (!tableData || !tableData.headers || !tableData.rows) return null;
  return (
    <TableContainer>
      <StyledTable>
        <thead>
          <tr>
            {tableData.headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </TableContainer>
  );
};

/* --------------------- 마크다운 + 테이블(JSON 블록) 추출 --------------------- */
function splitMarkdownAndTable(analysisContent) {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const m = analysisContent?.match?.(jsonRegex);
  if (m && m[1]) {
    try {
      const json = JSON.parse(m[1]);
      const text = analysisContent.replace(jsonRegex, "\n**데이터 미리보기:**\n").trim();
      return { markdownText: text, tableData: json };
    } catch {
      // 파싱 실패 시 마크다운만 사용
    }
  }
  return { markdownText: analysisContent || "", tableData: null };
}

/* ----------------------------- 텍스트 파서들 ----------------------------- */
function parseCSVText(text) {
  const r = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const rows = (r.data || []).filter((x) => x && Object.keys(x).length);
  const fields = r.meta?.fields || (rows[0] ? Object.keys(rows[0]) : []);
  return { fields, rows };
}
function parseJSONText(text) {
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error("JSON 최상위는 배열이어야 합니다.");
  const fields = arr.length ? Object.keys(arr[0]) : [];
  return { fields, rows: arr };
}

/* ------------------------- 축/열 자동 추천 유틸 ------------------------- */
const TIME_HINTS = ["일시", "시간", "시각", "측정일시", "date", "time", "timestamp"];
const TIME_EXCLUDE_SUBSTR = ["(hhmi)", "hhmi"];

function isTimeish(name = "") {
  const n = String(name).toLowerCase();
  if (TIME_HINTS.some((h) => n.includes(h))) return true;
  if (TIME_EXCLUDE_SUBSTR.some((h) => n.includes(h))) return true;
  return false;
}
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
function pickXKey(fields, rows) {
  const byHint = fields.find((f) => isTimeish(f));
  if (byHint) return byHint;

  const dateLike = fields.find((f) => {
    const v = rows[0]?.[f];
    if (v == null) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  });
  if (dateLike) return dateLike;

  return fields[0] || "__index";
}
function pickYKeys(fields, rows, xKey) {
  const bad = new Set([xKey, ...fields.filter((f) => isTimeish(f))]);
  const scored = fields
    .filter((f) => !bad.has(f))
    .map((f) => ({ key: f, score: numericScore(rows, f) }))
    .filter((s) => s.score >= 0.6) // 숫자 비율 60% 이상
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.key);

  if (!scored.length) {
    const rest = fields.filter((f) => !bad.has(f));
    return rest.slice(0, 3);
  }
  return scored;
}
function normalizeRows(rows, xKey) {
  if (!rows?.length) return [];
  return rows.map((r, idx) => {
    const x = r?.[xKey];
    if (x == null) return { __index: idx, ...r };
    const d = new Date(x);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return { ...r, [xKey]: `${yyyy}-${mm}-${dd} ${hh}:${mi}` };
    }
    return r;
  });
}
function prepareVizFromText(format, text) {
  let parsed;
  if (format === "csv") parsed = parseCSVText(text);
  else if (format === "json") parsed = parseJSONText(text);
  else {
    // 포맷 미지정: JSON → CSV 순서로 시도
    try {
      parsed = parseJSONText(text);
    } catch {
      parsed = parseCSVText(text);
    }
  }

  const xKey = pickXKey(parsed.fields, parsed.rows);
  const yKeys = pickYKeys(parsed.fields, parsed.rows, xKey);
  const data = normalizeRows(parsed.rows, xKey);
  const guess = yKeys.length > 4 ? "radar" : "line";

  return {
    data,
    xKey: xKey || "__index",
    yKeys,
    guess,
    fields: parsed.fields,
    rowCount: data.length,
  };
}

/* ============================= 메인 컴포넌트 ============================= */
function DataAnalysisResult({ data }) {
  // data 예시:
  // {
  //   analysis?: string,
  //   dataPayload?: { format?: 'csv'|'json'|'unknown', text?: string, url?: string, title?: string },
  //   publicDataPk?: string|number
  // }

  const payload = data?.dataPayload || {};
  const publicDataPk = data?.publicDataPk;

  /* (1) 분석 텍스트/표 */
  const { markdownText, tableData } = useMemo(
    () => splitMarkdownAndTable(data?.analysis || ""),
    [data?.analysis]
  );

  /* (2) 차트 준비: 텍스트 기반 우선, URL만 있으면 비동기로 수집 */
  const [remoteViz, setRemoteViz] = useState(null);
  const [remoteErr, setRemoteErr] = useState(null);

  useEffect(() => {
    setRemoteViz(null);
    setRemoteErr(null);
    if (payload?.url && !payload?.text) {
      prepareVizFromCsv(payload.url)
        .then((v) => setRemoteViz(v))
        .catch((e) => setRemoteErr(e?.message || "CSV 로드 오류"));
    }
  }, [payload?.url, payload?.text]);

  const localViz = useMemo(() => {
    if (payload?.text) {
      try {
        return prepareVizFromText(payload.format, payload.text);
      } catch (e) {
        return { error: e?.message || "시각화 파싱 실패" };
      }
    }
    return null;
  }, [payload?.format, payload?.text]);

  const viz = remoteViz || (localViz && !localViz.error ? localViz : null);
  const vizError = remoteErr || (localViz?.error ?? null);

  /* (3) 원본 다운로드 */
  const handleDownload = () => {
    if (!publicDataPk) {
      alert("다운로드할 파일의 고유 ID가 없습니다.");
      return;
    }
    const qs = new URLSearchParams({ publicDataPk: String(publicDataPk) });
    const downloadUrl = `http://localhost:8080/api/download?${qs.toString()}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showFailure =
    !viz &&
    !markdownText && // 분석 텍스트도 없고
    !tableData && // 미리보기 표도 없으면
    true;

  return (
    <AnalysisContainer>
      <Header>
        <h4>
          <span role="img" aria-label="icon">
            📊
          </span>{" "}
          데이터 분석 결과
        </h4>
        {publicDataPk && (
          <DownloadButton onClick={handleDownload}>
            원본 데이터 다운로드
          </DownloadButton>
        )}
      </Header>

      <Content>
        {/* 분석 텍스트/표 */}
        {markdownText && <ReactMarkdown>{markdownText}</ReactMarkdown>}
        <DataTable tableData={tableData} />

        {/* 실패 문구는 실제로 보여줄 게 없을 때만 */}
        {showFailure && (
          <ErrorMuted>분석 결과를 불러오는 데 실패했습니다.</ErrorMuted>
        )}

        {/* 데이터 제목 표기(있을 때) */}
        {payload?.title && (
          <p style={{ marginTop: 8 }}>
            <strong>데이터:</strong> {payload.title}
          </p>
        )}
      </Content>

      {/* 차트 */}
      {vizError && <ErrorBox>시각화 오류: {vizError}</ErrorBox>}
      {viz && (
        <ChartContainer>
          <SubTitle>자동 추천 차트</SubTitle>
          <AutoChart
            data={viz.data}
            xKey={viz.xKey}
            yKeys={viz.yKeys}
            guess={viz.guess}
            height={300}
          />
        </ChartContainer>
      )}
    </AnalysisContainer>
  );
}

export default DataAnalysisResult;

/* ---------------- 스타일 ---------------- */

const AnalysisContainer = styled.div`
  background-color: #f9fafb;
  border: 1px solid #e0f2fe;
  border-radius: 20px;
  padding: 20px;
  margin: 10px 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #e0f2fe;
  margin-bottom: 12px;
  h4 {
    font-size: 1.2em;
    color: #0c4a6e;
    margin: 0 0 8px 0;
  }
`;

const DownloadButton = styled.button`
  background-color: #0099ffff;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  margin-bottom: 20px;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #0073ffff;
  }
`;

const Content = styled.div`
  color: #374151;
  line-height: 1.6;
  h1,
  h2,
  h3 {
    color: #1e3a8a;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  p {
    margin-bottom: 0.8em;
  }
  strong {
    color: #1e40af;
  }

  ul, ol {
    padding-left: 20px;
    margin-bottom: 1em;
  }
  li {
    margin-bottom: 0.4em;
  }
  code {
    background-color: #e5e7eb;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: "Courier New", Courier, monospace;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 1.2em;
  border: 1px solid #d1d5db;
  border-radius: 8px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
  th,td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  thead th {
    background-color: #f9fafb;
    color: #374151;
    font-weight: 600;
  }
  tbody tr:nth-child(even) {
    background-color: #f9fafb;
  }
  tbody tr:hover {
    background-color: #f3f4f6;
  }
`;

const ErrorMuted = styled.p`
  color: #6b7280;
  margin-top: 6px;
`;

const ErrorBox = styled.div`
  margin-top: 12px;
  color: crimson;
  font-weight: 600;
`;

const ChartContainer = styled.div`
  margin-top: 14px;
`;

const SubTitle = styled.h5`
  margin: 0 0 6px 0;
  color: #0f172a;
`;
