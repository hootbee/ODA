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

    @Override
    public Mono<List<String>> processPrompt(String prompt) {
        return aiModelService.getClassificationSystem(prompt)
                .flatMap(classificationSystem -> {
                    if (NO_MATCH_CATEGORY_RETURNED_BY_AI.equals(classificationSystem)) {
                        return Mono.just(List.of("공공데이터와 관련된 프롬프트를 작성해주세요."));
                    }

                    // 1. 먼저 원래 검색어로 검색
                    List<PublicData> dataList = publicDataRepository.searchByKeyword(prompt);

                    // 2. 결과가 없으면 AI 분류 결과로 검색
                    if (dataList.isEmpty()) {
                        dataList = publicDataRepository.findByClassificationSystemContainingIgnoreCase(classificationSystem);
                    }

                    // 3. 여전히 결과가 없으면 더 광범위하게 검색
                    if (dataList.isEmpty()) {
                        // "인천에 대한 데이터"에서 "인천" 추출해서 검색
                        String[] keywords = prompt.split("\\s+");
                        for (String keyword : keywords) {
                            if (keyword.length() > 1) { // 한 글자 제외
                                List<PublicData> tempList = publicDataRepository.searchByKeyword(keyword);
                                dataList.addAll(tempList);
                            }
                        }
                        // 중복 제거
                        dataList = dataList.stream().distinct().collect(Collectors.toList());
                    }

                    if (dataList.isEmpty()) {
                        return Mono.just(List.of("해당 카테고리에 대한 데이터가 없습니다."));
                    }

                    List<String> candidateNames = dataList.stream()
                            .map(PublicData::getFileDataName)
                            .collect(Collectors.toList());

                    return aiModelService.getRecommendations(prompt, classificationSystem, candidateNames);
                })
                .onErrorReturn(List.of("추천 데이터를 찾지 못했습니다."));
    }

}
