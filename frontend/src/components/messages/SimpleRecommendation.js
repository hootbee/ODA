import React from 'react';
import styled from 'styled-components';

const SimpleRecommendation = (props) => {
    const { recommendations } = props;

    console.log("🎨 SimpleRecommendation 전체 props:", props);
    console.log("🎨 recommendations 원본:", recommendations);

    // ✅ 강화된 중첩 구조 해결
    let actualRecommendations = recommendations;

    if (Array.isArray(recommendations) && recommendations.length > 0) {
        const firstItem = recommendations[0];

        // Case 1: 첫 번째 요소가 전체 객체 구조인 경우
        if (firstItem && firstItem.type === 'simple_recommendation' && Array.isArray(firstItem.recommendations)) {
            console.log("🔧 중첩된 객체 구조 감지, 실제 recommendations 추출");
            actualRecommendations = firstItem.recommendations;
        }
        // Case 2: 첫 번째 요소가 또 다른 배열 래퍼인 경우
        else if (firstItem && Array.isArray(firstItem.recommendations)) {
            console.log("🔧 배열 래퍼 구조 감지, 내부 recommendations 추출");
            actualRecommendations = firstItem.recommendations;
        }
        // Case 3: 첫 번째 요소 자체가 추천 배열인 경우 (드물지만 가능)
        else if (firstItem && Array.isArray(firstItem)) {
            console.log("🔧 첫 번째 요소가 배열인 경우");
            actualRecommendations = firstItem;
        }
    }

    console.log("🎨 최종 actualRecommendations:", actualRecommendations);
    console.log("🎨 최종 배열 여부:", Array.isArray(actualRecommendations));
    console.log("🎨 최종 길이:", actualRecommendations?.length);

    if (!actualRecommendations || !Array.isArray(actualRecommendations) || actualRecommendations.length === 0) {
        console.warn("⚠️ actualRecommendations가 비어있거나 배열이 아님");
        return (
            <RecommendationList>
                <EmptyMessage>추천 데이터가 없습니다.</EmptyMessage>
            </RecommendationList>
        );
    }

    return (
        <RecommendationList>
            {actualRecommendations.map((rec, index) => {
                console.log(`🎨 최종 렌더링 항목 ${index}:`, rec);
                console.log(`🎨 title: ${rec?.title}, content: ${rec?.content}, description: ${rec?.description}`);

                // 실제 추천 아이템이 아닌 경우 스킵
                if (!rec || typeof rec !== 'object' || (!rec.title && !rec.content && !rec.description)) {
                    console.warn(`⚠️ 유효하지 않은 추천 아이템 ${index}:`, rec);
                    return null;
                }

                return (
                    <RecommendationItem key={index}>
                        <Title>💡 {rec.title || `제목 없음 ${index + 1}`}</Title>
                        <Description>
                            {rec.content || rec.description || "내용이 없습니다."}
                        </Description>
                        {rec.effect && (
                            <EffectSection>
                                <EffectLabel>기대 효과</EffectLabel>
                                <EffectValue>{rec.effect}</EffectValue>
                            </EffectSection>
                        )}
                    </RecommendationItem>
                );
            })}
        </RecommendationList>
    );
};

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

const EmptyMessage = styled.div`
    padding: 20px;
    text-align: center;
    color: #868e96;
    background-color: #f8f9fa;
    border-radius: 12px;
`;
