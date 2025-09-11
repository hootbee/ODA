import React from 'react';
import styled from 'styled-components';

const MetricItem = ({ label, value }) => (
    <Metric>
        <MetricLabel>{label}</MetricLabel>
        <MetricValue>{value}</MetricValue>
    </Metric>
);

const SimpleRecommendation = ({ recommendations }) => (
    <RecommendationList>
        {recommendations.map((rec, index) => (
            <RecommendationItem key={index}>
                <Title>💡 {rec.title}</Title>
                <Description>{rec.description}</Description>
                {rec.metrics && (
                    <MetricsGrid>
                        <MetricItem label="예상 효과" value={rec.metrics.effect} />
                        <MetricItem label="필요 예산" value={rec.metrics.budget} />
                        <MetricItem label="난이도" value={rec.metrics.difficulty} />
                    </MetricsGrid>
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

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
`;

const Metric = styled.div`
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
`;

const MetricLabel = styled.div`
  font-size: 0.85em;
  font-weight: 600;
  color: #868e96;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 0.95em;
  font-weight: 500;
  color: #212529;
`;
