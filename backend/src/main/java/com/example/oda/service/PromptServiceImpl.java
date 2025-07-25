// backend/src/main/java/com/example/oda/service/PromptServiceImpl.java
package com.example.oda.service;

import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Service // Spring Bean으로 등록하여 다른 곳에 주입될 수 있도록 함
public class PromptServiceImpl implements PromptService { // PromptService 인터페이스 구현

    private static final Logger log = LoggerFactory.getLogger(PromptServiceImpl.class);

    private final PublicDataRepository publicDataRepository;
    private final AiModelService aiModelService;

    private static final String NO_MATCH_CATEGORY_RETURNED_BY_AI = "UNMATCHED_CATEGORY";


    public PromptServiceImpl(PublicDataRepository publicDataRepository, AiModelService aiModelService) {
        this.publicDataRepository = publicDataRepository;
        this.aiModelService = aiModelService;
    }

    @Override // PromptService 인터페이스의 메소드를 구현
    public Mono<List<String>> processPrompt(String prompt) {
        // 이제 aiModelService에 직접 카테고리 추론을 요청
        return aiModelService.getCategory(prompt)
                .flatMap(classificationSystem -> {
                    // AiModelService 구현체에서 약속된 NO_MATCH_CATEGORY를 반환했을 경우
                    if (NO_MATCH_CATEGORY_RETURNED_BY_AI.equals(classificationSystem)) {
                        return Mono.just(List.of("공공데이터와 관련된 프롬프트를 작성해주세요."));
                    }

                    // DB에서 데이터 조회 (PromptService의 고유 로직)
                    List<PublicData> dataList = publicDataRepository.findByKeywordsContainingIgnoreCaseOrTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrClassificationSystemContainingIgnoreCase(classificationSystem, classificationSystem, classificationSystem, classificationSystem);
                    if (dataList.isEmpty()) {
                        return Mono.just(List.of("해당 카테리에 대한 데이터가 없습니다."));
                    }
                    List<String> candidateNames = dataList.stream()
                            .map(PublicData::getFileDataName)
                            .collect(Collectors.toList());

                    // aiModelService에 최종 추천을 요청
                    return aiModelService.getRecommendations(prompt, classificationSystem, candidateNames);
                })
                .onErrorReturn(List.of("추천 데이터를 찾지 못했습니다.")); // 전체 처리 중 에러 발생 시
    }
}
