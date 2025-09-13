package com.example.oda.prompt;

import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SearchServiceImpl implements SearchService {

    private static final Logger log = LoggerFactory.getLogger(SearchServiceImpl.class);
    private final PublicDataRepository publicDataRepository;

    private static final Set<String> REGION_KEYWORDS = Set.of(
            "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
            "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    );

    // 점수 상수화
    private static final int SCORE_PROVIDER_AGENCY = 200;
    private static final int SCORE_DATA_NAME_STARTS_WITH = 150;
    private static final int SCORE_KEYWORD_EXACT_MATCH = 100;
    private static final int SCORE_KEYWORD_CONTAINS = 60;
    private static final int SCORE_DATA_NAME_CONTAINS = 40;
    private static final int SCORE_TITLE_CONTAINS = 25;
    private static final int SCORE_DESCRIPTION_CONTAINS = 30;
    private static final int SCORE_DESCRIPTION_ALL_KEYWORDS = 50;
    private static final int SCORE_RECENTLY_MODIFIED = 20;
    private static final int SCORE_CLASSIFICATION_CONTAINS = 20;

    // 기본 키워드 점수
    private static final int PRIMARY_KEYWORD_REGION_PROVIDER = 100;
    private static final int PRIMARY_KEYWORD_REGION_NAME_STARTS = 80;
    private static final int PRIMARY_KEYWORD_REGION_NAME_CONTAINS = 50;
    private static final int PRIMARY_KEYWORD_REGION_DESC = 40;
    private static final int PRIMARY_KEYWORD_NORMAL_PROVIDER = 30;
    private static final int PRIMARY_KEYWORD_NORMAL_NAME = 20;
    private static final int PRIMARY_KEYWORD_NORMAL_DESC = 25;

    // 설명 점수
    private static final int DESC_SCORE_KEYWORD_PRESENCE = 10;
    private static final int DESC_SCORE_SPECIAL_TERM = 25;
    private static final int DESC_SCORE_HIGH_KEYWORD_DENSITY = 20;


    public SearchServiceImpl(PublicDataRepository publicDataRepository) {
        this.publicDataRepository = publicDataRepository;
    }

    @Override
    public List<PublicData> searchAndFilterData(List<String> keywords, String majorCategory) {
        log.info("🔍 검색 시작 - 키워드: {}, 카테고리: {}", keywords, majorCategory);

        List<PublicData> allResults = new ArrayList<>();
        for (String keyword : keywords) {
            log.info("🔍 키워드 '{}' 개별 검색 시작", keyword);

            Set<PublicData> keywordResults = new HashSet<>();

            // 각 검색 메소드별 상세 로깅
            try {
                List<PublicData> providerResults = publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword);
                log.info("  - 제공기관 검색 '{}': {}개", keyword, providerResults.size());
                keywordResults.addAll(providerResults);

                List<PublicData> nameResults = publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword);
                log.info("  - 파일명 검색 '{}': {}개", keyword, nameResults.size());
                keywordResults.addAll(nameResults);

                List<PublicData> titleResults = publicDataRepository.findByTitleContainingIgnoreCase(keyword);
                log.info("  - 제목 검색 '{}': {}개", keyword, titleResults.size());
                keywordResults.addAll(titleResults);

                List<PublicData> keywordSearchResults = publicDataRepository.findByKeywordsContainingIgnoreCase(keyword);
                log.info("  - 키워드 필드 검색 '{}': {}개", keyword, keywordSearchResults.size());
                keywordResults.addAll(keywordSearchResults);

                List<PublicData> descResults = publicDataRepository.findByDescriptionContainingIgnoreCase(keyword);
                log.info("  - 설명 검색 '{}': {}개", keyword, descResults.size());
                keywordResults.addAll(descResults);

            } catch (Exception e) {
                log.error("키워드 '{}' 검색 중 오류: {}", keyword, e.getMessage(), e);
            }

            log.info("키워드 '{}' 최종 결과: {}개", keyword, keywordResults.size());
            allResults.addAll(keywordResults);
        }

        log.info("🔍 전체 검색 결과: {}개", allResults.size());
        return allResults;
    }


    @Override
    public List<PublicData> deduplicateResults(List<PublicData> allResults) {
        try {
            return allResults.stream()
                    .filter(publicData -> publicData != null && publicData.getFileDataName() != null)
                    .collect(Collectors.toMap(
                            PublicData::getFileDataName,
                            Function.identity(),
                            (existing, replacement) -> existing,
                            LinkedHashMap::new))
                    .values()
                    .stream()
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("중복 제거 중 오류 발생, 기본 distinct 사용: {}", e.getMessage());
            return allResults.stream()
                    .filter(publicData -> publicData != null && publicData.getFileDataName() != null)
                    .distinct()
                    .collect(Collectors.toList());
        }
    }

    @Override
    public List<PublicData> sortResultsByRelevance(List<PublicData> uniqueResults, List<String> keywords, String prompt) {
        return uniqueResults.stream()
                .sorted((a, b) -> calculateRelevanceScore(b, keywords) - calculateRelevanceScore(a, keywords))
                .collect(Collectors.toList());
    }

    @Override
    public String extractRegionFromKeywords(List<String> keywords) {
        return keywords.stream()
                .filter(this::isRegionKeyword)
                .findFirst()
                .orElse(null);
    }

    private int calculateRelevanceScore(PublicData data, List<String> keywords) {
        int score = 0;
        score += calculateScoresByKeyword(data, keywords);
        score += calculateScoresByPrimaryKeyword(data, keywords);
        score += calculateDescriptionScore(data.getDescription(), keywords);
        score += calculateBonusScores(data, keywords);
        return Math.max(0, score);
    }

    private int calculateScoresByKeyword(PublicData data, List<String> keywords) {
        int score = 0;
        String dataName = data.getFileDataName() != null ? data.getFileDataName().toLowerCase() : "";
        String dataKeywords = data.getKeywords() != null ? data.getKeywords().toLowerCase() : "";
        String dataTitle = data.getTitle() != null ? data.getTitle().toLowerCase() : "";
        String providerAgency = data.getProviderAgency() != null ? data.getProviderAgency().toLowerCase() : "";
        String description = data.getDescription() != null ? data.getDescription().toLowerCase() : "";

        for (String keyword : keywords) {
            String lowerKeyword = keyword.toLowerCase();
            if (providerAgency.contains(lowerKeyword)) score += SCORE_PROVIDER_AGENCY;
            if (dataName.startsWith(lowerKeyword)) score += SCORE_DATA_NAME_STARTS_WITH;
            if (isKeywordExactMatch(dataKeywords, lowerKeyword)) score += SCORE_KEYWORD_EXACT_MATCH;
            else if (dataKeywords.contains(lowerKeyword)) score += SCORE_KEYWORD_CONTAINS;
            if (dataName.contains(lowerKeyword)) score += SCORE_DATA_NAME_CONTAINS;
            if (dataTitle.contains(lowerKeyword)) score += SCORE_TITLE_CONTAINS;
            if (description.contains(lowerKeyword)) score += SCORE_DESCRIPTION_CONTAINS;
            if (keywords.size() >= 2 && description.contains(String.join(" ", keywords).toLowerCase()))
                score += SCORE_DESCRIPTION_ALL_KEYWORDS;
        }
        return score;
    }

    private int calculateScoresByPrimaryKeyword(PublicData data, List<String> keywords) {
        if (keywords.isEmpty()) {
            return 0;
        }
        int score = 0;
        String primaryKeyword = keywords.get(0).toLowerCase();
        String dataName = data.getFileDataName() != null ? data.getFileDataName().toLowerCase() : "";
        String providerAgency = data.getProviderAgency() != null ? data.getProviderAgency().toLowerCase() : "";
        String description = data.getDescription() != null ? data.getDescription().toLowerCase() : "";

        if (isRegionKeyword(primaryKeyword)) {
            if (providerAgency.contains(primaryKeyword)) score += PRIMARY_KEYWORD_REGION_PROVIDER;
            if (dataName.startsWith(primaryKeyword)) score += PRIMARY_KEYWORD_REGION_NAME_STARTS;
            if (dataName.contains(primaryKeyword)) score += PRIMARY_KEYWORD_REGION_NAME_CONTAINS;
            if (description.contains(primaryKeyword)) score += PRIMARY_KEYWORD_REGION_DESC;
        } else {
            if (providerAgency.contains(primaryKeyword)) score += PRIMARY_KEYWORD_NORMAL_PROVIDER;
            if (dataName.contains(primaryKeyword)) score += PRIMARY_KEYWORD_NORMAL_NAME;
            if (description.contains(primaryKeyword)) score += PRIMARY_KEYWORD_NORMAL_DESC;
        }
        return score;
    }

    private int calculateBonusScores(PublicData data, List<String> keywords) {
        int score = 0;
        if (data.getModifiedDate() != null && data.getModifiedDate().isAfter(java.time.LocalDateTime.now().minusYears(1))) {
            score += SCORE_RECENTLY_MODIFIED;
        }

        if (data.getClassificationSystem() != null) {
            String classification = data.getClassificationSystem().toLowerCase();
            for (String keyword : keywords) {
                if (classification.contains(keyword.toLowerCase())) {
                    score += SCORE_CLASSIFICATION_CONTAINS;
                }
            }
        }
        return score;
    }

    private int calculateDescriptionScore(String description, List<String> keywords) {
        if (description == null || description.isEmpty()) return 0;
        int score = 0;
        String lowerDescription = description.toLowerCase();
        for (String keyword : keywords) {
            if (lowerDescription.contains(keyword.toLowerCase())) score += DESC_SCORE_KEYWORD_PRESENCE;
        }
        String[] specialTerms = {"도시개발", "토지구획", "재개발", "재정비", "환지", "감보율", "시행인가", "대기오염", "수질오염", "폐기물", "배출시설", "환경영향", "오염물질", "교통사고", "교통위반", "교통체계", "대중교통", "교통량", "신호체계", "교육과정", "학습", "연구", "교육시설", "교육프로그램", "문화재", "관광지", "문화시설", "예술", "공연", "축제"};
        for (String term : specialTerms) {
            if (lowerDescription.contains(term)) score += DESC_SCORE_SPECIAL_TERM;
        }
        long keywordCount = keywords.stream().mapToLong(keyword -> (lowerDescription.length() - lowerDescription.replace(keyword.toLowerCase(), "").length()) / Math.max(keyword.length(), 1)).sum();
        if (keywordCount > 2) score += DESC_SCORE_HIGH_KEYWORD_DENSITY;
        return score;
    }

    private boolean isRegionKeyword(String keyword) {
        return REGION_KEYWORDS.contains(keyword);
    }

    private boolean isKeywordExactMatch(String dataKeywords, String searchKeyword) {
        if (dataKeywords == null || dataKeywords.isEmpty()) return false;
        String[] keywords = dataKeywords.split(",");
        for (String keyword : keywords) {
            String trimmedKeyword = keyword.trim().toLowerCase();
            if (trimmedKeyword.equals(searchKeyword) || trimmedKeyword.contains(searchKeyword)) return true;
        }
        return false;
    }
}
