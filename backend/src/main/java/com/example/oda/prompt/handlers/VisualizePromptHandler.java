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
@RequiredArgsConstructor
@Order(4) // Help(1) -> NewSearch(2) -> GeneralSearch(3) 다음 우선순위 (프로젝트 상황에 맞게 조정 가능)
public class VisualizePromptHandler implements PromptHandler {

    private final ObjectMapper objectMapper;
    private final PublicDataRepository publicDataRepository;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        if (lastDataName == null || lastDataName.isBlank()) return false;
        String p = prompt == null ? "" : prompt.trim();
        return p.equalsIgnoreCase("/시각화")
                || p.contains("시각화")
                || p.contains("차트")
                || p.contains("그래프")
                || p.equals("데이터 시각화 해줘");
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        Optional<PublicData> opt = publicDataRepository.findFirstByTitle(lastDataName);
        if (opt.isEmpty()) {
            ObjectNode err = objectMapper.createObjectNode();
            err.put("type", "error");
            err.put("message", "선택된 데이터가 없습니다. 먼저 검색 후 '[파일명] 상세정보'로 대상을 지정하세요.");
            return Mono.just(err);
        }

        PublicData pd = opt.get();
        String publicDataPk = String.valueOf(pd.getPublicDataPk()); // 타입에 맞게 조정(Long이면 문자열 변환)

        ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "data_analysis_result"); // 프론트 파서가 data_analysis로 매핑

        root.put("analysis",
                "### 요약\n" +
                        "- 선택한 데이터에 대해 기본 차트를 생성했습니다.\n" +
                        "- 필요하면 ‘열 이름을 ○○로 바꿔줘’, ‘파이차트로’ 같은 후속 지시를 내려주세요.");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("title", pd.getTitle());
        payload.put("format", "csv"); // JSON 데이터셋이면 "json"으로 바꾸고 text/url만 맞추면 됩니다.
        payload.put("url", "/api/download?publicDataPk=" + publicDataPk);

        root.set("dataPayload", payload);
        root.put("publicDataPk", publicDataPk);
        return Mono.just(root);
    }
}
