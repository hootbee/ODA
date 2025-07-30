package com.example.oda.controller;

import com.example.oda.dto.PromptRequestDto;
import com.example.oda.dto.QueryPlanDto;
import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.service.PromptService;
import com.example.oda.service.QueryPlannerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) // React 앱과 Node.js 프록시 모두 허용
public class PromptController {

    private final PromptService promptService;
    private final QueryPlannerService queryPlannerService;

    @Autowired
    public PromptController(PromptService promptService, QueryPlannerService queryPlannerService) {
        this.promptService = promptService;
        this.queryPlannerService = queryPlannerService;
    }

    // 쿼리 플랜 생성
    @PostMapping("/api/query-plan")
    public ResponseEntity<QueryPlanDto> getQueryPlan(@RequestBody PromptRequestDto requestDto) {
        QueryPlanDto queryPlan = queryPlannerService.createQueryPlan(requestDto.getPrompt());
        return ResponseEntity.ok(queryPlan);
    }

    // 일반 프롬프트 처리
    @PostMapping("/api/prompt")
    public Mono<ResponseEntity<List<String>>> handlePrompt(@RequestBody PromptRequestDto promptRequestDto) {
        return promptService.processPrompt(promptRequestDto.getPrompt())
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 데이터 상세 정보
    @PostMapping("/api/data-details")
    public Mono<ResponseEntity<String>> getDataDetails(@RequestBody PromptRequestDto requestDto) {
        return promptService.getDataDetails(requestDto.getPrompt())
                .map(details -> ResponseEntity.ok(details))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 단일 활용방안
    @PostMapping("/api/data-utilization/single")
    public Mono<ResponseEntity<List<String>>> getSingleUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {
        return promptService.getSingleUtilizationRecommendation(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 전체 활용방안
    @PostMapping("/api/data-utilization/full")
    public Mono<ResponseEntity<JsonNode>> getFullUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {
        return promptService.getFullUtilizationRecommendations(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
