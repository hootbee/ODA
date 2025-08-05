package com.example.oda.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponseDto {
    private List<String> response;
    private Long sessionId;
    private String sessionTitle; // 세션 제목 추가
}
