package com.example.oda.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class FileDownloadService {

    private final WebClient webClient;

    // TypeScript Agent 서버의 주소를 application.properties에서 관리
    public FileDownloadService(WebClient.Builder builder, @Value("${agent.server.url:http://localhost:3001}") String agentServerUrl) {
        this.webClient = builder.baseUrl(agentServerUrl).build();
    }

    public Mono<ResponseEntity<byte[]>> downloadFile(String publicDataPk) {
        log.info("Forwarding download request for PK {} to agent server", publicDataPk);

        return webClient.get()
                .uri("/api/download-by-pk/{publicDataPk}", publicDataPk)
                .retrieve()
                // 에이전트 서버의 응답을 그대로 클라이언트에게 전달
                .toEntity(byte[].class)
                .doOnError(e -> log.error("Failed to download file from agent server for PK: {}", publicDataPk, e))
                .onErrorResume(e -> Mono.just(ResponseEntity.status(502).body(("Failed to get file from agent: " + e.getMessage()).getBytes())));
    }
}