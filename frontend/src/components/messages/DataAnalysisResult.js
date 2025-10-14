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
    background: white;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 12px;
    margin-bottom: 16px;

    h4 {
        font-size: 1.3em;
        font-weight: 700;
        color: #1a202c;
        margin: 0;
    }
`;

const DownloadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: #0099ffff;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 0.9em;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease-in-out;

    &:hover {
        background-color: #007acc;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 122, 204, 0.2);
    }
`;

const Content = styled.div`
    color: #374151;
    line-height: 1.7;
    font-size: 0.95em;

    h1, h2, h3 {
        color: #1e3a8a;
        margin-top: 1em;
        margin-bottom: 0em;
        line-height: 1.3;
    }

    h4 {
        margin-top: 0.5em;
        margin-bottom: 0em;
    }

    p {
        margin-bottom: 0em;
    }

    strong {
        color: #1e40af;
    }

    ul, ol {
        padding-left: 20px;
        margin-bottom: 0em;
    }

    li {
        margin-bottom: 0em;
    }

    code {
        background-color: #eef2ff;
        color: #4338ca;
        padding: 3px 6px;
        border-radius: 4px;
        font-family: "Courier New", Courier, monospace;
        font-size: 0.9em;
    }
`;

const TableContainer = styled.div`
    overflow-x: auto;
    margin: 20px 0;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background-color: #f9fafb; 
    margin-bottom: 50px;
`;

const StyledTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;

    th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    thead th {
        background-color: #f3f4f6;
        color: #374151;
        font-weight: 600;
    }

    tbody tr {
        background-color: #fff;
    }

    tbody tr:hover {
        background-color: #f3f4f6;
    }
`;