package com.example.oda.service.prompt.handlers;

import com.example.oda.entity.ChatSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
@Order(1)
public class HelpPromptHandler implements PromptHandler {

    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String prompt, String lastDataName) {
        return "/도움말".equals(prompt);
    }

    @Override
    public Mono<JsonNode> handle(ChatSession session, String prompt, String lastDataName) {
        List<String> helpMessage = List.of(
                "안녕하세요! 저는 공공 데이터를 찾고 활용하는 것을 돕는 AI 챗봇입니다.",
                "다음과 같이 질문해보세요:",
                "• 특정 데이터 검색: '서울시 교통 데이터 보여줘'",
                "• 데이터 상세 정보: '[파일명] 자세히' 또는 '[파일명] 상세정보'",
                "• 데이터 활용 방안: '[파일명] 전체 활용' 또는 '[파일명] 비즈니스 활용'",
                "• 새로운 데이터 검색 시작: '다른 데이터 조회'",
                "• 현재 대화 초기화: '새 대화' (프론트엔드 기능)"
        );
        return Mono.just(objectMapper.valueToTree(helpMessage));
    }
}
