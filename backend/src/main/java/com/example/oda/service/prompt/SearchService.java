package com.example.oda.service.prompt;

import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private static final Logger log = LoggerFactory.getLogger(SearchService.class);
    private final PublicDataRepository publicDataRepository;

    private static final String[] REGION_KEYWORDS = {
            "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
            "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    };

    public SearchService(PublicDataRepository publicDataRepository) {
        this.publicDataRepository = publicDataRepository;
    }

    public List<PublicData> searchAndFilterData(List<String> keywords, String majorCategory) {
        List<PublicData> allResults = new ArrayList<>();
        for (String keyword : keywords) {
            Set<PublicData> keywordResults = new HashSet<>();
            if (isRegionKeyword(keyword)) {
                log.info("지역 키워드 '{}' 감지 - 우선 검색 적용", keyword);
                keywordResults.addAll(publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword));
                keywordResults.addAll(publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword));
                if (keywordResults.size() < 10) {
                    keywordResults.addAll(publicDataRepository.findByKeywordsContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByTitleContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByDescriptionContainingIgnoreCase(keyword));
                }
            } else {
                try {
                    keywordResults.addAll(publicDataRepository.findByKeywordsContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByTitleContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword));
                    keywordResults.addAll(publicDataRepository.findByDescriptionContainingIgnoreCase(keyword));
                } catch (Exception e) {
                    log.error("키워드 '{}' 검색 중 오류 발생: {}", keyword, e.getMessage());
                    continue;
                }
            }

            if (majorCategory != null && !"일반공공행정".equals(majorCategory)) {
                keywordResults = keywordResults.stream()
                        .filter(publicData -> publicData != null &&
                                publicData.getClassificationSystem() != null &&
                                publicData.getClassificationSystem().toUpperCase().contains(majorCategory.toUpperCase()))
                        .collect(Collectors.toSet());
            }
            allResults.addAll(keywordResults);
            log.info("키워드 '{}' 검색 결과: {}개", keyword, keywordResults.size());
        }
        return allResults;
    }

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

    public List<PublicData> sortResultsByRelevance(List<PublicData> uniqueResults, List<String> keywords, String prompt) {
        return uniqueResults.stream()
                .sorted((a, b) -> calculateRelevanceScore(b, keywords, prompt) - calculateRelevanceScore(a, keywords, prompt))
                .collect(Collectors.toList());
    }

    public String extractRegionFromKeywords(List<String> keywords) {
        return keywords.stream()
                .filter(this::isRegionKeyword)
                .findFirst()
                .orElse(null);
    }

    private int calculateRelevanceScore(PublicData data, List<String> keywords, String originalPrompt) {
        int score = 0;
        String dataName = data.getFileDataName() != null ? data.getFileDataName().toLowerCase() : "";
        String dataKeywords = data.getKeywords() != null ? data.getKeywords().toLowerCase() : "";
        String dataTitle = data.getTitle() != null ? data.getTitle().toLowerCase() : "";
        String providerAgency = data.getProviderAgency() != null ? data.getProviderAgency().toLowerCase() : "";
        String description = data.getDescription() != null ? data.getDescription().toLowerCase() : "";

        for (String keyword : keywords) {
            String lowerKeyword = keyword.toLowerCase();
            if (providerAgency.contains(lowerKeyword)) score += 200;
            if (dataName.startsWith(lowerKeyword)) score += 150;
            if (isKeywordExactMatch(dataKeywords, lowerKeyword)) score += 100;
            else if (dataKeywords.contains(lowerKeyword)) score += 60;
            if (dataName.contains(lowerKeyword)) score += 40;
            if (dataTitle.contains(lowerKeyword)) score += 25;
            if (description.contains(lowerKeyword)) score += 30;
            if (keywords.size() >= 2 && description.contains(String.join(" ", keywords).toLowerCase())) score += 50;
        }

        if (!keywords.isEmpty()) {
            String primaryKeyword = keywords.get(0).toLowerCase();
            if (isRegionKeyword(primaryKeyword)) {
                if (providerAgency.contains(primaryKeyword)) score += 100;
                if (dataName.startsWith(primaryKeyword)) score += 80;
                if (dataName.contains(primaryKeyword)) score += 50;
                if (description.contains(primaryKeyword)) score += 40;
            } else {
                if (providerAgency.contains(primaryKeyword)) score += 30;
                if (dataName.contains(primaryKeyword)) score += 20;
                if (description.contains(primaryKeyword)) score += 25;
            }
        }

        score += calculateDescriptionScore(description, keywords);

        if (data.getModifiedDate() != null && data.getModifiedDate().isAfter(java.time.LocalDateTime.now().minusYears(1))) {
            score += 20;
        }

        if (data.getClassificationSystem() != null) {
            String classification = data.getClassificationSystem().toLowerCase();
            for (String keyword : keywords) {
                if (classification.contains(keyword.toLowerCase())) score += 20;
            }
        }
        return Math.max(0, score);
    }

    private int calculateDescriptionScore(String description, List<String> keywords) {
        if (description == null || description.isEmpty()) return 0;
        int score = 0;
        String lowerDescription = description.toLowerCase();
        for (String keyword : keywords) {
            if (lowerDescription.contains(keyword.toLowerCase())) score += 10;
        }
        String[] specialTerms = {"도시개발", "토지구획", "재개발", "재정비", "환지", "감보율", "시행인가", "대기오염", "수질오염", "폐기물", "배출시설", "환경영향", "오염물질", "교통사고", "교통위반", "교통체계", "대중교통", "교통량", "신호체계", "교육과정", "학습", "연구", "교육시설", "교육프로그램", "문화재", "관광지", "문화시설", "예술", "공연", "축제"};
        for (String term : specialTerms) {
            if (lowerDescription.contains(term)) score += 25;
        }
        long keywordCount = keywords.stream().mapToLong(keyword -> (lowerDescription.length() - lowerDescription.replace(keyword.toLowerCase(), "").length()) / Math.max(keyword.length(), 1)).sum();
        if (keywordCount > 2) score += 20;
        return score;
    }

    private boolean isRegionKeyword(String keyword) {
        return Arrays.asList(REGION_KEYWORDS).contains(keyword);
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