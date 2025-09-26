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

    private static final String OPEN_API_COMMAND = "/오픈api";
    private static final String DATA_PORTAL_COMMAND = "/포털사이트";
    private final PublicDataRepository publicDataRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        String trimmedPrompt = prompt.trim();
        if (OPEN_API_COMMAND.equalsIgnoreCase(trimmedPrompt)) {
            return lastDataName != null && !lastDataName.isEmpty();
        }
        return DATA_PORTAL_COMMAND.equalsIgnoreCase(trimmedPrompt);
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        String trimmedPrompt = prompt.trim();
        if (OPEN_API_COMMAND.equalsIgnoreCase(trimmedPrompt)) {
            return handleOpenApi(lastDataName);
        } else if (DATA_PORTAL_COMMAND.equalsIgnoreCase(trimmedPrompt)) {
            return handleDataPortal();
        }

        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "error");
        response.put("message", "알 수 없는 링크 명령어입니다.");
        return Mono.just(response);
    }

    private Mono<JsonNode> handleOpenApi(String lastDataName) {
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

    private Mono<JsonNode> handleDataPortal() {
        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "link");
        response.put("url", "https://www.data.go.kr/index.do");
        return Mono.just(response);
    }
}
