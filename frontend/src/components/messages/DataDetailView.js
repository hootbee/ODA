import React from 'react';
import styled from 'styled-components';

const DataDetailView = ({ data }) => {
    if (!data) return null;
    return (
        <DetailContainer>
            <h3><span role="img" aria-label="icon">📋</span> {data.title || '데이터 상세 정보'}</h3>
            <DetailGrid>
                <DetailItem><strong>📄 파일명:</strong> {data.fileDataName}</DetailItem>
                <DetailItem><strong>📅 수정일:</strong> {data.modifiedDate}</DetailItem>
                <DetailItem><strong>📂 분류:</strong> {data.classificationSystem}</DetailItem>
                <DetailItem><strong>🏢 제공기관:</strong> {data.providerAgency}</DetailItem>
            </DetailGrid>
            {data.keywords && data.keywords.length > 0 && (
                <KeywordSection>
                    <strong>🔑 키워드:</strong>
                    <KeywordContainer>
                        {data.keywords.map((kw, i) => <KeywordTag key={i}>{kw}</KeywordTag>)}
                    </KeywordContainer>
                </KeywordSection>
            )}
            {data.description && (
                 <DescriptionSection>
                    <strong>📝 상세 설명:</strong>
                    <blockquote>{data.description}</blockquote>
                </DescriptionSection>
            )}
        </DetailContainer>
    );
};

export default DataDetailView;

const DetailContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #f0e2e6ff;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  h3 {
    font-size: 1.4em;
    color: #2c1a1fff;
    margin-top: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #f9f1f3ff;
    padding-bottom: 12px;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

const DetailItem = styled.div`
  font-size: 0.95em;
  color: #684a54ff;
  strong { color: #482d36ff; }
`;

const KeywordSection = styled.div`
  margin-top: 16px;
  strong { display: block; margin-bottom: 8px; color: #482d36ff; }
`;

const KeywordContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const KeywordTag = styled.span`
  background-color: #f7edf0ff;
  color: #684a53ff;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.9em;
`;

const DescriptionSection = styled.div`
  margin-top: 16px;
  strong { display: block; margin-bottom: 8px; color: #482d34ff; }
  blockquote {
    margin: 0;
    padding: 12px;
    background-color: #fcf7f8ff;
    border-left: 4px solid #f0e2e6ff;
    color: #684a53ff;
    white-space: pre-wrap;
    line-height: 1.6;
  }
`;
