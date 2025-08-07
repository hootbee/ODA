package com.example.oda.service.prompt.handlers;

import com.example.oda.dto.QueryPlanDto;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.service.QueryPlannerService;
import com.example.oda.service.prompt.SearchService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

            List<String> results;

            if (sortedResults.isEmpty()) {
                String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                if (regionKeyword != null) {
                    results = List.of(
                            "해당 지역(" + regionKeyword + ")의 데이터가 부족합니다.",
                            "다른 지역의 유사한 데이터를 참고하거나",
                            "상위 카테고리(" + plan.getMajorCategory() + ")로 검색해보세요."
                    );
                } else {
                    results = List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다.");
                }
            } else {
                results = sortedResults.stream()
                        .map(PublicData::getFileDataName)
                        .filter(name -> name != null && !name.trim().isEmpty())
                        .limit(plan.getLimit())
                        .collect(Collectors.toList());

                if (!results.isEmpty()) {
                    String hintMessage = "\n\n💡 특정 데이터에 대한 자세한 정보가 필요하시면\n'[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.";
                    int lastIndex = results.size() - 1;
                    results.set(lastIndex, results.get(lastIndex) + hintMessage);
                }
            }

            JsonNode jsonNode = objectMapper.valueToTree(results);
            return Mono.just(jsonNode);

        } catch (Exception e) {
            log.error("검색 중 오류 발생", e);
            return Mono.just(objectMapper.valueToTree(
                    List.of("데이터를 조회하는 중 오류가 발생했습니다.")));
        }
    }
}