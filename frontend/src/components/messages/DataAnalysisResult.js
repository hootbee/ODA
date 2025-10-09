import React, { useMemo } from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";

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
                            <td key={ci}>{String(cell)}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </StyledTable>
        </TableContainer>
    );
};

const DataAnalysisResult = ({ data }) => {
    const analysisContent = data.analysis || "분석 결과를 불러오는 데 실패했습니다.";
    const publicDataPk = data.publicDataPk;

    const { parts, tables } = useMemo(() => {
        // ```json ... ``` 블록을 모두 수집
        const regex = /```json\s*([\s\S]*?)\s*```/g;
        const tables = [];
        let text = analysisContent;

        // 마커로 치환
        let idx = 0;
        text = text.replace(regex, (_m, inner) => {
            try {
                const parsed = JSON.parse(inner);
                tables.push(parsed);
                const marker = `[[__TABLE_${idx}__]]`;
                idx += 1;
                return marker; // 본문 속에 표 자리에 마커 삽입
            } catch {
                return _m; // JSON 파싱 실패시 원문 유지
            }
        });

        // 마커 기준으로 본문 쪼개기
        const splitter = /\[\[__TABLE_(\d+)__\]\]/g;
        const parts = []; // { type: "md" | "table", content: string | number }

        let lastIndex = 0;
        let match;
        while ((match = splitter.exec(text)) !== null) {
            const i = match.index;
            const mdSlice = text.slice(lastIndex, i);
            if (mdSlice) parts.push({ type: "md", content: mdSlice });
            const tableIndex = Number(match[1]);
            parts.push({ type: "table", content: tableIndex });
            lastIndex = splitter.lastIndex;
        }
        const tail = text.slice(lastIndex);
        if (tail) parts.push({ type: "md", content: tail });

        return { parts, tables };
    }, [analysisContent]);

    const handleDownload = () => {
        if (!publicDataPk) {
            alert("다운로드할 파일의 고유 ID가 없습니다.");
            return;
        }
        const downloadUrl = `http://localhost:8080/api/download/${publicDataPk}`;
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AnalysisContainer>
            <Header>
                <h4>
                    <span role="img" aria-label="icon">📊</span> 데이터 분석 결과
                </h4>
                {publicDataPk && (
                    <DownloadButton onClick={handleDownload}>원본 데이터 다운로드</DownloadButton>
                )}
            </Header>

            <Content>
                {parts.map((p, i) =>
                    p.type === "md" ? (
                        <ReactMarkdown key={`md-${i}`}>{p.content}</ReactMarkdown>
                    ) : (
                        <DataTable key={`tbl-${i}`} tableData={tables[p.content]} />
                    )
                )}
            </Content>
        </AnalysisContainer>
    );
};

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
    background-color: #0099ff;
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
        background-color: #0073ff;
    }
`;

const Content = styled.div`
    color: #374151;
    line-height: 1.2;

    h1, h2, h3 {
        color: #1e3a8a;
        margin-top: 0.4em;
        margin-bottom: 0.2em;
        line-height: 1.2;
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

    th, td {
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