package com.example.oda.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PromptRequestDto {
    private String prompt;
    private Long sessionId;
    private String lastDataName; // 후속 질문 컨텍스트 추가
}
