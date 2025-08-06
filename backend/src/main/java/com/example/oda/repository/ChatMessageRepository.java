package com.example.oda.repository;

import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByUserEmailOrderByCreatedAtAsc(String userEmail);
    List<ChatMessage> findByChatSessionOrderByCreatedAtAsc(ChatSession chatSession);

    @Modifying
    void deleteByChatSession(ChatSession chatSession);
}
