package com.example.oda.service.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface PromptHandler {
    boolean canHandle(String prompt, String lastDataName);
    Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName);
}
