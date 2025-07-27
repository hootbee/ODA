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

                        // 각 필드별 검색 후 합치기
                        keywordResults.addAll(publicDataRepository.findByKeywordsContainingIgnoreCase(keyword));
                        keywordResults.addAll(publicDataRepository.findByTitleContainingIgnoreCase(keyword));
                        keywordResults.addAll(publicDataRepository.findByProviderAgencyContainingIgnoreCase(keyword));
                        keywordResults.addAll(publicDataRepository.findByFileDataNameContainingIgnoreCase(keyword));
                        keywordResults.addAll(publicDataRepository.findByDescriptionContainingIgnoreCase(keyword));

                        // 대분류 필터링 (람다 파라미터 이름 변경)
                        if (majorCategory != null && !"일반공공행정".equals(majorCategory)) {
                            keywordResults = keywordResults.stream()
                                    .filter(publicData -> publicData.getClassificationSystem() != null &&  // ✅ 수정
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

        // 1. 키워드 매칭 점수 (각 키워드당 10점)
        for (String keyword : keywords) {
            String lowerKeyword = keyword.toLowerCase();
            if (dataName.contains(lowerKeyword)) score += 10;
            if (dataKeywords.contains(lowerKeyword)) score += 10;
            if (dataTitle.contains(lowerKeyword)) score += 10;
        }

        // 2. 프롬프트의 첫 번째 키워드(주로 지역명) 추가 점수
        if (!keywords.isEmpty()) {
            String primaryKeyword = keywords.get(0).toLowerCase();
            if (dataName.contains(primaryKeyword)) score += 20;
        }

        // 3. 최신 데이터 보너스
        if (data.getModifiedDate() != null) {
            // 최근 1년 데이터에 보너스 점수
            if (data.getModifiedDate().isAfter(java.time.LocalDateTime.now().minusYears(1))) {
                score += 5;
            }
        }

        return score;
    }


}