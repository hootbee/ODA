// backend/src/main/java/com/example/oda/service/GeminiService.java
package com.example.oda.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService implements AiModelService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public static final String UNMATCHED_CATEGORY_SIGNAL = "UNMATCHED_CATEGORY";

    public GeminiService(ObjectMapper objectMapper, WebClient.Builder webClientBuilder) {
        this.objectMapper = objectMapper;
        this.webClient = webClientBuilder
                .baseUrl("http://localhost:3001") // ai-service의 주소
                .build();
    }

    @Override
    public Mono<String> getClassificationSystem(String prompt) {
        Map<String, String> requestBody = Map.of("prompt", prompt);

        return webClient.post()
                .uri("/api/ai/search")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(jsonNode -> {
                    // ✅ 중첩된 응답 구조 처리
                    String classificationSystem = null;

                    // success와 data 구조 확인
                    if (jsonNode.has("success") && jsonNode.get("success").asBoolean() && jsonNode.has("data")) {
                        JsonNode dataNode = jsonNode.get("data");
                        if (dataNode.has("classificationSystem")) {
                            classificationSystem = dataNode.get("classificationSystem").asText();
                        }
                    } else if (jsonNode.has("classificationSystem")) {
                        // 직접 구조인 경우 (fallback)
                        classificationSystem = jsonNode.get("classificationSystem").asText();
                    }

                    if (classificationSystem != null && !classificationSystem.isEmpty()) {
                        log.info("AI service returned classificationSystem: {}", classificationSystem);
                        return Mono.just(classificationSystem);
                    } else {
                        log.warn("AI service returned no classificationSystem for prompt: {}, response: {}",
                                prompt, jsonNode.toString());
                        return Mono.just(UNMATCHED_CATEGORY_SIGNAL);
                    }
                })
                .doOnError(e -> log.error("Error calling AI service for category", e))
                .onErrorReturn(UNMATCHED_CATEGORY_SIGNAL);
    }

    @Override
    public Mono<List<String>> getRecommendations(String prompt, String classificationSystem, List<String> candidateNames) {
        Map<String, Object> requestBody = Map.of(
                "prompt", prompt,
                "classificationSystem", classificationSystem,
                "candidateNames", candidateNames
        );

        return webClient.post()
                .uri("/api/ai/recommendations")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(jsonNode -> {
                    // ✅ 중첩된 응답 구조 처리
                    JsonNode recommendationsNode = null;
                    JsonNode filteringStepsNode = null;

                    // success와 data 구조 확인
                    if (jsonNode.has("success") && jsonNode.get("success").asBoolean() && jsonNode.has("data")) {
                        JsonNode dataNode = jsonNode.get("data");
                        if (dataNode.has("recommendations")) {
                            recommendationsNode = dataNode.get("recommendations");
                        }
                        if (dataNode.has("filteringSteps")) {
                            filteringStepsNode = dataNode.get("filteringSteps");
                        }
                    } else if (jsonNode.has("recommendations")) {
                        // 직접 구조인 경우 (fallback)
                        recommendationsNode = jsonNode.get("recommendations");
                        if (jsonNode.has("filteringSteps")) {
                            filteringStepsNode = jsonNode.get("filteringSteps");
                        }
                    }

                    if (recommendationsNode != null && recommendationsNode.isArray()) {
                        try {
                            List<String> recommendations = objectMapper.convertValue(
                                    recommendationsNode,
                                    new TypeReference<List<String>>() {}
                            );

                            // 필터링 단계 로깅 (개선된 버전)
                            if (filteringStepsNode != null) {
                                log.info("AI 필터링 단계: 대분류={}, 날짜필터={}, 최종개수={}",
                                        filteringStepsNode.path("step1_majorCategory").asText("unknown"),
                                        filteringStepsNode.path("step2_dateFiltered").asBoolean(false),
                                        filteringStepsNode.path("step3_finalCount").asInt(0)
                                );
                            }

                            log.info("AI service returned {} recommendations for prompt: {}",
                                    recommendations.size(), prompt);
                            return Mono.just(recommendations);

                        } catch (IllegalArgumentException e) {
                            log.error("Failed to parse recommendations JSON from AI service: {}", jsonNode, e);
                            return Mono.<List<String>>error(e);
                        }
                    } else {
                        log.warn("AI service returned no recommendations array for prompt: {}, response: {}",
                                prompt, jsonNode.toString());
                        return Mono.just(List.<String>of());
                    }
                })
                .doOnError(e -> log.error("Error calling AI service for recommendations", e))
                .onErrorReturn(List.<String>of());
    }



}
