"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDataService = void 0;
/**
 * 공공데이터 검색 및 추천 서비스 (DB 엔티티 연동 최적화)
 */
class PublicDataService {
    constructor() {
        // 정의된 대분류 체계
        this.majorCategories = [
            "지역개발",
            "교육",
            "일반공공행정",
            "재정·세제·금융",
            "환경",
            "농림",
            "사회복지",
            "산업·통상·중소기업",
            "보건",
            "문화체육관광",
            "국토·지역개발",
            "교통및물류",
            "과학기술",
        ];
    }
    /**
     * 검색 파라미터 추출 (DB 필드명 매핑)
     */
    searchData(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const { prompt } = input;
            const majorCategory = this.extractMajorCategory(prompt);
            return {
                searchYear: this.extractYear(prompt),
                title: this.extractTitle(prompt),
                keywords: prompt,
                classificationSystem: this.classifySystem(prompt),
                providerAgency: this.extractAgency(prompt),
                majorCategory: majorCategory,
                hasDateFilter: this.hasDateRelatedTerms(prompt),
                fileDataName: this.extractFileDataName(prompt),
                fileExtension: this.extractFileExtension(prompt),
                description: `${majorCategory} 관련 ${prompt} 검색 결과`,
            };
        });
    }
    /**
     * 다단계 데이터 추천 (DB 연동 최적화)
     */
    recommendData(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const { prompt, category, candidates } = input;
            // 1단계: 대분류 추출
            const majorCategory = this.extractMajorCategory(prompt);
            // 2단계: 날짜 관련 프롬프트 확인
            const hasDateFilter = this.hasDateRelatedTerms(prompt);
            const yearFilter = this.extractYear(prompt);
            // 3단계: 키워드 추출
            const keywordFilters = this.extractKeywords(prompt);
            // 4단계: AI 기반 관련성 필터링
            const filtered = this.filterByRelevance(prompt, candidates, majorCategory);
            // 최종 3-5개 추천
            const finalRecommendations = filtered.slice(0, 5);
            return {
                recommendations: finalRecommendations,
                filteringSteps: {
                    step1_majorCategory: majorCategory,
                    step2_dateFiltered: hasDateFilter,
                    step3_finalCount: finalRecommendations.length,
                    dbQueryHints: {
                        majorCategoryFilter: majorCategory,
                        yearFilter: yearFilter,
                        keywordFilters: keywordFilters,
                    },
                },
            };
        });
    }
    // === DB 연동 헬퍼 메서드들 ===
    /**
     * 파일데이터명 추출 (fileDataName 필드용)
     */
    extractFileDataName(prompt) {
        const majorCategory = this.extractMajorCategory(prompt);
        const year = this.extractYear(prompt) || new Date().getFullYear();
        const agency = this.extractAgency(prompt);
        // 실제 파일명 패턴에 맞게 생성
        return `${agency}_${majorCategory}_${year}`;
    }
    /**
     * 파일 확장자 추론 (fileExtension 필드용)
     */
    extractFileExtension(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes("csv") || lowerPrompt.includes("엑셀"))
            return "csv";
        if (lowerPrompt.includes("json"))
            return "json";
        if (lowerPrompt.includes("xml"))
            return "xml";
        if (lowerPrompt.includes("pdf"))
            return "pdf";
        return "csv"; // 기본값
    }
    /**
     * 키워드 배열 추출 (DB 검색 최적화용)
     */
    extractKeywords(prompt) {
        // 불용어 제거 후 의미있는 키워드만 추출
        const stopWords = [
            "데이터",
            "정보",
            "관련",
            "대한",
            "있는",
            "관련된",
            "최근",
            "최신",
            "그",
            "이",
            "저",
            "것",
            "에",
            "를",
            "의",
            "와",
            "과",
        ];
        const words = prompt
            .replace(/[^\w\s가-힣]/g, " ") // 특수문자 제거
            .split(/\s+/)
            .filter((word) => word.length > 1 && !stopWords.includes(word))
            .slice(0, 5); // 최대 5개 키워드
        return words;
    }
    /**
     * 프롬프트에서 대분류 추출
     */
    extractMajorCategory(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        // 키워드 매핑 (우선순위 순으로 배치)
        const categoryKeywords = {
            문화체육관광: [
                "문화재",
                "관광",
                "체육",
                "문화",
                "박물관",
                "공연",
                "축제",
                "예술",
            ],
            환경: ["환경", "대기", "수질", "폐기물", "오염", "녹지", "생태", "기후"],
            교통및물류: [
                "교통",
                "도로",
                "지하철",
                "버스",
                "물류",
                "주차",
                "교통사고",
                "신호등",
            ],
            교육: ["교육", "학교", "대학", "학습", "도서관", "연구", "학생", "교사"],
            보건: ["보건", "병원", "의료", "건강", "질병", "의약", "코로나", "백신"],
            사회복지: [
                "복지",
                "어린이",
                "노인",
                "장애",
                "저소득",
                "돌봄",
                "보육",
                "복지관",
            ],
            "산업·통상·중소기업": [
                "산업",
                "기업",
                "창업",
                "경제",
                "무역",
                "중소기업",
                "공장",
                "제조업",
            ],
            일반공공행정: [
                "행정",
                "민원",
                "공무원",
                "정책",
                "규제",
                "법령",
                "시청",
                "구청",
            ],
            "재정·세제·금융": [
                "재정",
                "세금",
                "금융",
                "예산",
                "투자",
                "경제",
                "세무",
                "은행",
            ],
            지역개발: [
                "개발",
                "도시",
                "지역",
                "건설",
                "인프라",
                "택지",
                "재개발",
                "도시계획",
            ],
            농림: ["농업", "임업", "농산물", "산림", "축산", "어업", "농가", "농촌"],
        };
        // 키워드 매칭으로 대분류 찾기 (점수 기반)
        let bestMatch = "일반공공행정";
        let highestScore = 0;
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (lowerPrompt.includes(keyword) ? 1 : 0);
            }, 0);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = category;
            }
        }
        return bestMatch;
    }
    /**
     * 날짜 관련 용어 확인
     */
    hasDateRelatedTerms(prompt) {
        const dateTerms = [
            "최근",
            "최신",
            "2023",
            "2024",
            "2025",
            "작년",
            "올해",
            "업데이트",
            "갱신",
            "신규",
            "새로운",
            "최근 몇 년",
            "최근 몇개월",
        ];
        return dateTerms.some((term) => prompt.includes(term));
    }
    /**
     * 연도 추출 (modifiedDate 필터링용)
     */
    extractYear(prompt) {
        // 4자리 연도 패턴 매칭
        const yearMatch = prompt.match(/(\d{4})/);
        if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            // 유효한 연도 범위 체크 (2000-2030)
            if (year >= 2000 && year <= 2030) {
                return year;
            }
        }
        // 상대적 년도 표현 처리
        const currentYear = new Date().getFullYear();
        if (prompt.includes("작년"))
            return currentYear - 1;
        if (prompt.includes("올해") || prompt.includes("금년"))
            return currentYear;
        if (prompt.includes("최근") || prompt.includes("최신"))
            return currentYear;
        return null;
    }
    /**
     * AI 기반 관련성 필터링
     */
    filterByRelevance(prompt, candidates, majorCategory) {
        const lowerPrompt = prompt.toLowerCase();
        const promptTokens = this.extractKeywords(prompt);
        return candidates
            .map((candidate) => ({
            name: candidate,
            score: this.calculateRelevanceScore(candidate, promptTokens, majorCategory, lowerPrompt),
        }))
            .sort((a, b) => b.score - a.score)
            .map((item) => item.name);
    }
    /**
     * 관련성 점수 계산 (개선된 버전)
     */
    calculateRelevanceScore(candidate, promptTokens, majorCategory, originalPrompt) {
        const lowerCandidate = candidate.toLowerCase();
        let score = 0;
        // 1. 프롬프트 토큰 매칭 (각 토큰당 15점)
        promptTokens.forEach((token) => {
            if (lowerCandidate.includes(token.toLowerCase())) {
                score += 15;
            }
        });
        // 2. 대분류 관련성 (25점)
        if (lowerCandidate.includes(majorCategory.toLowerCase())) {
            score += 25;
        }
        // 3. 완전 단어 매칭 보너스 (10점)
        const candidateTokens = lowerCandidate.split(/[\s_-]+/);
        promptTokens.forEach((token) => {
            if (candidateTokens.includes(token.toLowerCase())) {
                score += 10;
            }
        });
        // 4. 길이 기반 패널티/보너스
        if (candidate.length > 100) {
            score -= 10; // 너무 긴 이름 패널티
        }
        else if (candidate.length < 20) {
            score -= 5; // 너무 짧은 이름 패널티
        }
        // 5. 특수 키워드 보너스
        const specialKeywords = ["최신", "신규", "업데이트", "개선"];
        specialKeywords.forEach((keyword) => {
            if (originalPrompt.includes(keyword) &&
                lowerCandidate.includes(keyword)) {
                score += 5;
            }
        });
        return Math.max(0, score); // 음수 점수 방지
    }
    /**
     * 분류 체계 결정
     */
    classifySystem(prompt) {
        const majorCategory = this.extractMajorCategory(prompt);
        // 대분류에 따른 세부 분류 매핑
        const subCategories = {
            문화체육관광: "문화체육관광-문화재",
            환경: "환경-상하수도·수질",
            교통및물류: "교통및물류-도로",
            교육: "교육-교육일반",
            보건: "보건-보건의료",
            사회복지: "사회복지-사회복지일반",
            "산업·통상·중소기업": "산업·통상·중소기업-산업일반",
            일반공공행정: "일반공공행정-일반행정",
            "재정·세제·금융": "재정·세제·금융-재정일반",
            지역개발: "지역개발-도시계획",
            농림: "농림-농업일반",
        };
        return subCategories[majorCategory] || `${majorCategory}-기타`;
    }
    /**
     * 제목 추출
     */
    extractTitle(prompt) {
        const majorCategory = this.extractMajorCategory(prompt);
        const year = this.extractYear(prompt);
        if (year) {
            return `${year}년 ${majorCategory}`;
        }
        return majorCategory;
    }
    /**
     * 제공 기관 추출
     */
    extractAgency(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        // 광역시/특별시 매핑
        const agencies = {
            인천: "인천광역시서구",
            대구: "대구광역시서구",
            서울: "서울특별시",
            부산: "부산광역시",
            대전: "대전광역시",
            광주: "광주광역시",
            울산: "울산광역시",
            세종: "세종특별자치시",
            경기: "경기도",
            강원: "강원도",
            충북: "충청북도",
            충남: "충청남도",
            전북: "전라북도",
            전남: "전라남도",
            경북: "경상북도",
            경남: "경상남도",
            제주: "제주특별자치도",
        };
        for (const [keyword, agency] of Object.entries(agencies)) {
            if (lowerPrompt.includes(keyword)) {
                return agency;
            }
        }
        return "기타기관";
    }
    /**
     * 날짜 정보 추출 (상세 버전) - 타입 수정
     */
    extractDateInfo(prompt) {
        const year = this.extractYear(prompt);
        const isRecent = this.hasDateRelatedTerms(prompt);
        // 기간 추출 (예: "2020-2023", "2020년부터 2023년까지")
        const rangeMatch = prompt.match(/(\d{4})[-~부터]*\s*(\d{4})/);
        let dateRange;
        if (rangeMatch) {
            dateRange = {
                startYear: parseInt(rangeMatch[1]),
                endYear: parseInt(rangeMatch[2]),
            };
        }
        return {
            year, // 이제 타입 에러 없음
            isRecent,
            dateRange,
        };
    }
    /**
     * 설명 텍스트 생성
     */
    generateDescription(prompt, majorCategory) {
        const year = this.extractYear(prompt);
        const agency = this.extractAgency(prompt);
        const keywords = this.extractKeywords(prompt).join(", ");
        let description = `${majorCategory} 분야의`;
        if (year) {
            description += ` ${year}년도`;
        }
        if (agency !== "기타기관") {
            description += ` ${agency}`;
        }
        description += ` 관련 데이터`;
        if (keywords) {
            description += ` (키워드: ${keywords})`;
        }
        return description;
    }
    /**
     * 데이터 유효성 검증
     */
    validateInput(input) {
        const { prompt } = input;
        // 최소 길이 체크
        if (!prompt || prompt.trim().length < 2) {
            return false;
        }
        // 특수문자만 있는지 체크
        if (!/[가-힣a-zA-Z0-9]/.test(prompt)) {
            return false;
        }
        return true;
    }
    /**
     * 로깅용 메타데이터 생성
     */
    generateMetadata(prompt) {
        const startTime = Date.now();
        const majorCategory = this.extractMajorCategory(prompt);
        const hasDateFilter = this.hasDateRelatedTerms(prompt);
        const keywords = this.extractKeywords(prompt);
        // 신뢰도 계산 (간단한 휴리스틱)
        let confidence = 0.5; // 기본값
        if (keywords.length > 2)
            confidence += 0.2;
        if (hasDateFilter)
            confidence += 0.1;
        if (majorCategory !== "일반공공행정")
            confidence += 0.2;
        return {
            processingTime: Date.now() - startTime,
            majorCategory,
            hasDateFilter,
            keywordCount: keywords.length,
            confidence: Math.min(1.0, confidence),
        };
    }
}
exports.PublicDataService = PublicDataService;
