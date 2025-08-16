import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

const SimpleRecommendation = ({ recommendations }) => (
    <RecommendationList>
        {recommendations.map((rec, index) => (
            <RecommendationItem key={index}>
                <ReactMarkdown>{rec}</ReactMarkdown>
            </RecommendationItem>
        ))}
    </RecommendationList>
);

export default SimpleRecommendation;

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
`;

const RecommendationItem = styled.div`
  background-color: #f8f9fa;
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid #e9ecef;
  line-height: 1.5;
  p { margin: 0; }
`;
