package com.example.oda.service.prompt.handlers;

import com.example.oda.dto.QueryPlanDto;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.service.QueryPlannerService;
import com.example.oda.service.prompt.SearchService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(5)
public class GeneralSearchPromptHandler implements PromptHandler {

    private final QueryPlannerService queryPlannerService;
    private final SearchService searchService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        // 다른 핸들러가 처리하지 않는 모든 경우를 처리하는 기본 핸들러
        return true;
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        try {
            QueryPlanDto plan = queryPlannerService.createQueryPlan(prompt);

            log.info("원본 프롬프트: {}", prompt);
            log.info("추출된 키워드: {}", plan.getKeywords());
            log.info("AI 분류 결과: {}", plan.getMajorCategory());
            log.info("결과 개수 제한: {}", plan.getLimit());

            List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());
            List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);
            List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), prompt);

            log.info("전체 검색 결과 수: {}", sortedResults.size());

            ObjectNode root = objectMapper.createObjectNode();

            if (sortedResults.isEmpty()) {
                String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                root.put("type", "search_not_found");
                ObjectNode payload = objectMapper.createObjectNode();
                payload.set("failedKeywords", objectMapper.valueToTree(plan.getKeywords()));
                payload.put("suggestedCategory", plan.getMajorCategory());
                payload.put("regionKeyword", regionKeyword);
                root.set("payload", payload);
            } else {
                List<String> resultNames = sortedResults.stream()
                        .map(PublicData::getFileDataName)
                        .filter(name -> name != null && !name.trim().isEmpty())
                        .limit(plan.getLimit())
                        .collect(Collectors.toList());

                root.put("type", "search_results");
                ObjectNode payload = objectMapper.createObjectNode();
                payload.set("results", objectMapper.valueToTree(resultNames));
                payload.put("totalCount", sortedResults.size());
                root.set("payload", payload);
            }

            return Mono.just(root);

        } catch (Exception e) {
            log.error("검색 중 오류 발생", e);
            ObjectNode errorNode = objectMapper.createObjectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "데이터를 조회하는 중 오류가 발생했습니다.");
            return Mono.just(errorNode);
        }
    }
}