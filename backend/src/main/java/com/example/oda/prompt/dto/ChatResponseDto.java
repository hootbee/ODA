package com.example.oda.prompt.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponseDto {
    private JsonNode response; // 타입을 JsonNode로 변경
    private Long sessionId;
    private String sessionTitle;
    private String lastDataName;
}
