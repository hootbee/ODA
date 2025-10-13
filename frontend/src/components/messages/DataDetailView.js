import React from 'react';
import styled from 'styled-components';

const DataDetailView = ({ data }) => {
    if (!data) return null;
    return (
        <DetailContainer>
            <h3><span role="img" aria-label="icon">📋</span> {data.title || '데이터 상세 정보'}</h3>
            <DetailGrid>
                <DetailItem><strong>🆔 데이터 식별자:</strong> {data.publicDataPk}</DetailItem>
                <DetailItem><strong>🏢 제공기관:</strong> {data.providerAgency}</DetailItem>
                <DetailItem><strong>🏭 제공부서:</strong> {data.providerDepartment}</DetailItem>
                <DetailItem><strong>📂 분류:</strong> {data.category}</DetailItem>
                <DetailItem><strong>📅 데이터 갱신일:</strong> {data.modifiedDate}</DetailItem>
                <DetailItem><strong>📞 담당자 연락처:</strong> {data.contactNumber}</DetailItem>
                <DetailItem><strong>💻 원본 시스템:</strong> {data.sourceSystem}</DetailItem>
                <DetailItem><strong>📜 라이선스:</strong> {data.licenseType}</DetailItem>
            </DetailGrid>
            {data.usageTerms && (
                <DescriptionSection>
                    <strong>ℹ️ 활용 조건:</strong>
                    <blockquote>{data.usageTerms}</blockquote>
                </DescriptionSection>
            )}
            {data.keywords && data.keywords.length > 0 && (
                <KeywordSection>
                    <strong>🔑 키워드:</strong>
                    <KeywordContainer>
                        {[...new Set(data.keywords)].map((kw, i) => <KeywordTag key={i}>{kw}</KeywordTag>)}
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
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  h3 {
    font-size: 1.4em;
    color: #1a202c;
    margin-top: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #f1f5f9;
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
  color: #4a5568;
  strong { color: #2d3748; }
`;

const KeywordSection = styled.div`
  margin-top: 16px;
  strong { display: block; margin-bottom: 8px; color: #2d3748; }
`;

const KeywordContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const KeywordTag = styled.span`
  background-color: #edf2f7;
  color: #4a5568;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.9em;
`;

const DescriptionSection = styled.div`
  margin-top: 16px;
  strong { display: block; margin-bottom: 8px; color: #2d3748; }
  blockquote {
    margin: 0;
    padding: 12px;
    background-color: #f7fafc;
    border-left: 4px solid #e2e8f0;
    color: #4a5568;
    white-space: pre-wrap;
    line-height: 1.6;
  }
`;
