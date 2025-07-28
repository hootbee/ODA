// backend/src/main/java/com/example/oda/service/AiModelService.java
package com.example.oda.service;

import com.example.oda.entity.PublicData;
import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface AiModelService {
    Mono<JsonNode> getQueryPlan(String prompt);
        Mono<JsonNode> getUtilizationRecommendations(PublicData data);

}