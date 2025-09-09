package com.example.oda.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.prompt.DetailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

        final String finalEffectiveFileName = effectiveFileName; 
        return detailService.getDataDetails(effectiveFileName)
                .map(publicData -> {
                    ObjectNode root = objectMapper.createObjectNode();
                    root.put("type", "data_detail");

                    ObjectNode payload = objectMapper.createObjectNode();
                    payload.put("fileDataName", publicData.getFileDataName());
                    payload.put("title", publicData.getTitle());
                    payload.put("classificationSystem", publicData.getClassificationSystem());
                    payload.put("providerAgency", publicData.getProviderAgency());
                    payload.put("modifiedDate", publicData.getModifiedDate() != null ? publicData.getModifiedDate().toString() : "정보 없음");
                    payload.put("fileExtension", publicData.getFileExtension());
                    payload.put("description", publicData.getDescription());

                    ArrayNode keywordsNode = objectMapper.createArrayNode();
                    if (publicData.getKeywords() != null && !publicData.getKeywords().trim().isEmpty()) {
                        String[] keywords = publicData.getKeywords().split(",");
                        for (String keyword : keywords) {
                            keywordsNode.add(keyword.trim());
                        }
                    }
                    payload.set("keywords", keywordsNode);

                    root.set("payload", payload);
                    return (JsonNode) root;
                })
                .switchIfEmpty(Mono.fromCallable(() -> {
                    ObjectNode errorNode = objectMapper.createObjectNode();
                    errorNode.put("type", "error");
                    errorNode.put("message", "❌ 해당 파일명을 찾을 수 없습니다: " + finalEffectiveFileName);
                    return errorNode;
                }));
    }
}
