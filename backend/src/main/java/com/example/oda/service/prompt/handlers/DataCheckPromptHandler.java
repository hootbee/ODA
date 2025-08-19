package com.example.oda.service.prompt.handlers;

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
@Order(4) // Order it before UtilizationPromptHandler
public class DataCheckPromptHandler implements PromptHandler {

   private final GeminiService geminiService;
   private final PublicDataRepository publicDataRepository;

   @Override
   public boolean canHandle(String prompt, String lastDataName) {
       // Trigger on "데이터 확인" when a dataset is in context
       return lastDataName != null && !lastDataName.isBlank() && prompt.trim().equals("데이터 확인");
   }

   @Override
   public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
       // Find the PublicData entity by its name to get the PK
       Optional<PublicData> publicDataOptional = publicDataRepository.findByFileDataName(lastDataName);

       if (publicDataOptional.isEmpty()) {
           ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
           errorNode.put("type", "error");
           errorNode.put("message", "선택된 데이터의 정보를 찾을 수 없습니다: " + lastDataName);
           return Mono.just(errorNode);
       }

        Long publicDataPk = publicDataOptional.get().getPublicDataPk();
       if (publicDataPk == null) {
           ObjectNode errorNode = JsonNodeFactory.instance.objectNode();
           errorNode.put("type", "error");
           errorNode.put("message", "데이터의 PK(publicDataPk) 값이 없습니다: " + lastDataName);
           return Mono.just(errorNode);
       }

       return geminiService.analyzeDataByPk(publicDataPk);
   }
}
