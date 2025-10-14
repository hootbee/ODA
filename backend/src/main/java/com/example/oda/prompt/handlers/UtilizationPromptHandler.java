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

import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
@RequiredArgsConstructor
@Order(4)
public class UtilizationPromptHandler implements PromptHandler {

    private final UtilizationService utilizationService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        String trimmedPrompt = prompt.trim();
        // /종합활용, /활용, /자유 명령어를 이 핸들러가 처리하도록 지정
        return trimmedPrompt.startsWith("/종합활용") || trimmedPrompt.startsWith("/종합 활용") || trimmedPrompt.startsWith("/활용") || trimmedPrompt.startsWith("/자유");
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        // 데이터가 선택되었는지 먼저 확인
        if (lastDataName == null || lastDataName.isBlank()) {
            ObjectNode errorNode = objectMapper.createObjectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "데이터가 선택되지 않았습니다. 먼저 데이터를 검색하거나 선택해주세요.");
            return Mono.just(errorNode);
        }

        String trimmedPrompt = prompt.trim();

        // "/종합활용" 또는 "/종합 활용" (대소문자 무시, 공백 허용)
        if (trimmedPrompt.matches("(?i)^/\s*종합\s*활용.*$")) {
            return buildFullUtilMono(lastDataName);
        } else {
            // "/활용" 또는 "/자유" 명령어의 경우, 뒤에 오는 추가 프롬프트를 전달
            String customPrompt = trimmedPrompt.replaceFirst("^/활용\s*|^/자유\s*", "").trim();
            return buildCustomUtilMono(lastDataName, customPrompt);
        }
    }

    private Mono<JsonNode> buildFullUtilMono(String fileName) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setTitle(fileName);
        dto.setDataInfo(dataInfo);
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

    private Mono<JsonNode> buildSingleUtilMono(String fileName, String analysisType) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setTitle(fileName);
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
        dataInfo.setTitle(fileName);
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