import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

const SimpleRecommendation = ({ recommendations }) => (
    <RecommendationList>
        {recommendations.map((rec, index) => (
            <RecommendationItem key={index}>
                <RecommendationTitle>{rec.title}</RecommendationTitle>
                <ReactMarkdown>{rec.content}</ReactMarkdown>
            </RecommendationItem>
        ))}
    </RecommendationList>
);

export default SimpleRecommendation;

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px; // 간격 살짝 조정
  text-align: left;
`;

const RecommendationItem = styled.div`
  background-color: #f8f9fa;
  padding: 12px 16px; // 패딩 살짝 조정
  border-radius: 10px;
  border: 1px solid #e9ecef;
  line-height: 1.6; // 줄 간격 조정
  p {
    margin: 0;
  }
`;

// 제목 스타일 추가
const RecommendationTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1.05em;
  font-weight: 600;
  color: #343a40;
`;
