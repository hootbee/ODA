package com.example.oda.service.prompt;

import com.example.oda.dto.SingleUtilizationRequestDto;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.example.oda.service.AiModelService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
                                    resultNode.put("success", true);
                                    resultNode.set("data", aiResponse);
                                    return (JsonNode) resultNode;
                                })
                                .doOnError(e -> log.error("전체 활용 추천 생성 실패", e))
                                // [수정됨] 기본값 대신 에러 노드를 반환합니다.
                                .onErrorReturn(createErrorNode("AI 모델로부터 전체 활용 방안을 가져오는 데 실패했습니다."));
                    }
                    // 파일을 찾지 못했을 때도 일관된 에러 형식을 사용합니다.
                    return Mono.just(createErrorNode("파일을 찾을 수 없습니다: " + fileName));
                });
    }

    // [새로 추가됨] 일관된 에러 응답을 생성하는 헬퍼 메소드
    private JsonNode createErrorNode(String errorMessage) {
        ObjectNode errorNode = objectMapper.createObjectNode();
        errorNode.put("success", false);
        errorNode.put("error", errorMessage);
        return errorNode;
    }


}