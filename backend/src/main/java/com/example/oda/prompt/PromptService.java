package com.example.oda.prompt;

import com.example.oda.entity.ChatSession;
import com.example.oda.prompt.dto.ChatHistoryDto;
import com.example.oda.prompt.dto.ChatResponseDto;
import com.example.oda.prompt.dto.PromptRequestDto;
import com.example.oda.entity.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.security.core.Authentication;
import reactor.core.publisher.Mono;

import java.util.List;

import com.example.oda.prompt.dto.QueryPlanDto;

public interface PromptService { // PromptService 인터페이스의 메소드를 구현
    Mono<ChatResponseDto> processPrompt(PromptRequestDto requestDto, Authentication authentication);

    Mono<ObjectNode> executePlan(QueryPlanDto queryPlan);

    Mono<List<ChatHistoryDto>> getChatHistory(Authentication authentication);

    Mono<List<ChatMessage>> getPromptHistory(Authentication authentication);

    void deleteChatSession(Long sessionId, Authentication authentication);
}
