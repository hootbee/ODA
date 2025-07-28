// backend/src/main/java/com/example/oda/controller/PromptController.java
package com.example.oda.controller;

import com.example.oda.dto.PromptRequestDto;
import com.example.oda.service.PromptService; // 인터페이스 import
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import java.util.List;

@RestController
public class PromptController {

    private final PromptService promptService; // 인터페이스 타입으로 주입

    @Autowired
    public PromptController(PromptService promptService) {
        this.promptService = promptService;
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
    private String formatUtilizationRecommendations(JsonNode response) {
        StringBuilder utilization = new StringBuilder();
        
        utilization.append("💡 데이터 활용 추천\n");
        utilization.append("═".repeat(50)).append("\n\n");
        
        JsonNode data = response.get("data");
        if (data != null) {
            // 비즈니스 활용
            utilization.append("🏢 비즈니스 활용 방안:\n");
            JsonNode businessApps = data.get("businessApplications");
            if (businessApps != null && businessApps.isArray()) {
                businessApps.forEach(app -> 
                    utilization.append("  • ").append(app.asText()).append("\n"));
            }
            utilization.append("\n");
            
            // 연구 활용
            utilization.append("🔬 연구 활용 방안:\n");
            JsonNode researchApps = data.get("researchApplications");
            if (researchApps != null && researchApps.isArray()) {
                researchApps.forEach(app -> 
                    utilization.append("  • ").append(app.asText()).append("\n"));
            }
            utilization.append("\n");
            
            // 정책 활용
            utilization.append("🏛️ 정책 활용 방안:\n");
            JsonNode policyApps = data.get("policyApplications");
            if (policyApps != null && policyApps.isArray()) {
                policyApps.forEach(app -> 
                    utilization.append("  • ").append(app.asText()).append("\n"));
            }
            utilization.append("\n");
            
            // 데이터 결합 제안
            utilization.append("🔗 데이터 결합 제안:\n");
            JsonNode combinations = data.get("combinationSuggestions");
            if (combinations != null && combinations.isArray()) {
                combinations.forEach(suggestion -> 
                    utilization.append("  • ").append(suggestion.asText()).append("\n"));
            }
            utilization.append("\n");
            
            // 분석 도구
            utilization.append("🛠️ 추천 분석 도구:\n");
            JsonNode tools = data.get("analysisTools");
            if (tools != null && tools.isArray()) {
                tools.forEach(tool -> 
                    utilization.append("  • ").append(tool.asText()).append("\n"));
            }
        }
        
        return utilization.toString();
    }
}
