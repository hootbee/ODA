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

import java.util.List;
import java.util.Optional;

@Service
public class UtilizationService {

    private static final Logger log = LoggerFactory.getLogger(UtilizationService.class);

    private final PublicDataRepository publicDataRepository;
    private final AiModelService aiModelService;

    public UtilizationService(PublicDataRepository publicDataRepository, AiModelService aiModelService) {
        this.publicDataRepository = publicDataRepository;
        this.aiModelService = aiModelService;
    }

    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto) {
        return Mono.fromCallable(() -> {
            String fileName = requestDto.getDataInfo().getFileName();
            String userPrompt = requestDto.getAnalysisType();
            log.info("단일 활용 추천 요청: 파일명='{}', 사용자 프롬프트='{}'", fileName, userPrompt);

            Optional<PublicData> exactMatch = publicDataRepository.findByFileDataName(fileName);

            if (exactMatch.isPresent()) {
                PublicData data = exactMatch.get();
                try {
                    return aiModelService.getSingleUtilizationRecommendation(data, userPrompt).block();
                } catch (Exception e) {
                    log.error("단일 활용 추천 생성 실패", e);
                    return List.of("단일 활용 방안을 가져오는 데 실패했습니다.");
                }
            }
            return List.of("❌ 해당 파일명을 찾을 수 없습니다: " + fileName);
        });
    }

    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto) {
        return Mono.fromCallable(() -> {
            String fileName = requestDto.getDataInfo().getFileName();
            log.info("전체 활용 추천 요청: 파일명='{}'", fileName);

            Optional<PublicData> exactMatch = publicDataRepository.findByFileDataName(fileName);

            if (exactMatch.isPresent()) {
                PublicData data = exactMatch.get();
                try {
                    return aiModelService.getUtilizationRecommendations(data).block();
                } catch (Exception e) {
                    log.error("전체 활용 추천 생성 실패", e);
                    return createDefaultFullRecommendations(data);
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            ObjectNode errorNode = mapper.createObjectNode();
            errorNode.put("error", "파일을 찾을 수 없습니다: " + fileName);
            return errorNode;
        });
    }

    private JsonNode createDefaultFullRecommendations(PublicData data) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode result = mapper.createObjectNode();
        ObjectNode dataNode = mapper.createObjectNode();

        ArrayNode businessApps = mapper.createArrayNode();
        businessApps.add("데이터 기반 비즈니스 서비스 개발");
        businessApps.add("관련 분야 컨설팅 사업");
        businessApps.add("정부 사업 입찰 참여");

        ArrayNode researchApps = mapper.createArrayNode();
        researchApps.add("현황 분석 및 트렌드 연구");
        researchApps.add("정책 효과성 분석");
        researchApps.add("지역별 비교 연구");

        ArrayNode policyApps = mapper.createArrayNode();
        policyApps.add("정책 수립 근거 자료");
        policyApps.add("예산 배분 참고");
        policyApps.add("성과 평가 지표");

        ArrayNode combinations = mapper.createArrayNode();
        combinations.add("인구 통계 데이터");
        combinations.add("경제 지표 데이터");
        combinations.add("지리 정보 데이터");

        ArrayNode tools = mapper.createArrayNode();
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