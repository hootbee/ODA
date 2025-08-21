import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SimpleRecommendation = ({ recommendations }) => (
    <RecommendationList>
        {recommendations.map((rec, index) => (
            <RecommendationItem key={index}>
                <Number>{index + 1}.</Number>
                <ContentContainer>
                    <RecommendationTitle>{rec.title}</RecommendationTitle>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.content}</ReactMarkdown>
                </ContentContainer>
            </RecommendationItem>
        ))}
    </RecommendationList>
);

export default SimpleRecommendation;

// ============== Styled Components ==============

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
`;

const RecommendationItem = styled.div`
  display: flex;
  align-items: flex-start;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e0e9ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  line-height: 1.6;
  color: #34495e;
  transition: all 0.2s ease-in-out;

  p { 
    margin: 0; 
  }
`;

const Number = styled.span`
    font-size: 1.1rem;
    font-weight: 600;
    color: #0099ffff;
    margin-right: 12px;
    line-height: 1.5; 
`;

const ContentContainer = styled.div`
`;

const RecommendationTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1.2em; 
  font-weight: 700; 
  color: #000000ff;
`;