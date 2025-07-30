// components/UtilizationDashboard.jsx
import React, { useState } from "react";
import styled from "styled-components";

const UtilizationDashboard = ({ data, fileName, onCategorySelect }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const categories = [
    {
      key: "businessApplications",
      title: "💼 비즈니스 활용",
      type: "business",
      icon: "💼",
      description: "수익 창출 및 사업 아이디어",
    },
    {
      key: "researchApplications",
      title: "🔬 연구 활용",
      type: "research",
      icon: "🔬",
      description: "학술 연구 및 기술 개발",
    },
    {
      key: "policyApplications",
      title: "🏛️ 정책 활용",
      type: "policy",
      icon: "🏛️",
      description: "공공 정책 및 행정 개선",
    },
    {
      key: "combinationSuggestions",
      title: "🔗 데이터 결합",
      type: "combination",
      icon: "🔗",
      description: "다른 데이터와의 융합 활용",
    },
    {
      key: "analysisTools",
      title: "🛠️ 분석 도구",
      type: "tools",
      icon: "🛠️",
      description: "추천 분석 및 시각화 도구",
    },
  ];

  const handleCategoryClick = (category) => {
    onCategorySelect(category.type, fileName);
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <h3>📊 {fileName} 활용방안 대시보드</h3>
        <p>관심 있는 분야를 클릭하면 상세 분석을 확인할 수 있습니다.</p>
      </DashboardHeader>

      <CategoriesGrid>
        {categories.map((category) => (
          <CategoryCard
            key={category.key}
            onClick={() => handleCategoryClick(category)}
          >
            <CategoryHeader>
              <CategoryIcon>{category.icon}</CategoryIcon>
              <CategoryTitle>{category.title}</CategoryTitle>
            </CategoryHeader>

            <CategoryDescription>{category.description}</CategoryDescription>

            <PreviewList>
              {data?.data?.[category.key]
                ?.slice(0, 2)
                .map((item, index) => (
                  <PreviewItem key={index}>
                    • {item.length > 50 ? `${item.substring(0, 50)}...` : item}
                  </PreviewItem>
                )) || ["분석 중..."]}
            </PreviewList>

            <MoreButton>
              상세 보기 ({data?.data?.[category.key]?.length || 0}개)
            </MoreButton>
          </CategoryCard>
        ))}
      </CategoriesGrid>
    </DashboardContainer>
  );
};

// ============== Styled Components ===============

const DashboardContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 10px 0;
  color: white;
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  margin-bottom: 8px;
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

const CategoryDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.85em;
  opacity: 0.8;
  line-height: 1.4;
`;

const PreviewList = styled.div`
  margin-bottom: 12px;
`;

const PreviewItem = styled.div`
  font-size: 0.8em;
  opacity: 0.9;
  margin-bottom: 4px;
  line-height: 1.3;
`;

const MoreButton = styled.div`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  text-align: center;
  font-size: 0.85em;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export default UtilizationDashboard;
