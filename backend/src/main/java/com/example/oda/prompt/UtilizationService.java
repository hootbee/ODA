package com.example.oda.prompt;

import com.example.oda.prompt.dto.SingleUtilizationRequestDto;
import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface UtilizationService {
    Mono<JsonNode> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto);
    Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto);
}
