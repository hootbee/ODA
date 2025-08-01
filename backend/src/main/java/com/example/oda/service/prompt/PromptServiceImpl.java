package com.example.oda.service.prompt;

import com.example.oda.dto.QueryPlanDto;
import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.PublicData;
import com.example.oda.service.PromptService;
import com.example.oda.service.QueryPlannerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PromptServiceImpl implements PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptServiceImpl.class);

    private final QueryPlannerService queryPlannerService;
    private final DetailService detailService;
    private final SearchService searchService;
    private final UtilizationService utilizationService;

    public PromptServiceImpl(QueryPlannerService queryPlannerService, DetailService detailService, SearchService searchService, UtilizationService utilizationService) {
        this.queryPlannerService = queryPlannerService;
        this.detailService = detailService;
        this.searchService = searchService;
        this.utilizationService = utilizationService;
    }

    @Override
    public Mono<List<String>> processPrompt(String prompt) {
        log.info("=== 프롬프트 처리 시작 ===");
        log.info("입력 프롬프트: '{}'", prompt);

        if (detailService.isDetailRequest(prompt)) {
            log.info("상세 조회 요청으로 판단");
            return detailService.getDataDetails(prompt)
                    .map(List::of)
                    .doOnNext(result -> log.info("상세 조회 결과 반환: {} 문자", result.get(0).length()));
        }

        log.info("일반 검색 모드로 진행");
        QueryPlanDto queryPlan = queryPlannerService.createQueryPlan(prompt);

        return Mono.just(queryPlan)
                .flatMap(plan -> {
                    log.info("원본 프롬프트: {}", prompt);
                    log.info("추출된 키워드: {}", plan.getKeywords());
                    log.info("AI 분류 결과: {}", plan.getMajorCategory());
                    log.info("결과 개수 제한: {}", plan.getLimit());

                    List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());
                    List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);
                    List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), prompt);

                    log.info("전체 검색 결과 수: {}", sortedResults.size());

                    if (sortedResults.isEmpty()) {
                        String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                        if (regionKeyword != null) {
                            return Mono.just(List.of(
                                    "해당 지역(" + regionKeyword + ")의 데이터가 부족합니다.",
                                    "다른 지역의 유사한 데이터를 참고하거나",
                                    "상위 카테고리(" + plan.getMajorCategory() + ")로 검색해보세요."
                            ));
                        } else {
                            return Mono.just(List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다."));
                        }
                    }

                    List<String> results = sortedResults.stream()
                            .map(PublicData::getFileDataName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .limit(plan.getLimit())
                            .collect(Collectors.toList());

                    if (!results.isEmpty() && results.size() >= 3) {
                        results.add("💡 특정 데이터에 대한 자세한 정보가 필요하시면");
                        results.add("'[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.");
                    }

                    return Mono.just(results);
                })
                .onErrorReturn(List.of("데이터를 조회하는 중 오류가 발생했습니다."));
    }

    @Override
    public Mono<String> getDataDetails(String prompt) {
        return detailService.getDataDetails(prompt);
    }

    @Override
    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto) {
        return utilizationService.getSingleUtilizationRecommendation(requestDto);
    }

    @Override
    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto) {
        return utilizationService.getFullUtilizationRecommendations(requestDto);
    }
}

