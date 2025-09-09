package com.example.oda.controller;

import com.example.oda.prompt.dto.ChatHistoryDto;
import com.example.oda.prompt.dto.ChatResponseDto;
import com.example.oda.prompt.dto.PromptRequestDto;
import com.example.oda.prompt.dto.QueryPlanDto;
import com.example.oda.entity.ChatMessage;
import com.example.oda.prompt.PromptService;
import com.example.oda.prompt.QueryPlannerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class PromptController {

    private final PromptService promptService;
    private final QueryPlannerService queryPlannerService;

    @Autowired
    public PromptController(PromptService promptService, QueryPlannerService queryPlannerService) {
        this.promptService = promptService;
        this.queryPlannerService = queryPlannerService;
    }

    @PostMapping("/api/query-plan")
    public ResponseEntity<QueryPlanDto> getQueryPlan(@RequestBody PromptRequestDto requestDto) {
        QueryPlanDto queryPlan = queryPlannerService.createQueryPlan(requestDto.getPrompt());
        return ResponseEntity.ok(queryPlan);
    }

    @PostMapping("/api/prompt")
    public Mono<ResponseEntity<ChatResponseDto>> handlePrompt(
            @RequestBody PromptRequestDto promptRequestDto,
            Authentication authentication) {
        return promptService.processPrompt(promptRequestDto, authentication)
                .map(response -> ResponseEntity.ok(response))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    

    @GetMapping("/api/chat/history")
    public Mono<ResponseEntity<List<ChatHistoryDto>>> getChatHistory(Authentication authentication) {
        return promptService.getChatHistory(authentication)
                .map(history -> ResponseEntity.ok(history))
                .defaultIfEmpty(ResponseEntity.ok(List.of()));
    }

    @GetMapping("/api/prompt/history")
    public Mono<ResponseEntity<List<ChatMessage>>> getPromptHistory(Authentication authentication) {
        return promptService.getPromptHistory(authentication)
                .map(history -> ResponseEntity.ok(history))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/chat/session/{sessionId}")
    public Mono<ResponseEntity<Void>> deleteChatSession(
            @PathVariable Long sessionId,
            Authentication authentication) {
        return Mono.fromRunnable(() -> promptService.deleteChatSession(sessionId, authentication))
                .subscribeOn(Schedulers.boundedElastic())
                .then(Mono.just(ResponseEntity.noContent().<Void>build()))
                .onErrorResume(e -> {
                    if (e instanceof SecurityException) {
                        return Mono.just(ResponseEntity.status(403).build());
                    } else if (e instanceof IllegalStateException || e instanceof RuntimeException) {
                        return Mono.just(ResponseEntity.status(404).build()); // Or a more appropriate error
                    }
                    return Mono.just(ResponseEntity.status(500).build());
                });
    }
}
