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
    public Mono<String> getCategory(String prompt) {
        Map<String, String> requestBody = Map.of("prompt", prompt);

        return webClient.post()
                .uri("/api/ai/search")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(jsonNode -> {
                    String classificationSystem = jsonNode.has("classificationSystem") ? jsonNode.get("classificationSystem").asText() : null;
                    if (classificationSystem != null && !classificationSystem.isEmpty()) {
                        return Mono.just(classificationSystem);
                    } else {
                        log.warn("AI service returned no classificationSystem for prompt: {}", prompt);
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
                    if (jsonNode.has("recommendations") && jsonNode.get("recommendations").isArray()) {
                        try {
                            // ✅ 명시적 타입 변수 선언으로 제네릭 문제 해결
                            List<String> recommendations = objectMapper.convertValue(
                                    jsonNode.get("recommendations"),
                                    new TypeReference<List<String>>() {}
                            );
                            return Mono.just(recommendations);
                        } catch (IllegalArgumentException e) {
                            log.error("Failed to parse recommendations JSON from AI service: {}", jsonNode, e);
                            return Mono.<List<String>>error(e);
                        }
                    } else {
                        log.warn("AI service returned no recommendations array for prompt: {}", prompt);
                        return Mono.just(List.<String>of());
                    }
                })
                .doOnError(e -> log.error("Error calling AI service for recommendations", e))
                .onErrorReturn(List.<String>of());
    }

}
