import React from "react";
import styled from "styled-components";

export default function SearchResults({ data }) {
  // ✅ results/totalCount 안전 가드
  const items = Array.isArray(data?.results) ? data.results : [];
  const total = Number.isFinite(data?.totalCount) ? data.totalCount : items.length;

  if (!items.length) {
    return (
      <SearchResultsContainer>
        <h4><span role="img" aria-label="icon">🔍</span> 검색 결과</h4>
        <Empty>검색 결과가 없습니다.</Empty>
        <TipMessage>
          💡 특정 데이터에 대한 자세한 정보가 필요하시면 ‘[파일명] 상세정보’ 또는 ‘[파일명] 자세히’라고 말씀하세요.
        </TipMessage>
      </SearchResultsContainer>
    );
  }

  return (
    <SearchResultsContainer>
      <h4><span role="img" aria-label="icon">🔍</span> 검색 결과 ({total}개)</h4>
      <ResultsList>
        {items.map((result, index) => {
          // 문자열/객체 모두 처리
          const isString = typeof result === "string";
          const key =
            (result && (result.id ?? result.publicDataPk ?? result.pk)) ??
            `result-${index}`;

          const title = isString
            ? result
            : (result.title ?? result.fileDataName ?? result.name ?? "제목 없음");

          const desc = isString
            ? ""
            : (result.description ?? result.summary ?? result.provider ?? "");

          return (
            <ResultItem key={key}>
              <div className="title">{title}</div>
              {desc && <div className="desc">{desc}</div>}
            </ResultItem>
          );
        })}
      </ResultsList>
      <TipMessage>
        💡 특정 데이터에 대한 자세한 정보가 필요하시면 ‘[파일명] 상세정보’ 또는 ‘[파일명] 자세히’라고 말씀하세요.
      </TipMessage>
    </SearchResultsContainer>
  );
}

const Empty = styled.div`
  font-size: 0.95em;
  color: #6b7280;
  margin: 6px 0 10px;
`;

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
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
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
    color: #0099ff;
    margin-right: 8px;
  }
  .title { font-weight: 600; }
  .desc { font-size: 0.9em; color: #6b7280; margin-top: 4px; }
`;
