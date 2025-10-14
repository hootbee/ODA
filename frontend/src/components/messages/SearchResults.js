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
    </SearchResultsContainer>
);

export default SearchResults;

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
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.95em;
  color: #374151;
  &::before {
    content: counter(result-counter) ". ";
    font-weight: 600;
    color: #0099ffff;
    margin-right: 8px;
  }
`;

