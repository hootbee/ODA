package com.example.oda.service.prompt;

import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.example.oda.service.AiModelService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Optional;

@Service
public class UtilizationService {

    private static final Logger log = LoggerFactory.getLogger(UtilizationService.class);

    private final PublicDataRepository publicDataRepository;
    private final AiModelService aiModelService;
    private final ObjectMapper objectMapper;


    public UtilizationService(PublicDataRepository publicDataRepository, AiModelService aiModelService, ObjectMapper objectMapper) {
        this.publicDataRepository = publicDataRepository;
        this.aiModelService = aiModelService;
        this.objectMapper = new ObjectMapper();
    }

    private Mono<Optional<PublicData>> findDataByName(String fileName) {
        return Mono.fromCallable(() -> publicDataRepository.findByFileDataName(fileName))
                .subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto) {
        String fileName = requestDto.getDataInfo().getFileName();
        String userPrompt = requestDto.getAnalysisType();
        log.info("단일 활용 추천 요청: 파일명='{}', 사용자 프롬프트='{}'", fileName, userPrompt);

        return findDataByName(fileName)
                .flatMap(optionalData -> {
                    if (optionalData.isPresent()) {
                        return aiModelService.getSingleUtilizationRecommendation(optionalData.get(), userPrompt);
                    }
                    return Mono.just(List.of("❌ 해당 파일명을 찾을 수 없습니다: " + fileName));
                })
                .doOnError(e -> log.error("단일 활용 추천 생성 실패", e))
                .onErrorReturn(List.of("단일 활용 방안을 가져오는 데 실패했습니다."));
    }

    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto) {
        String fileName = requestDto.getDataInfo().getFileName();
        log.info("전체 활용 추천 요청: 파일명='{}'", fileName);

        return findDataByName(fileName)
                .flatMap(optionalData -> {
                    if (optionalData.isPresent()) {
                        PublicData data = optionalData.get();
                        return aiModelService.getUtilizationRecommendations(data)
                                .map(aiResponse -> {
                                    ObjectNode resultNode = objectMapper.createObjectNode();
                                    resultNode.set("data", aiResponse);
                                    resultNode.put("success", true);
                                    return (JsonNode) resultNode;
                                })
                                .doOnError(e -> log.error("전체 활용 추천 생성 실패", e))
                                .onErrorReturn(createDefaultFullRecommendations(data));
                    }
                    ObjectNode errorNode = objectMapper.createObjectNode();
                    errorNode.put("error", "파일을 찾을 수 없습니다: " + fileName);
                    return Mono.just(errorNode);
                });
    }

    private JsonNode createDefaultFullRecommendations(PublicData data) {
        ObjectNode result = objectMapper.createObjectNode();
        ObjectNode dataNode = objectMapper.createObjectNode();

        ArrayNode businessApps = objectMapper.createArrayNode();
        businessApps.add("데이터 기반 비즈니스 서비스 개발");
        businessApps.add("관련 분야 컨설팅 사업");
        businessApps.add("정부 사업 입찰 참여");

        ArrayNode researchApps = objectMapper.createArrayNode();
        researchApps.add("현황 분석 및 트렌드 연구");
        researchApps.add("정책 효과성 분석");
        researchApps.add("지역별 비교 연구");

        ArrayNode policyApps = objectMapper.createArrayNode();
        policyApps.add("정책 수립 근거 자료");
        policyApps.add("예산 배분 참고");
        policyApps.add("성과 평가 지표");

        ArrayNode combinations = objectMapper.createArrayNode();
        combinations.add("인구 통계 데이터");
        combinations.add("경제 지표 데이터");
        combinations.add("지리 정보 데이터");

        ArrayNode tools = objectMapper.createArrayNode();
        tools.add("Excel/Google Sheets");
        tools.add("Python pandas");
        tools.add("R 통계 분석");

        dataNode.set("businessApplications", businessApps);
        dataNode.set("researchApplications", researchApps);
        dataNode.set("policyApplications", policyApps);
        dataNode.set("combinationSuggestions", combinations);
        dataNode.set("analysisTools", tools);

        result.set("data", dataNode);
        result.put("success", true);

        return result;
    }
}