// backend/src/main/java/com/example/oda/controller/PromptController.java
package com.example.oda.controller;

import com.example.oda.dto.PromptRequestDto;
import com.example.oda.service.PromptService; // 인터페이스 import
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import java.util.List;

@RestController
public class PromptController {

    private final PromptService promptService; // 인터페이스 타입으로 주입

    @Autowired
    public PromptController(PromptService promptService) {
        this.promptService = promptService;
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/prompt")
    public Mono<ResponseEntity<List<String>>> handlePrompt(@RequestBody PromptRequestDto promptRequestDto) {
        return promptService.processPrompt(promptRequestDto.getPrompt())
                .map(recommendations -> ResponseEntity.ok(recommendations))
                .defaultIfEmpty(ResponseEntity.notFound().build()); // Mono가 비어있을 경우 (발생할 가능성 낮음)
    }
}
