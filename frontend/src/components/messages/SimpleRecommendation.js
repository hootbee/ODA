import React from 'react';
import styled from 'styled-components';

const SimpleRecommendation = ({ recommendations }) => (
    <RecommendationList>
        {recommendations.map((rec, index) => (
            <RecommendationItem key={index}>
                <Title>💡 {rec.title}</Title>
                <Description>{rec.description}</Description>
                {rec.effect && (
                    <EffectSection>
                        <EffectLabel>기대 효과</EffectLabel>
                        <EffectValue>{rec.effect}</EffectValue>
                    </EffectSection>
                )}
            </RecommendationItem>
        ))}
    </RecommendationList>
);

export default SimpleRecommendation;

// ============== Styled Components ==============

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: left;
  width: 100%;
`;

const RecommendationItem = styled.div`
  background-color: #ffffff;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #eef2f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  line-height: 1.7;
  color: #34495e;
`;

const Title = styled.h4`
  margin: 0 0 12px 0;
  font-size: 1.3em;
  font-weight: 700;
  color: #2c3e50;
`;

const Description = styled.p`
  margin: 0 0 16px 0;
  color: #576574;
  white-space: pre-wrap;
`;

const EffectSection = styled.div`
  background-color: #f8f9fa;
  padding: 12px 15px;
  border-radius: 8px;
  border-left: 4px solid #0099ffff;
`;

const EffectLabel = styled.div`
  font-size: 0.9em;
  font-weight: 600;
  color: #868e96;
  margin-bottom: 6px;
`;

const EffectValue = styled.div`
  font-size: 1em;
  font-weight: 500;
  color: #212529;
`;