// backend/src/main/java/com/example/oda/service/AiModelService.java
package com.example.oda.service;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface AiModelService {
    Mono<JsonNode> getQueryPlan(String prompt);
}