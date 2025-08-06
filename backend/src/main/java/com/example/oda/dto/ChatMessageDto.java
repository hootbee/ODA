package com.example.oda.dto;

import com.example.oda.entity.MessageSender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private MessageSender sender;
    private String content;
    private LocalDateTime createdAt;
    private String lastDataName;
}
