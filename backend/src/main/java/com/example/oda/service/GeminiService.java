// backend/src/main/java/com/example/oda/service/GeminiService.java
package com.example.oda.service;

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

    public GeminiService(ObjectMapper objectMapper, WebClient.Builder webClientBuilder) {
        this.objectMapper = objectMapper;
        this.webClient = webClientBuilder
                .baseUrl("http://localhost:3001") // ai-service의 주소
                .build();
    }

    @Override
    public Mono<JsonNode> getQueryPlan(String prompt) {
        Map<String, String> requestBody = Map.of("prompt", prompt);

        return webClient.post()
                .uri("/api/ai/query-plan")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .doOnError(e -> log.error("Error calling AI service for query plan", e));
    }

    // getClassificationSystem and getRecommendations methods are now obsolete
    // and will be removed in the next step.
}