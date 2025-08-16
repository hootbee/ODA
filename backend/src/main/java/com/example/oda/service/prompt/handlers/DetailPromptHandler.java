package com.example.oda.service.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.service.prompt.DetailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(3)
public class DetailPromptHandler implements PromptHandler {

    private final DetailService detailService;
    private final ChatSessionRepository chatSessionRepository;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        return prompt.contains("상세") || prompt.contains("자세히");
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        String extractedFileName = prompt.replaceAll("상세정보|자세히|상세", "").trim();
        String effectiveFileName;

        if (extractedFileName.isEmpty() || extractedFileName.equals("---")) {
            effectiveFileName = lastDataName;
            if (effectiveFileName == null || effectiveFileName.isBlank()) {
                log.warn("상세 정보 요청에 파일명이 없으며, 세션에 lastDataName도 설정되어 있지 않습니다.");
                return Mono.just(objectMapper.valueToTree(List.of("어떤 데이터의 상세 정보를 원하시는지 파일명을 함께 알려주세요.")));
            }
            log.info("세션의 lastDataName '{}'을(를) 사용하여 상세 정보 조회", effectiveFileName);
        } else {
            effectiveFileName = extractedFileName;
            log.info("프롬프트에서 추출된 파일명 '{}'을(를) 사용하여 상세 정보 조회", effectiveFileName);
        }

        session.setLastDataName(effectiveFileName);
        chatSessionRepository.save(session);

        return detailService.getDataDetails(effectiveFileName)
                .map(detailText -> {
                    com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
                    root.put("type", "data_detail");
                    root.put("detail", detailText);
                    root.put("fileName", effectiveFileName);
                    return root;
                });
    }
}