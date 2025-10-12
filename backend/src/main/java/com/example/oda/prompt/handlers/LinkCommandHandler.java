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
        Optional<PublicData> dataOptional = publicDataRepository.findByTitle(lastDataName);
        ObjectNode response = objectMapper.createObjectNode();

        if (dataOptional.isEmpty()) {
            response.put("type", "error");
            response.put("message", "해당 데이터를 찾을 수 없습니다: " + lastDataName);
            return Mono.just(response);
        }

        PublicData data = dataOptional.get();
        String rawPk = data.getPublicDataPk(); // 예: "OA-21094" 또는 "oa-21094" 또는 "21094"

        String seoulPk = normalizeSeoulPk(rawPk); // "OA-21094" 형태로 정규화
        if (seoulPk == null) {
            response.put("type", "error");
            response.put("message", "유효하지 않은 PK 형식입니다: " + rawPk);
            return Mono.just(response);
        }

        // S/1은 서울열린데이터광장 상세 페이지 기본 패턴
        String url = "https://data.seoul.go.kr/dataList/" + seoulPk + "/S/1/datasetView.do";

        response.put("type", "link");
        response.put("url", url);
        return Mono.just(response);
    }
    private String normalizeSeoulPk(String pk) {
        if (pk == null || pk.isBlank()) return null;

        String trimmed = pk.trim();

        // 숫자만 들어온 경우 → OA- 접두어 붙이기
        if (trimmed.matches("^\\d+$")) {
            return "OA-" + trimmed;
        }

        // oa-/OA- 혼용 → 대문자로
        if (trimmed.matches("^[oO][aA]-\\d+$")) {
            return trimmed.toUpperCase(); // "OA-12345"
        }

        // 이미 정상 형태
        if (trimmed.matches("^OA-\\d+$")) {
            return trimmed;
        }

        // 그 외는 지원하지 않는 형식
        return null;
    }

    private Mono<JsonNode> handleDataPortal() {
        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "link");
        response.put("url", "https://data.seoul.go.kr/");
        return Mono.just(response);
    }
}
