package com.example.oda.service;

// backend/src/main/java/com/example/oda/service/AiModelService.java

import reactor.core.publisher.Mono;
import java.util.List;

/**
 * AI 모델과의 상호작용을 추상화한 인터페이스입니다.
 * 이 인터페이스를 구현하는 클래스는 특정 AI 제공자(예: Gemini, OpenAI)의 세부 사항을 캡슐화합니다.
 */
public interface AiModelService {

    /**
     * 사용자의 프롬프트를 기반으로 가장 적합한 데이터 카테고리를 추론합니다.
     * @param prompt 사용자의 원본 프롬프트
     * @return 추론된 카테고리 이름을 담은 Mono
     */
    Mono<String> getCategory(String prompt);

    /**
     * 주어진 후보 목록 내에서 사용자의 프롬프트에 가장 적합한 데이터를 추천합니다.
     * @param prompt 사용자의 원본 프롬프트
     * @param category 추론된 카테고리
     * @param candidateNames 추천 후보 데이터 이름 목록
     * @return AI가 추천하는 데이터 이름 목록을 담은 Mono
     */
    Mono<List<String>> getRecommendations(String prompt, String category, List<String> candidateNames);
}
