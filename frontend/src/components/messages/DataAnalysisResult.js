import React from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";

const DataAnalysisResult = ({ data }) => {
  const analysisContent =
    data.analysis || "분석 결과를 불러오는 데 실패했습니다.";
  const publicDataPk = data.publicDataPk;

    const handleDownload = () => {
    if (!publicDataPk) {
      alert("다운로드할 파일의 고유 ID가 없습니다.");
      return;
    }

    // ChatPage.js의 방식과 동일하게, 전체 URL을 직접 지정합니다.
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
          <span role="img" aria-label="icon">
            📊
          </span>{" "}
          데이터 분석 결과
        </h4>
        <DownloadButton onClick={handleDownload}>
          원본 데이터 다운로드
        </DownloadButton>
      </Header>
      <Content>
        <ReactMarkdown>{analysisContent}</ReactMarkdown>
      </Content>
    </AnalysisContainer>
  );
};

export default DataAnalysisResult;

const AnalysisContainer = styled.div`
  background-color: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 16px;
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
  background-color: #1d4ed8;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1e40af;
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

  ul,
  ol {
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
