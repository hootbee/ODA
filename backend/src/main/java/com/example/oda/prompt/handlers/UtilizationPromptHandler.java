package com.example.oda.prompt.handlers;

import com.example.oda.prompt.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.ChatSession;
import com.example.oda.prompt.UtilizationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
@Order(4)
public class UtilizationPromptHandler implements PromptHandler {

    private final UtilizationService utilizationService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        return lastDataName != null && !lastDataName.isBlank();
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        // ✅ "/종합활용" 또는 "/종합 활용" (대소문자 무시, 공백 허용)
        if (prompt.trim().matches("(?i)^/\\s*종합\\s*활용.*$")) {
            return buildFullUtilMono(lastDataName);
        } else if (containsTraditionalUtilKeyword(prompt)) {
            return buildSingleUtilMono(lastDataName, prompt);
        } else {
            return buildCustomUtilMono(lastDataName, prompt);
        }
    }

    private boolean containsTraditionalUtilKeyword(String p) {
        String s = p.toLowerCase();
        return s.matches(".*(비즈니스 활용|연구 활용|정책 활용|데이터 결합|분석 도구).*" ) ||
                s.matches(".*(business 활용|research 활용|policy 활용|combination 활용|tool 활용).*");
    }

    private Mono<JsonNode> buildFullUtilMono(String fileName) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

    private Mono<JsonNode> buildSingleUtilMono(String fileName, String analysisType) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(analysisType);
        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(recommendations -> {
                    com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
                    root.put("type", "simple_recommendation");
                    root.set("recommendations", objectMapper.valueToTree(recommendations));
                    return root;
                });
    }

    private Mono<JsonNode> buildCustomUtilMono(String fileName, String userPrompt) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(userPrompt);

        // utilizationService.getSingleUtilizationRecommendation(dto)는 이제 Mono<JsonNode>를 반환합니다.
        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(recommendationsNode -> { // 변수명 변경으로 명확화 (recommendations -> recommendationsNode)
                    com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
                    root.put("type", "simple_recommendation");
                    // 이미 JsonNode이므로 valueToTree 변환 없이 바로 설정합니다.
                    root.set("recommendations", recommendationsNode);
                    return root;
                });
    }
}
