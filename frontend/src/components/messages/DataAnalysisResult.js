import React, { useMemo } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

// 새로 추가된 테이블 렌더링 컴포넌트
const DataTable = ({ tableData }) => {
    if (!tableData || !tableData.headers || !tableData.rows) {
        return null;
    }

    return (
        <TableContainer>
            <StyledTable>
                <thead>
                    <tr>
                        {tableData.headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tableData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </StyledTable>
        </TableContainer>
    );
};

const DataAnalysisResult = ({ data }) => {
    const analysisContent = data.analysis || '분석 결과를 불러오는 데 실패했습니다.';
    const publicDataPk = data.publicDataPk;

    // useMemo를 사용하여 렌더링 간 불필요한 재계산을 방지
    const { markdownText, tableData } = useMemo(() => {
        const jsonRegex = /```json\n([\s\S]*?)\n```/;
        const match = analysisContent.match(jsonRegex);

        if (match && match[1]) {
            try {
                const jsonData = JSON.parse(match[1]);
                // JSON 블록을 제외한 나머지 텍스트를 markdown으로 렌더링
                const text = analysisContent.replace(jsonRegex, '\n**데이터 미리보기:**\n').trim();
                return { markdownText: text, tableData: jsonData };
            } catch (e) {
                console.error("Failed to parse table JSON:", e);
            }
        }
        // JSON이 없으면 전체를 markdown으로 렌더링
        return { markdownText: analysisContent, tableData: null };
    }, [analysisContent]);

    const handleDownload = () => {
        if (!publicDataPk) {
            alert("다운로드할 파일의 고유 ID가 없습니다.");
            return;
        }
        const downloadUrl = `http://localhost:8080/api/download/${publicDataPk}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AnalysisContainer>
            <Header>
                <h4><span role="img" aria-label="icon">📊</span> 데이터 분석 결과</h4>
                {publicDataPk && <DownloadButton onClick={handleDownload}>원본 데이터 다운로드</DownloadButton>}
            </Header>
            <Content>
                <ReactMarkdown>{markdownText}</ReactMarkdown>
                <DataTable tableData={tableData} />
            </Content>
        </AnalysisContainer>
    );
};

export default DataAnalysisResult;

// --- 기존 스타일 컴포넌트들 ---

const AnalysisContainer = styled.div`
  background-color: #f9fbfaff;
  border: 1px solid #e0feeeff;
  border-radius: 20px;
  padding: 20px;
  margin: 10px 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #e0fef0ff;
  margin-bottom: 12px;

  h4 {
    font-size: 1.2em;
    color: #0c6e40ff;
    margin: 0 0 8px 0;
  }
`;

const DownloadButton = styled.button`
  background-color: #00dd55ff;
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
    background-color: #00c04dff;
  }
`;

const Content = styled.div`
  color: #374151;
  line-height: 1.6;
  
  h1, h2, h3 { color: #1e8a46ff; margin-top: 1em; margin-bottom: 0.5em; }
  p { margin-bottom: 0.8em; }
  strong { color: #1eaf69ff; }
  ul, ol { padding-left: 20px; margin-bottom: 1em; }
  li { margin-bottom: 0.4em; }
  code { background-color: #e5ebe8ff; padding: 2px 5px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; }
`;

// --- 새로 추가된 테이블 스타일 ---

const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 1.2em;
  border: 1px solid #d1dbd5ff;
  border-radius: 8px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;

  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e5ebe8ff;
    white-space: nowrap;
  }

  thead th {
    background-color: #f9fbfaff;
    color: #375144ff;
    font-weight: 600;
  }

  tbody tr:nth-child(even) {
    background-color: #f9fbfaff;
  }

  tbody tr:hover {
    background-color: #f3f6f5ff;
  }
`;