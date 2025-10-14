// src/components/UtilizationDashboard.jsx
import React from "react";
import styled from "styled-components";

const DashboardContainer = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 16px;
  margin: 8px 0;
  color: black;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const DashboardHeader = styled.div`
  text-align: center;
  margin-bottom: 16px;
  h3 {
    font-size: 1.4em;
    margin-top: 0px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
  }
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9em;
  }
`;

const CategoriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr); // 2x2 그리드로 수정
  gap: 12px;
`;

const CategoryCard = styled.div`
  background: #f9fafb;
  border: 1px solid rgba(181, 181, 181, 0.2);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const CategoryIcon = styled.span`
  font-size: 1.5em;
  margin-right: 10px;
`;

const CategoryTitle = styled.h4`
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
`;

const ErrorDisplay = styled.div`
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 8px;
  padding: 16px;
  margin: 10px 0;
  white-space: pre-wrap;
`;

const PreviewList = styled.div`
  padding-left: 5px;
  border-left: 2px solid rgba(0, 0, 0, 0.1);
`;

const PreviewItem = styled.div`
  font-size: 0.9em;
  opacity: 0.9;
  margin-bottom: 16px;
  line-height: 1.5;
  strong {
    font-weight: 600;
    color: #333;
  }
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 8px 0 0 12px;
  margin: 0;
  font-size: 0.85em;
`;

const InfoItem = styled.li`
  color: #495057;
  margin-bottom: 4px;
  display: flex;
  align-items: flex-start;
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #343a40;
  margin-right: 6px;
  flex-shrink: 0;
`;

// 들어온 데이터가 단일/이중 래핑이든 안전하게 payload 꺼내기
function extractPayload(data) {
  if (!data) return null;
  if (data.success && data.data && !data.data.success) return data.data;
  if (data.success && data.data && data.data.success && data.data.data) {
    return data.data.data;
  }
  const maybe = data.data || data;
  if (maybe && typeof maybe === "object") return maybe;
  return null;
}

const UtilizationDashboard = ({ data, fileName, onCategorySelect }) => {
  const actualData = extractPayload(data);

  if (!actualData) {
    const errorMessage =
      (data && data.error) ||
      "데이터를 분석하는 중 알 수 없는 오류가 발생했습니다.";
    return (
      <DashboardContainer>
        <DashboardHeader>
          <h3>분석 실패</h3>
        </DashboardHeader>
        <ErrorDisplay>{errorMessage}</ErrorDisplay>
      </DashboardContainer>
    );
  }

  const categories = [
    {
      key: "businessApplications",
      title: "비즈니스 활용",
      type: "business",
      icon: "💼",
    },
    {
      key: "researchApplications",
      title: "연구 활용",
      type: "research",
      icon: "🔬",
    },
    {
      key: "policyApplications",
      title: "정책 활용",
      type: "policy",
      icon: "🏛️",
    },
    {
      key: "socialProblemApplications", // ✅ 수정된 카테고리
      title: "사회문제 해결",
      type: "social_problem",
      icon: "🤝",
    },
  ];

  const handleCategoryClick = (category) => {
    if (typeof onCategorySelect === "function") {
      onCategorySelect(category.type, fileName);
    }
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <h3>`{fileName}` 데이터 활용 방안 요약</h3>
      </DashboardHeader>

      <CategoriesGrid>
        {categories.map((cat) => {
          const items = Array.isArray(actualData[cat.key])
            ? actualData[cat.key]
            : [];
          return (
            <CategoryCard
              // key={cat.key}
              // onClick={() => handleCategoryClick(cat)}
            >
              <CategoryHeader>
                <CategoryIcon>{cat.icon}</CategoryIcon>
                <CategoryTitle>{cat.title}</CategoryTitle>
              </CategoryHeader>

              <PreviewList>
                {items.length > 0 ? (
                  items.slice(0, 2).map((item, idx) => (
                    <PreviewItem key={idx}>
                      <strong>• {item?.title || "제목 없음"}</strong>
                      <InfoList>
                        <InfoItem>
                          <InfoLabel>활용방안:</InfoLabel>
                          <span>{item.description}</span>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>기대효과:</InfoLabel>
                          <span>{item.effect}</span>
                        </InfoItem>
                      </InfoList>
                    </PreviewItem>
                  ))
                ) : (
                  <PreviewItem>추천 내용이 없습니다.</PreviewItem>
                )}
              </PreviewList>
            </CategoryCard>
          );
        })}
      </CategoriesGrid>
    </DashboardContainer>
  );
};

export default UtilizationDashboard;
