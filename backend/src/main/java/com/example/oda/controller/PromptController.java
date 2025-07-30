// backend/src/main/java/com/example/oda/controller/PromptController.java
package com.example.oda.controller;

import com.example.oda.dto.PromptRequestDto;
import com.example.oda.dto.QueryPlanDto;
import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.service.PromptService; // 인터페이스 import
import com.example.oda.service.QueryPlannerService; // QueryPlannerService import
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import java.util.List;

@RestController
public class PromptController {

    private final PromptService promptService; // 인터페이스 타입으로 주입
    private final QueryPlannerService queryPlannerService; // QueryPlannerService 주입

    @Autowired
    public PromptController(PromptService promptService, QueryPlannerService queryPlannerService) {
        this.promptService = promptService;
        this.queryPlannerService = queryPlannerService;
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/query-plan")
    public ResponseEntity<QueryPlanDto> getQueryPlan(@RequestBody PromptRequestDto requestDto) {
        QueryPlanDto queryPlan = queryPlannerService.createQueryPlan(requestDto.getPrompt());
        return ResponseEntity.ok(queryPlan);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/prompt")
    public Mono<ResponseEntity<List<String>>> handlePrompt(@RequestBody PromptRequestDto promptRequestDto) {
        return promptService.processPrompt(promptRequestDto.getPrompt())
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build()); // Mono가 비어있을 경우 (발생할 가능성 낮음)
    }
    // ⭐ 새로 추가: 상세 정보 전용 엔드포인트
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/data-details")
    public Mono<ResponseEntity<String>> getDataDetails(@RequestBody PromptRequestDto requestDto) {
        return promptService.getDataDetails(requestDto.getPrompt())
                .map(details -> ResponseEntity.ok(details))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

//    // ⭐ 새로 추가: 데이터 활용 방안 전용 엔드포인트
//    @CrossOrigin(origins = "http://localhost:3000")
//    @PostMapping("/api/data-utilization")
//    public Mono<ResponseEntity<String>> getUtilization(@RequestBody PromptRequestDto requestDto) {
//        return promptService.getUtilizationRecommendations(requestDto.getPrompt())
//                .map(recommendations -> ResponseEntity.ok(recommendations))
//                .defaultIfEmpty(ResponseEntity.notFound().build());
//    }
    // ⭐ 새로 추가: 단일 데이터 활용 방안 전용 엔드포인트
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/data-utilization/single")
    public Mono<ResponseEntity<List<String>>> getSingleUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {
        return promptService.getSingleUtilizationRecommendation(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/data-utilization/full")
    public Mono<ResponseEntity<JsonNode>> getFullUtilization(
            @RequestBody SingleUtilizationRequestDto requestDto) {

        return promptService.getFullUtilizationRecommendations(requestDto)
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
}
