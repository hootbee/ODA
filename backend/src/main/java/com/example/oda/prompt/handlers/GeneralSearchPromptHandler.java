package com.example.oda.prompt.handlers;

import com.example.oda.prompt.dto.QueryPlanDto;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.prompt.QueryPlannerService;
import com.example.oda.prompt.SearchService;
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
        log.debug("[GeneralSearchPromptHandler] canHandle check: Always true");
        return true;
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        log.info("===== GeneralSearchPromptHandler 시작 (세션 ID: {}) =====", session.getId());
        log.debug("입력 프롬프트: {}", prompt);
        log.debug("이전 데이터 이름: {}", lastDataName);

        try {
            // 1. 쿼리 플랜 생성
            QueryPlanDto plan = queryPlannerService.createQueryPlan(prompt);

            // 2. 데이터 검색 및 필터링
            log.info("데이터 검색을 시작합니다. (키워드: {}, 카테고리: {})", plan.getKeywords(), plan.getMajorCategory());
            long startTime = System.currentTimeMillis();
            List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());
            long endTime = System.currentTimeMillis();
            log.info("데이터 검색 완료. {}개 결과. (소요 시간: {}ms)", allResults.size(), (endTime - startTime));

            // 3. 중복 제거
            List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);
            log.info("중복 제거 후 {}개 결과 남음.", uniqueResults.size());

            // 4. 관련도순 정렬
            List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), prompt);
            log.info("관련도순 정렬 후 {}개 결과.", sortedResults.size());

            ObjectNode root = objectMapper.createObjectNode();

            // 5. 결과 JSON 생성
            if (sortedResults.isEmpty()) {
                log.warn("최종 검색 결과가 없습니다. 'search_not_found' 메시지를 생성합니다.");
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

                log.info("최종 {}개의 결과를 클라이언트에게 반환합니다. (요청된 개수: {})", resultNames.size(), plan.getLimit());
                root.put("type", "search_results");
                ObjectNode payload = objectMapper.createObjectNode();
                payload.set("results", objectMapper.valueToTree(resultNames));
                payload.put("totalCount", resultNames.size());
                root.set("payload", payload);
            }

            log.debug("최종 반환 JSON: {}", root);
            log.info("===== GeneralSearchPromptHandler 종료 =====");
            return Mono.just(root);

        } catch (Exception e) {
            log.error("[GeneralSearchPromptHandler] 처리 중 심각한 오류 발생", e);
            ObjectNode errorNode = objectMapper.createObjectNode();
            errorNode.put("type", "error");
            errorNode.put("message", "데이터를 조회하는 중 오류가 발생했습니다: " + e.getMessage());
            return Mono.just(errorNode);
        }
    }
}
