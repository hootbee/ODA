// components/UtilizationDashboard.jsx
import React from "react";
import styled from "styled-components";

// ============ Styled Components (시작) ============
const DashboardContainer = styled.div`
  background: #e9e9eb;
  border-radius: 20px;
  padding: 20px;
  margin: 10px 0;
  color: black;
`;

const DashboardHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
  h3 {
    margin: 0 0 8px 0;
    font-size: 1.4em;
  }
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9em;
  }
`;

const CategoriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
`;

const CategoryCard = styled.div`
  background: rgba(141, 141, 141, 0.1);
  border: 1px solid rgba(181, 181, 181, 0.2);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px; // 간격 조정
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

// 🔴 1. 미리보기를 표시할 styled-component 추가
const PreviewList = styled.div`
  padding-left: 5px;
  border-left: 2px solid rgba(0, 0, 0, 0.1);
`;

const PreviewItem = styled.div`
  font-size: 0.85em;
  opacity: 0.8;
  margin-bottom: 6px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:last-child {
    margin-bottom: 0;
  }
`;
// ============ Styled Components (끝) ============

const UtilizationDashboard = ({ data, fileName, onCategorySelect }) => {
  if (!data || !data.success) {
    const errorMessage =
      data?.error || "데이터를 분석하는 중 알 수 없는 오류가 발생했습니다.";
    return (
      <DashboardContainer>
        <DashboardHeader>
          <h3>분석 실패</h3>
        </DashboardHeader>
        <ErrorDisplay>{errorMessage}</ErrorDisplay>
      </DashboardContainer>
    );
  }

  const actualData = data.data;

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
      key: "combinationSuggestions",
      title: "데이터 결합",
      type: "combination",
      icon: "🔗",
    },
    { key: "analysisTools", title: "분석 도구", type: "tools", icon: "🛠️" },
  ];

  const handleCategoryClick = (category) => {
    onCategorySelect(category.type, fileName);
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <h3>"{fileName}" 데이터 활용 방안</h3>
        <p>아래 카테고리를 선택하여 더 자세한 AI 추천을 받아보세요.</p>
      </DashboardHeader>

      <CategoriesGrid>
        {categories.map((cat) => (
          <CategoryCard key={cat.key} onClick={() => handleCategoryClick(cat)}>
            <CategoryHeader>
              <CategoryIcon>{cat.icon}</CategoryIcon>
              <CategoryTitle>{cat.title}</CategoryTitle>
            </CategoryHeader>

            {/* 🔴 2. 카드 내부에 실제 데이터를 매핑하여 미리보기 생성 */}
            <PreviewList>
              {actualData[cat.key] && actualData[cat.key].length > 0 ? (
                actualData[cat.key].slice(0, 2).map(
                  (
                    item,
                    index // 최대 2개 항목만 표시
                  ) => (
                    <PreviewItem key={index} title={item.title}>
                      - {item.title}
                    </PreviewItem>
                  )
                )
              ) : (
                <PreviewItem>추천 내용이 없습니다.</PreviewItem>
              )}
            </PreviewList>
          </CategoryCard>
        ))}
      </CategoriesGrid>

      {/* 🔴 3. 디버깅용 <pre> 태그는 이제 필요 없으므로 제거합니다. */}
    </DashboardContainer>
  );
};

export default UtilizationDashboard;
