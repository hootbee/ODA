import React from 'react';
import styled from 'styled-components';

const SearchNotFound = ({ data }) => (
    <SearchNotFoundContainer>
        <h4><span role="img" aria-label="icon">😕</span> 데이터를 찾을 수 없습니다.</h4>
        <p>다음 검색어를 확인해보세요: <strong>{data.failedKeywords.join(', ')}</strong></p>
        {data.regionKeyword && <p>해당 지역(<strong>{data.regionKeyword}</strong>)의 데이터가 부족할 수 있습니다.</p>}
        <p>다른 지역의 유사한 데이터를 찾아보거나, 더 일반적인 검색어로 다시 시도해보세요.</p>
    </SearchNotFoundContainer>
);

export default SearchNotFound;

const SearchNotFoundContainer = styled.div`
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 20px;
  padding: 20px;
  text-align: center;
  h4 { font-size: 1.2em; color: #b45309; margin: 0 0 8px 0; }
  p { color: #92400e; margin: 0 0 10px 0; }
  strong { color: #b45309; }
`;
