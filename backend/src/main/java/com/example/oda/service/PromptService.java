package com.example.oda.service;

import com.example.oda.dto.GeminiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class PromptService {

    private final WebClient webClient;

    // application.properties 파일에서 'gemini.api-key' 값을 읽어와 apiKey 변수에 주입합니다.
    @Value("${gemini.api-key}")
    private String apiKey;

    public PromptService() {
        // WebClient 인스턴스를 생성합니다.
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com") // Gemini API의 실제 Base URL
                .build();
    }

    public String processPrompt(String prompt) {
        // Gemini API를 호출하여 응답을 받아옵니다.
        return callGeminiApi(prompt);
    }

    private String callGeminiApi(String prompt) {
        String uri = "/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

        // 여기서는 간단하게 Map을 사용한 예시입니다.
        var requestBody = java.util.Map.of(
                "contents", java.util.List.of(
                        java.util.Map.of(
                                "parts", java.util.List.of(
                                        java.util.Map.of("text", prompt)
                                )
                        )
                )
        );

        Mono<GeminiResponse> responseMono = webClient.post()
                .uri(uri)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(GeminiResponse.class); // String 대신 DTO 클래스로 받음

        GeminiResponse response = responseMono.block();

        // 안전하게 텍스트 추출
        if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
            return response.getCandidates().get(0).getContent().getParts().get(0).getText();
        }

        return "응답을 처리하는 데 실패했습니다.";

    }
}