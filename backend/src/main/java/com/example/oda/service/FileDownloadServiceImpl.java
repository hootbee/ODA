package com.example.oda.service;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class FileDownloadServiceImpl implements FileDownloadService {

    private final WebClient webClient;

    public FileDownloadServiceImpl(WebClient.Builder builder, @Value("${agent.server.url:http://localhost:3001}") String agentServerUrl) {
        this.webClient = builder.baseUrl(agentServerUrl).build();
    }

    @Override
    public Mono<ResponseEntity<byte[]>> downloadFile(String publicDataPk) {
        log.info("Forwarding download request for PK {} to agent server", publicDataPk);

        return webClient.get()
                .uri("/api/download-by-pk/{publicDataPk}", publicDataPk)
                .retrieve()
                .toEntity(byte[].class)
                .doOnError(e -> log.error("Failed to download file from agent server for PK: {}", publicDataPk, e))
                .onErrorResume(e -> Mono.just(ResponseEntity.status(502).body(("Failed to get file from agent: " + e.getMessage()).getBytes())));
    }

    @Override
    public byte[] download(Long publicDataPk, Long fileDetailSn) {
        // TODO: DB에서 실제 다운로드 URL/경로를 조회하거나, S3 키 등을 조회해 바이트 배열로 받아오세요.
        // 여기서는 예시로 외부 URL을 GET 하는 형태를 보여드립니다.
        // String url = publicDataRepository.findDownloadUrl(publicDataPk, fileDetailSn);
        String url = buildDownloadUrl(publicDataPk, fileDetailSn);

        RestTemplate rt = new RestTemplate();
        ResponseEntity<byte[]> resp = rt.getForEntity(url, byte[].class);
        if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
            return resp.getBody();
        }
        throw new IllegalStateException("파일 다운로드 실패: " + url);
    }

    private String buildDownloadUrl(Long publicDataPk, Long fileDetailSn) {
        // 실제 환경에 맞게 변경
        // 공공데이터포털에서 받은 파일의 프록시 경로나 내부 저장소 주소 등을 조합
        return "https://example.com/files/" + publicDataPk + "/" + fileDetailSn;
    }
}
