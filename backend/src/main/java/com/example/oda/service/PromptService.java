package com.example.oda.service;

import com.example.oda.dto.ChatHistoryDto;
import com.example.oda.dto.ChatResponseDto;
import com.example.oda.dto.PromptRequestDto;
import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.security.core.Authentication;
import reactor.core.publisher.Mono;

import java.util.List;

public interface PromptService { // PromptService 인터페이스의 메소드를 구현
    Mono<ChatResponseDto> processPrompt(PromptRequestDto requestDto, Authentication authentication);
    Mono<String> getDataDetails(String prompt);

//    Mono<String> getUtilizationRecommendations(String fileDataName);

    Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto);
    Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto);

    Mono<List<ChatHistoryDto>> getChatHistory(Authentication authentication);

    Mono<List<ChatMessage>> getPromptHistory(Authentication authentication);

    void deleteChatSession(Long sessionId, Authentication authentication);
}
