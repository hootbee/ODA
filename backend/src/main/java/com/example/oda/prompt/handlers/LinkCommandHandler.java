package com.example.oda.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Optional;

@Component
@Order(0)
@RequiredArgsConstructor
public class LinkCommandHandler implements PromptHandler {

    private static final String COMMAND = "/오픈api";
    private final PublicDataRepository publicDataRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        return COMMAND.equalsIgnoreCase(prompt.trim()) && lastDataName != null && !lastDataName.isEmpty();
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        Optional<PublicData> dataOptional = publicDataRepository.findByFileDataName(lastDataName);

        ObjectNode response = objectMapper.createObjectNode();

        if (dataOptional.isPresent()) {
            PublicData data = dataOptional.get();
            Long pk = data.getPublicDataPk();
            String url = "https://www.data.go.kr/data/" + pk + "/fileData.do#tab-layer-openapi";
            response.put("type", "link");
            response.put("url", url);
        } else {
            response.put("type", "error");
            response.put("message", "해당 데이터를 찾을 수 없습니다: " + lastDataName);
        }

        return Mono.just(response);
    }
}
