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
        this.objectMapper = objectMapper; // ObjectMapper 주입 확인
    }

    private Mono<Optional<PublicData>> findDataByName(String fileName) {
        return Mono.fromCallable(() -> publicDataRepository.findByFileDataName(fileName))
                .subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<JsonNode> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto) {
        String fileName = requestDto.getDataInfo().getFileName();
        String userPrompt = requestDto.getAnalysisType();
        log.info("단일 활용 추천 요청: 파일명='{}', 사용자 프롬프트='{}'", fileName, userPrompt);

        return findDataByName(fileName)
                .flatMap(optionalData -> {
                    if (optionalData.isPresent()) {
                        return aiModelService.getSingleUtilizationRecommendation(optionalData.get(), userPrompt);
                    }
                    // 파일을 찾지 못한 경우 일관된 에러 형식으로 반환
                    return Mono.just(createErrorNode("파일을 찾을 수 없습니다: " + fileName));
                })
                .doOnError(e -> log.error("단일 활용 추천 생성 실패", e))
                .onErrorResume(e -> {
                    // 그 외 에러 발생 시에도 일관된 에러 형식으로 반환
                    return Mono.just(createErrorNode("AI 모델로부터 단일 활용 방안을 가져오는 데 실패했습니다."));
                });
    }

    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto) {
        String fileName = requestDto.getDataInfo().getFileName();
        log.info("전체 활용 추천 요청: 파일명='{}'", fileName);

        return findDataByName(fileName)
                .flatMap(optionalData -> {
                    if (optionalData.isPresent()) {
                        PublicData data = optionalData.get();
                        return aiModelService.getUtilizationRecommendations(data);
                    }
                    // 파일을 찾지 못했을 때도 일관된 에러 형식을 사용
                    return Mono.just(createErrorNode("파일을 찾을 수 없습니다: " + fileName));
                })
                .doOnError(e -> log.error("전체 활용 추천 생성 실패", e))
                .onErrorResume(e ->
                     Mono.just(createErrorNode("AI 모델로부터 전체 활용 방안을 가져오는 데 실패했습니다."))
                );
    }

    // --- 일관된 응답을 위한 헬퍼 메소드 ---

    // 성공 응답용 헬퍼
    private JsonNode createSuccessNode(JsonNode data) {
        ObjectNode resultNode = objectMapper.createObjectNode();
        resultNode.put("success", true);
        resultNode.set("data", data);
        return resultNode;
    }

    // 에러 응답용 헬퍼
    private JsonNode createErrorNode(String errorMessage) {
        ObjectNode errorNode = objectMapper.createObjectNode();
        errorNode.put("success", false);
        errorNode.put("error", errorMessage);
        return errorNode;
    }
}