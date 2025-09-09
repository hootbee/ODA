// src/components/UtilizationDashboard.jsx
import React from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";

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
  margin-bottom: 12px;
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
  margin-bottom: 12px;
  line-height: 1.5;
  strong {
    font-weight: 600;
    color: #333;
  }
  p {
    margin: 6px 0 0 0;
    padding-left: 8px;
    font-size: 0.95em;
  }
  &:last-child {
    margin-bottom: 0;
  }
`;

// 들어온 데이터가 단일/이중 래핑이든 안전하게 payload 꺼내기
function extractPayload(data) {
  if (!data) return null;
  // 단일 래핑 { success: true, data: {...} }
  if (data.success && data.data && !data.data.success) return data.data;
  // 이중 래핑 { success: true, data: { success: true, data: {...} } }
  if (data.success && data.data && data.data.success && data.data.data) {
    return data.data.data;
  }
  // 혹시 바로 카테고리일 수도 있음
  const maybe = data.data || data;
  if (maybe && typeof maybe === "object") return maybe;
  return null;
}

// content를 항상 문자열로 변환
function getItemText(item) {
  const c = item?.content;
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    if (typeof c.text === "string") return c.text;
    if (typeof c.markdown === "string") return c.markdown;
    if (Array.isArray(c)) return c.map((x) => String(x ?? "")).join("\n");
    try {
      return JSON.stringify(c, null, 2);
    } catch {
      return String(c);
    }
  }
  if (c == null) return "";
  return String(c);
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
      key: "combinationSuggestions",
      title: "데이터 결합",
      type: "combination",
      icon: "🔗",
    },
    { key: "analysisTools", title: "분석 도구", type: "tools", icon: "🛠️" },
  ];

  const handleCategoryClick = (category) => {
    if (typeof onCategorySelect === "function") {
      onCategorySelect(category.type, fileName);
    }
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <h3>"{fileName}" 데이터 활용 방안 요약</h3>
        <p>카테고리를 눌러 자세한 추천을 받아보세요.</p>
      </DashboardHeader>

      <CategoriesGrid>
        {categories.map((cat) => {
          const items = Array.isArray(actualData[cat.key])
            ? actualData[cat.key]
            : [];
          return (
            <CategoryCard
              key={cat.key}
              onClick={() => handleCategoryClick(cat)}
            >
              <CategoryHeader>
                <CategoryIcon>{cat.icon}</CategoryIcon>
                <CategoryTitle>{cat.title}</CategoryTitle>
              </CategoryHeader>

              <PreviewList>
                {items.length > 0 ? (
                  items.slice(0, 2).map((item, idx) => {
                    const itemText = getItemText(item); // ✅ JSX 밖에서 선언
                    return (
                      <PreviewItem key={idx}>
                        <strong>• {item?.title || "제목 없음"}</strong>
                        {itemText ? (
                          <ReactMarkdown>{itemText}</ReactMarkdown> // ✅ 문자열화된 텍스트 사용
                        ) : (
                          <p>내용 없음</p>
                        )}
                      </PreviewItem>
                    );
                  })
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
