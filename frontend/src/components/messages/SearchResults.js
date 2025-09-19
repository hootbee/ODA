import React from 'react';
import styled from 'styled-components';

const SearchResults = ({ data }) => (
    <SearchResultsContainer>
        <h4><span role="img" aria-label="icon">🔍</span> 검색 결과 ({data.totalCount}개)</h4>
        <ResultsList>
            {data.results.map((result, index) => (
                <ResultItem key={index}>{result}</ResultItem>
            ))}
        </ResultsList>
        <TipMessage>
            💡 특정 데이터에 대한 자세한 정보가 필요하시면 '[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.
        </TipMessage>
    </SearchResultsContainer>
);

export default SearchResults;

const TipMessage = styled.div`
  margin-top: 12px;
  padding: 10px 15px;
  background-color: #f0f7ff;
  border-radius: 15px;
  font-size: 0.9em;
  color: #4a5568;
  line-height: 1.5;
  text-align: left;
`;

const SearchResultsContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  h4 { font-size: 1.2em; color: #111827; margin: 0 0 16px 0; }
`;

const ResultsList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
  counter-reset: result-counter;
`;

const ResultItem = styled.li`
  counter-increment: result-counter;
  background: #fbf9faff;
  border: 1px solid #ebe5e7ff;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.95em;
  color: #513742ff;
  &::before {
    content: counter(result-counter) ". ";
    font-weight: 600;
    color: #f63b83ff;
    margin-right: 8px;
  }
`;
