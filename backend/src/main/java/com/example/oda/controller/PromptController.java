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
import java.util.Map;

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

    /**
     * ✅ 새로 추가: CSV 실제 데이터 조회 (MCP 연동)
     * 팀원이 구현할 부분: MCP를 통한 공공데이터 포털 연동
     */
    public Mono<JsonNode> getRealCSVData(String fileName) {
        Map<String, String> requestBody = Map.of("fileName", fileName);

        return null;
    }

    /**
     * ✅ 새로 추가: CSV 데이터 분석
     * 팀원이 구현할 부분: 실제 CSV 데이터 기반 AI 분석
     */
    @PostMapping("/api/data-analysis/csv")
    public Mono<ResponseEntity<JsonNode>> analyzeCSVData(@RequestBody Map<String, Object> request) {
        String fileName = (String) request.get("fileName");
        JsonNode csvData = (JsonNode) request.get("csvData");
        String analysisType = (String) request.get("analysisType");

        // TODO: 팀원이 구현 - 요청 파라미터 검증

        return null;
    }
}
