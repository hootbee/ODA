package com.example.oda.controller;

import com.example.oda.dto.PromptRequestDto;
import com.example.oda.service.PromptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PromptController {

    private final PromptService promptService;

    // 생성자를 통한 의존성 주입 (권장 방식)
    @Autowired
    public PromptController(PromptService promptService) {
        this.promptService = promptService;
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/api/prompt")
    public ResponseEntity<String> handlePrompt(@RequestBody PromptRequestDto requestDto) {
        String prompt = requestDto.getPrompt();
        String response = promptService.processPrompt(prompt);
        return ResponseEntity.ok(response);
    }


}
