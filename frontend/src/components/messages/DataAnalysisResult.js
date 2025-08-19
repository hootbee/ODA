import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

const DataAnalysisResult = ({ data }) => {
    const analysisContent = data.analysis || '분석 결과를 불러오는 데 실패했습니다.';

    return (
        <AnalysisContainer>
            <h4><span role="img" aria-label="icon">📊</span> 데이터 분석 결과</h4>
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
  h4 { 
    font-size: 1.2em; 
    color: #0c4a6e; 
    margin: 0 0 12px 0; 
    padding-bottom: 8px;
    border-bottom: 2px solid #e0f2fe;
  }
`;

const Content = styled.div`
  color: #374151;
  line-height: 1.6;
  
  h1, h2, h3 {
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
    font-family: 'Courier New', Courier, monospace;
  }
`;
