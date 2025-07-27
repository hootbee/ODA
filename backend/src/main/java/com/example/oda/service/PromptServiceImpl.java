// backend/src/main/java/com/example/oda/service/PromptServiceImpl.java
package com.example.oda.service;

import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.function.Function;
import java.util.Arrays;

@Service
public class PromptServiceImpl implements PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptServiceImpl.class);

    private final PublicDataRepository publicDataRepository;
    private final AiModelService aiModelService;

    // 지역명 목록 (지역 키워드 식별용)
    private static final String[] REGION_KEYWORDS = {
            "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
            "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    };

    public PromptServiceImpl(PublicDataRepository publicDataRepository, AiModelService aiModelService) {
        this.publicDataRepository = publicDataRepository;
        this.aiModelService = aiModelService;
    }

    @Override
    public Mono<List<String>> processPrompt(String prompt) {
        return aiModelService.getQueryPlan(prompt)
                .flatMap(queryPlan -> {
                    JsonNode data = queryPlan.get("data");
                    String majorCategory = data.get("majorCategory").asText();
                    List<String> keywords = new ArrayList<>();
                    data.get("keywords").forEach(node -> keywords.add(node.asText()));

                    log.info("원본 프롬프트: {}", prompt);
                    log.info("추출된 키워드: {}", keywords);
                    log.info("AI 분류 결과: {}", majorCategory);

                    List<PublicData> allResults = new ArrayList<>();

                    for (String keyword : keywords) {
                        Set<PublicData> keywordResults = new HashSet<>();

                        // ⭐ 지역 키워드 우선 처리
                        if (isRegionKeyword(keyword)) {
                            log.info("지역 키워드 '{}' 감지 - 우선 검색 적용", keyword);

                            // 지역 관련 필드 우선 검색
                            keywordResults.addAll(publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword));
                            keywordResults.addAll(publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword));

                            // 지역 데이터가 충분하면 다른 필드 검색 최소화
                            if (keywordResults.size() >= 10) {
                                log.info("지역 키워드 '{}' 충분한 결과 확보: {}개", keyword, keywordResults.size());
                            } else {
                                // 지역 데이터 부족 시 다른 필드도 검색
                                keywordResults.addAll(publicDataRepository.findByKeywordsContainingIgnoreCase(keyword));
                                keywordResults.addAll(publicDataRepository.findByTitleContainingIgnoreCase(keyword));
                                keywordResults.addAll(publicDataRepository.findByDescriptionContainingIgnoreCase(keyword));
                            }
                        } else {
                            // ⭐ 일반 키워드 검색 (기존 방식)
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

                        // 대분류 필터링 (null 체크 강화)
                        if (majorCategory != null && !"일반공공행정".equals(majorCategory)) {
                            keywordResults = keywordResults.stream()
                                    .filter(publicData -> {
                                        try {
                                            return publicData != null &&
                                                    publicData.getClassificationSystem() != null &&
                                                    publicData.getClassificationSystem().toUpperCase().contains(majorCategory.toUpperCase());
                                        } catch (Exception e) {
                                            log.warn("분류 필터링 중 오류: {}", e.getMessage());
                                            return false;
                                        }
                                    })
                                    .collect(Collectors.toSet());
                        }

                        allResults.addAll(keywordResults);
                        log.info("키워드 '{}' 검색 결과: {}개", keyword, keywordResults.size());
                    }

                    // ⭐ 안전한 중복 제거
                    List<PublicData> uniqueResults;
                    try {
                        uniqueResults = allResults.stream()
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
                        uniqueResults = allResults.stream()
                                .filter(publicData -> publicData != null && publicData.getFileDataName() != null)
                                .distinct()
                                .collect(Collectors.toList());
                    }

                    log.info("중복 제거 전: {}개 → 중복 제거 후: {}개", allResults.size(), uniqueResults.size());

                    // 관련성 점수 기반 정렬
                    List<PublicData> sortedResults = uniqueResults.stream()
                            .sorted((a, b) -> {
                                try {
                                    return calculateRelevanceScore(b, keywords, prompt) -
                                            calculateRelevanceScore(a, keywords, prompt);
                                } catch (Exception e) {
                                    log.warn("점수 계산 중 오류: {}", e.getMessage());
                                    return 0;
                                }
                            })
                            .collect(Collectors.toList());

                    log.info("전체 검색 결과 수: {}", sortedResults.size());

                    // ⭐ 데이터 부족 지역 대응
                    if (sortedResults.isEmpty()) {
                        String regionKeyword = extractRegionFromKeywords(keywords);
                        if (regionKeyword != null) {
                            return Mono.just(List.of(
                                    "해당 지역(" + regionKeyword + ")의 데이터가 부족합니다.",
                                    "다른 지역의 유사한 데이터를 참고하거나",
                                    "상위 카테고리(" + majorCategory + ")로 검색해보세요."
                            ));
                        } else {
                            return Mono.just(List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다."));
                        }
                    }

                    // 상위 결과 로깅 (디버깅용)
                    if (log.isInfoEnabled()) {
                        sortedResults.stream()
                                .limit(5)
                                .forEach(item -> {
                                    int score = calculateRelevanceScore(item, keywords, prompt);
                                    log.info("상위 결과: {} (점수: {})", item.getFileDataName(), score);
                                });
                    }

                    List<String> results = sortedResults.stream()
                            .map(PublicData::getFileDataName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .collect(Collectors.toList());

                    return Mono.just(results);
                })
                .onErrorReturn(List.of("데이터를 조회하는 중 오류가 발생했습니다."));
    }

    /**
     * 개선된 관련성 점수 계산 (지역 매칭 강화)
     */
    private int calculateRelevanceScore(PublicData data, List<String> keywords, String originalPrompt) {
        int score = 0;
        String dataName = data.getFileDataName() != null ? data.getFileDataName().toLowerCase() : "";
        String dataKeywords = data.getKeywords() != null ? data.getKeywords().toLowerCase() : "";
        String dataTitle = data.getTitle() != null ? data.getTitle().toLowerCase() : "";
        String providerAgency = data.getProviderAgency() != null ? data.getProviderAgency().toLowerCase() : "";

        for (String keyword : keywords) {
            String lowerKeyword = keyword.toLowerCase();

            // ⭐ 지역명 매칭에 압도적 점수 (대폭 증가)
            if (providerAgency.contains(lowerKeyword)) {
                score += 200; // 기관명 매칭 시 최고 점수
            }

            // 파일명에서 지역명 직접 매칭 (파일명 시작 부분)
            if (dataName.startsWith(lowerKeyword)) {
                score += 150; // 파일명 시작 매칭 시 높은 점수
            }

            // ⭐ 키워드 필드 정확 매칭에 높은 점수
            if (isKeywordExactMatch(dataKeywords, lowerKeyword)) {
                score += 100; // 정확 매칭
            } else if (dataKeywords.contains(lowerKeyword)) {
                score += 60; // 부분 매칭 증가
            }

            // 파일명 일반 매칭
            if (dataName.contains(lowerKeyword)) {
                score += 40; // 증가
            }

            // 제목 매칭
            if (dataTitle.contains(lowerKeyword)) {
                score += 25; // 증가
            }
        }

        // ⭐ 첫 번째 키워드(주로 지역명)에 특별 가중치
        if (!keywords.isEmpty()) {
            String primaryKeyword = keywords.get(0).toLowerCase();

            // 첫 번째 키워드가 지역명인 경우 더 높은 보너스
            if (isRegionKeyword(primaryKeyword)) {
                if (providerAgency.contains(primaryKeyword)) {
                    score += 100; // 지역 키워드 기관 매칭 대폭 보너스
                }
                if (dataName.startsWith(primaryKeyword)) {
                    score += 80; // 지역 키워드 파일명 시작 매칭 보너스
                }
                if (dataName.contains(primaryKeyword)) {
                    score += 50; // 지역 키워드 파일명 포함 보너스
                }
            } else {
                // 일반 키워드인 경우 기존 보너스
                if (providerAgency.contains(primaryKeyword)) {
                    score += 30;
                }
                if (dataName.contains(primaryKeyword)) {
                    score += 20;
                }
            }
        }

        // 최신 데이터 보너스
        if (data.getModifiedDate() != null) {
            try {
                if (data.getModifiedDate().isAfter(java.time.LocalDateTime.now().minusYears(1))) {
                    score += 15; // 최근 1년 데이터 보너스 증가
                }
            } catch (Exception e) {
                // 날짜 처리 오류 시 무시
            }
        }

        // 분류체계 일치 보너스
        if (data.getClassificationSystem() != null) {
            String classification = data.getClassificationSystem().toLowerCase();
            for (String keyword : keywords) {
                if (classification.contains(keyword.toLowerCase())) {
                    score += 20; // 증가
                }
            }
        }

        return Math.max(0, score); // 음수 점수 방지
    }

    /**
     * 지역 키워드 식별
     */
    private boolean isRegionKeyword(String keyword) {
        return Arrays.asList(REGION_KEYWORDS).contains(keyword);
    }

    /**
     * 키워드 목록에서 지역명 추출
     */
    private String extractRegionFromKeywords(List<String> keywords) {
        return keywords.stream()
                .filter(this::isRegionKeyword)
                .findFirst()
                .orElse(null);
    }

    /**
     * 키워드 정확 매칭 헬퍼 메서드 (개선된 버전)
     */
    private boolean isKeywordExactMatch(String dataKeywords, String searchKeyword) {
        if (dataKeywords == null || dataKeywords.isEmpty()) {
            return false;
        }

        // 쉼표로 분리된 키워드들을 개별적으로 확인
        String[] keywords = dataKeywords.split(",");
        for (String keyword : keywords) {
            String trimmedKeyword = keyword.trim().toLowerCase();

            // 정확한 매칭 또는 부분 매칭 확인
            if (trimmedKeyword.equals(searchKeyword) ||
                    trimmedKeyword.contains(searchKeyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 키워드별 검색 결과 통계 로깅 (디버깅용)
     */
    private void logSearchStatistics(List<String> keywords, List<PublicData> results) {
        if (!log.isDebugEnabled()) return;

        log.debug("=== 검색 통계 ===");
        log.debug("총 키워드 수: {}", keywords.size());
        log.debug("총 검색 결과: {}개", results.size());

        // 키워드별 매칭 통계
        for (String keyword : keywords) {
            long matchCount = results.stream()
                    .filter(item -> {
                        String lowerKeyword = keyword.toLowerCase();
                        String dataName = item.getFileDataName() != null ? item.getFileDataName().toLowerCase() : "";
                        String dataKeywords = item.getKeywords() != null ? item.getKeywords().toLowerCase() : "";
                        return dataName.contains(lowerKeyword) || dataKeywords.contains(lowerKeyword);
                    })
                    .count();
            log.debug("키워드 '{}': {}개 매칭", keyword, matchCount);
        }

        // 분류별 분포
        results.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getClassificationSystem() != null ?
                                item.getClassificationSystem().split(" - ")[0] : "기타",
                        Collectors.counting()))
                .forEach((category, count) ->
                        log.debug("분류 '{}': {}개", category, count));
    }

    /**
     * 검색 결과 품질 검증
     */
    private boolean isQualityResult(PublicData data, List<String> keywords) {
        if (data.getFileDataName() == null || data.getFileDataName().trim().isEmpty()) {
            return false;
        }

        // 최소한 하나의 키워드와 매칭되어야 함
        String dataText = (data.getFileDataName() + " " +
                (data.getKeywords() != null ? data.getKeywords() : "") + " " +
                (data.getTitle() != null ? data.getTitle() : "")).toLowerCase();

        return keywords.stream()
                .anyMatch(keyword -> dataText.contains(keyword.toLowerCase()));
    }
}
