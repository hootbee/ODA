package com.example.oda.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.example.oda.service.GeminiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Optional;

@Component
@RequiredArgsConstructor
@Order(5)
public class DataVisualizationPromptHandler implements PromptHandler {

    private final GeminiService geminiService;
    private final PublicDataRepository publicDataRepository;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        return "/데이터 시각화".equals(prompt.trim());
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        if (lastDataName == null || lastDataName.isBlank()) {
            ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "데이터가 선택되지 않았습니다. 먼저 데이터를 검색하거나 선택해주세요.");
            return Mono.just(errorNode);
        }

        Optional<PublicData> publicDataOptional = publicDataRepository.findByTitle(lastDataName);
        if (publicDataOptional.isEmpty()) {
            ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "선택된 데이터의 정보를 찾을 수 없습니다: " + lastDataName);
            return Mono.just(errorNode);
        }

        String publicDataPk = publicDataOptional.get().getPublicDataPk();
        if (publicDataPk == null || publicDataPk.isBlank()) {
            ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "데이터의 PK(publicDataPk) 값이 없습니다: " + lastDataName);
            return Mono.just(errorNode);
        }

        return geminiService.visualizeDataByPk(publicDataPk)
                .onErrorResume(error -> {
                    ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
                    errorNode.put("type", "error");
                    errorNode.put("message", "CSV 파일을 찾을 수 없거나 시각화를 생성할 수 없습니다.");
                    return Mono.just(errorNode);
                });
    }
}
