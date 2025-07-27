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

@Service
public class PromptServiceImpl implements PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptServiceImpl.class);

    private final PublicDataRepository publicDataRepository;
    private final AiModelService aiModelService;

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

                    List<PublicData> allResults = new ArrayList<>();

                    for (String keyword : keywords) {
                        Set<PublicData> keywordResults = new HashSet<>();

                        // ⭐ 키워드 검색 우선순위 적용
                        // 1순위: 키워드 필드에서 정확 매칭
                        keywordResults.addAll(publicDataRepository.findByKeywordExactMatch(keyword));

                        // 2순위: 기존 방식 (부족한 결과 보완)
                        if (keywordResults.size() < 5) {
                            keywordResults.addAll(publicDataRepository.findByKeywordsContainingIgnoreCase(keyword));
                            keywordResults.addAll(publicDataRepository.findByTitleContainingIgnoreCase(keyword));
                            keywordResults.addAll(publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword));
                            keywordResults.addAll(publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword));
                            keywordResults.addAll(publicDataRepository.findByDescriptionContainingIgnoreCase(keyword));
                        }

                        // 대분류 필터링
                        if (majorCategory != null && !"일반공공행정".equals(majorCategory)) {
                            keywordResults = keywordResults.stream()
                                    .filter(publicData -> publicData.getClassificationSystem() != null &&
                                            publicData.getClassificationSystem().toUpperCase().contains(majorCategory.toUpperCase()))
                                    .collect(Collectors.toSet());
                        }

                        allResults.addAll(keywordResults);
                        log.info("키워드 '{}' 검색 결과: {}개", keyword, keywordResults.size());
                    }


                    // 중복 제거 및 관련성 점수 정렬
                    List<PublicData> sortedResults = allResults.stream()
                            .distinct()
                            .sorted((a, b) -> calculateRelevanceScore(b, keywords, prompt) -
                                    calculateRelevanceScore(a, keywords, prompt))
                            .collect(Collectors.toList());

                    log.info("전체 검색 결과 수: {}", sortedResults.size());

                    if (sortedResults.isEmpty()) {
                        return Mono.just(List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다."));
                    }

                    List<String> results = sortedResults.stream()
                            .map(PublicData::getFileDataName)
                            .collect(Collectors.toList());

                    return Mono.just(results);
                })
                .onErrorReturn(List.of("데이터를 조회하는 중 오류가 발생했습니다."));
    }


    /**
     * 관련성 점수 계산
     */
    private int calculateRelevanceScore(PublicData data, List<String> keywords, String originalPrompt) {
        int score = 0;
        String dataName = data.getFileDataName().toLowerCase();
        String dataKeywords = data.getKeywords() != null ? data.getKeywords().toLowerCase() : "";
        String dataTitle = data.getTitle().toLowerCase();

        for (String keyword : keywords) {
            String lowerKeyword = keyword.toLowerCase();

            // ⭐ 키워드 필드 매칭에 더 높은 점수
            if (isKeywordExactMatch(dataKeywords, lowerKeyword)) {
                score += 25; // 기존 10점 → 25점으로 증가
            } else if (dataKeywords.contains(lowerKeyword)) {
                score += 15; // 부분 매칭
            }

            if (dataName.contains(lowerKeyword)) score += 10;
            if (dataTitle.contains(lowerKeyword)) score += 10;
        }

        // 나머지 로직은 동일...
        return score;
    }

    // 키워드 정확 매칭 헬퍼 메서드
    private boolean isKeywordExactMatch(String dataKeywords, String searchKeyword) {
        if (dataKeywords == null || dataKeywords.isEmpty()) return false;

        String[] keywords = dataKeywords.split(",");
        for (String keyword : keywords) {
            if (keyword.trim().toLowerCase().contains(searchKeyword)) {
                return true;
            }
        }
        return false;
    }

}