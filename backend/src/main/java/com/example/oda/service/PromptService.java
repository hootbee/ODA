package com.example.oda.service;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

import java.util.List;
import com.example.oda.dto.SingleUtilizationRequestDto;

public interface PromptService { // PromptService 인터페이스의 메소드를 구현
    Mono<List<String>> processPrompt(String prompt);
    Mono<String> getDataDetails(String prompt);

//    Mono<String> getUtilizationRecommendations(String fileDataName);

    Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto);
    Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto);
}
