package com.example.oda.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatHistoryDto {
    private Long sessionId;
    private String sessionTitle;
    private List<ChatMessageDto> messages;
}
