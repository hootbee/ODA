package com.example.oda.service.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.example.oda.repository.ChatSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
@Order(2)
public class NewSearchPromptHandler implements PromptHandler {

    private final ChatSessionRepository chatSessionRepository;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        String lower = prompt.toLowerCase();
        return lower.contains("다른 데이터 활용") ||
                lower.contains("다른 데이터") ||
                lower.contains("새로운 데이터") ||
                lower.contains("다른 정보") ||
                lower.contains("새 검색") ||
                lower.contains("새로운 검색") ||
                lower.contains("다른 자료") ||
                lower.matches(".*다른.*조회.*") ||
                lower.matches(".*새로.*찾.*") ||
                lower.matches(".*다시.*검색.*");
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        session.setLastDataName(null);
        chatSessionRepository.save(session);

        com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "context_reset");
        return Mono.just(root);
    }
}
