package com.example.oda.prompt;

import com.example.oda.prompt.dto.ChatHistoryDto;
import com.example.oda.prompt.dto.ChatResponseDto;
import com.example.oda.prompt.dto.PromptRequestDto;
import com.example.oda.entity.ChatMessage;
import org.springframework.security.core.Authentication;
import reactor.core.publisher.Mono;

import java.util.List;

public interface PromptService { // PromptService 인터페이스의 메소드를 구현
    Mono<ChatResponseDto> processPrompt(PromptRequestDto requestDto, Authentication authentication);

    Mono<List<ChatHistoryDto>> getChatHistory(Authentication authentication);

    Mono<List<ChatMessage>> getPromptHistory(Authentication authentication);

    void deleteChatSession(Long sessionId, Authentication authentication);
}
