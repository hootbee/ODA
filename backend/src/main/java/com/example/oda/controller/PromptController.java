package com.example.oda.controller;

import com.example.oda.dto.ChatResponseDto;
import com.example.oda.dto.PromptRequestDto;
import com.example.oda.dto.QueryPlanDto;
import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.ChatMessage;
import com.example.oda.service.PromptService;
import com.example.oda.service.QueryPlannerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

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

    @PostMapping("/api/data-details")
    public Mono<ResponseEntity<String>> getDataDetails(@RequestBody PromptRequestDto requestDto) {
        return promptService.getDataDetails(requestDto.getPrompt())
                .map(details -> ResponseEntity.ok(details))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/data-utilization/single")
    public Mono<ResponseEntity<List<String>>> getSingleUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {
        return promptService.getSingleUtilizationRecommendation(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/data-utilization/full")
    public Mono<ResponseEntity<JsonNode>> getFullUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {
        return promptService.getFullUtilizationRecommendations(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/prompt/history")
    public Mono<ResponseEntity<List<ChatMessage>>> getPromptHistory(Authentication authentication) {
        return promptService.getPromptHistory(authentication)
                .map(history -> ResponseEntity.ok(history))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
