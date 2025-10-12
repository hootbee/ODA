package com.example.oda.prompt.handlers;

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
        return lower.startsWith("/다른") ||
                lower.startsWith("/새로운") ||
                lower.startsWith("/새로") ||
                lower.startsWith("/다시");
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        session.setLastDataName(null);
        chatSessionRepository.save(session);
        System.out.println("데이터초기화");
        com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "context_reset");
        return Mono.just(root);
    }
}
