import React, { useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import Papa from "papaparse";
import AutoChart from "../AutoChart";
import { parseCSVText, recommendChart, prepareVizFromCsv } from "../../utils/dataViz";

/* ───────── 표 렌더러 ───────── */
const DataTable = ({ tableData }) => {
  if (!tableData || !tableData.headers || !tableData.rows) return null;
  return (
    <TableContainer>
      <StyledTable>
        <thead>
          <tr>
            {tableData.headers.map((h, i) => (
              <th key={i} title={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} title={String(cell ?? "")}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </TableContainer>
  );
};

/* ───────── 분석 텍스트/표 추출 ───────── */
function splitMarkdownAndTable(analysisContent = "") {
  const re = /```json\s*([\s\S]*?)\s*```/;
  const m = analysisContent.match(re);
  if (m?.[1]) {
    try {
      const json = JSON.parse(m[1]);
      const text = analysisContent.replace(re, "\n**데이터 미리보기:**\n").trim();
      return { markdownText: text, tableData: json };
    } catch {}
  }
  return { markdownText: analysisContent, tableData: null };
}

/* ───────── JSON 텍스트 → 행 배열 ───────── */
function parseJSONText(text) {
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error("JSON 최상위는 배열이어야 합니다.");
  return arr;
}

/* ───────── 본문 ───────── */
export default function DataAnalysisResult({ data }) {
  // data: { analysis?, dataPayload?: { format?, text?, url?, title? }, publicDataPk? }
  const payload = data?.dataPayload || {};
  const publicDataPk = data?.publicDataPk;

  /* (1) 분석 텍스트/표 */
  const { markdownText, tableData } = useMemo(
    () => splitMarkdownAndTable(data?.analysis || ""),
    [data?.analysis]
  );

  /* (2) 시각화 준비 */
  // 2-1. 텍스트로 직접 온 경우(우선)
  const localViz = useMemo(() => {
    if (!payload?.text) return null;

    let rows;
    try {
      if (payload.format === "csv") {
        rows = parseCSVText(payload.text);
      } else if (payload.format === "json") {
        rows = parseJSONText(payload.text);
      } else {
        // 미지정: JSON→CSV 순서로 시도
        try {
          rows = parseJSONText(payload.text);
        } catch {
          rows = parseCSVText(payload.text);
        }
      }
    } catch (e) {
      return { error: e?.message || "데이터 파싱 실패" };
    }

    const chart = recommendChart(rows);
    return { data: rows, chart };
  }, [payload?.format, payload?.text]);

  // 2-2. URL만 온 경우(비동기)
  const [remoteViz, setRemoteViz] = useState(null);
  const [remoteErr, setRemoteErr] = useState(null);
  useEffect(() => {
    setRemoteViz(null);
    setRemoteErr(null);
    if (payload?.url && !payload?.text) {
      prepareVizFromCsv(payload.url)
        .then((v) => setRemoteViz(v)) // v: { data, chart }
        .catch((e) => setRemoteErr(e?.message || "CSV 로드 오류"));
    }
  }, [payload?.url, payload?.text]);

  const viz = remoteViz || (localViz && !localViz.error ? localViz : null);
  const vizError = remoteErr || (localViz?.error ?? null);

  /* (3) 원본 다운로드 */
  const handleDownload = () => {
    if (!publicDataPk) {
      alert("다운로드할 파일의 고유 ID가 없습니다.");
      return;
    }
    const qs = new URLSearchParams({ publicDataPk: String(publicDataPk) });
    const url = `http://localhost:8080/api/download?${qs.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const showFailure = !viz && !markdownText && !tableData;

  return (
    <AnalysisContainer>
      <Header>
        <h4><span role="img" aria-label="icon">📊</span> 데이터 분석 결과</h4>
        {publicDataPk && (
          <DownloadButton onClick={handleDownload}>원본 데이터 다운로드</DownloadButton>
        )}
      </Header>

      <Content>
        {markdownText && <ReactMarkdown>{markdownText}</ReactMarkdown>}
        <DataTable tableData={tableData} />
        {payload?.title && (
          <p style={{ marginTop: 8 }}>
            <strong>데이터:</strong> {payload.title}
          </p>
        )}
        {showFailure && <ErrorMuted>분석 결과를 불러오는 데 실패했습니다.</ErrorMuted>}
      </Content>

      {vizError && <ErrorBox>시각화 오류: {vizError}</ErrorBox>}
      {viz && viz.chart?.type !== "none" && (
        <ChartContainer>
          <SubTitle>자동 추천 차트</SubTitle>
          {/* ⬇️ 새로운 AutoChart 인터페이스에 맞춰 전달 */}
          <AutoChart data={viz.data} chart={viz.chart} />
        </ChartContainer>
      )}
    </AnalysisContainer>
  );
}

/* ───────── 스타일 ───────── */
const AnalysisContainer = styled.div`
  background: #f9fafb; border: 1px solid #e0f2fe; border-radius: 20px; padding: 20px; margin: 10px 0;
`;
const Header = styled.div`
  display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e0f2fe; margin-bottom:12px;
  h4{ font-size:1.2em; color:#0c4a6e; margin:0 0 8px 0; }
`;
const DownloadButton = styled.button`
  background:#0099ffff; color:#fff; border:none; border-radius:20px; padding:8px 16px; margin-bottom:20px; font-size:.9em; font-weight:700; cursor:pointer;
  &:hover{ background:#0073ffff; }
`;
const Content = styled.div`
  color:#374151; line-height:1.6;
`;
const TableContainer = styled.div`
  overflow-x:auto; margin-top:1.2em; border:1px solid #d1d5db; border-radius:8px;
`;
const StyledTable = styled.table`
  width:100%; border-collapse:collapse; font-size:.92em;
  th,td{ padding:10px 12px; text-align:left; border-bottom:1px solid #e5e7eb; white-space:normal; word-break:keep-all; }
  thead th{ background:#f9fafb; color:#374151; font-weight:600; }
  tbody tr:nth-child(even){ background:#f9fafb; }
  tbody tr:hover{ background:#f3f4f6; }
`;
const ErrorMuted = styled.p` color:#6b7280; margin-top:6px; `;
const ErrorBox = styled.div` margin-top:12px; color:crimson; font-weight:600; `;
const ChartContainer = styled.div` margin-top:14px; `;
const SubTitle = styled.h5` margin:0 0 6px 0; color:#0f172a; `;
