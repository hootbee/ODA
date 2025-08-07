package com.example.oda.service.prompt.handlers;

import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.ChatSession;
import com.example.oda.service.prompt.UtilizationService;
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
        if (prompt.toLowerCase().contains("전체 활용")) {
            return buildFullUtilMono(lastDataName);
        } else if (containsTraditionalUtilKeyword(prompt)) {
            return buildSingleUtilMono(lastDataName, prompt);
        } else {
            return buildCustomUtilMono(lastDataName, prompt);
        }
    }

    private boolean containsTraditionalUtilKeyword(String p) {
        String s = p.toLowerCase();
        return s.matches(".*(비즈니스 활용|연구 활용|정책 활용|데이터 결합|분석 도구).*") ||
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
                    List<String> combined = new java.util.ArrayList<>(recommendations);
                    combined.add("\n\n💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.");
                    return objectMapper.valueToTree(combined);
                });
    }

    private Mono<JsonNode> buildCustomUtilMono(String fileName, String userPrompt) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(userPrompt);

        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(recommendations -> {
                    List<String> combined = new java.util.ArrayList<>(recommendations);
                    combined.add("\n\n💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.");
                    return objectMapper.valueToTree(combined);
                });
    }
}