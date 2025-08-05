package com.example.oda.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PromptRequestDto {
    private String prompt;
    private Long sessionId;
}
