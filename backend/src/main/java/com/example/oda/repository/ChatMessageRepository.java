package com.example.oda.repository;

import com.example.oda.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByUserEmailOrderByCreatedAtAsc(String userEmail);
}
