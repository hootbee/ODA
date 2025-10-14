package com.example.oda.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@Slf4j
public class FileDownloadServiceImpl implements FileDownloadService {

    private final WebClient webClient;

    // 환경설정에서 바꿀 수 있도록 프로퍼티로 분리(기본값 포함)
    @Value("${seoul.portal.baseUrl:https://data.seoul.go.kr}")
    private String seoulPortalBaseUrl;

    public FileDownloadServiceImpl(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    /**
     * 프런트가 호출하는 단일 PK 버전:
     *  - OA-코드면 datasetView URL을 조립
     *  - (향후) 오픈API CSV/JSON 직접 다운로드 URL을 resolveDownloadUrlByPk()에서 만들어주면 스트리밍으로 내려줄 수 있음
     */
    @Override
    public Mono<ResponseEntity<byte[]>> downloadFile(String publicDataPk) {
        return Mono.fromCallable(() -> {
            String resolvedUrl = resolveDownloadUrlByPk(publicDataPk);
            if (resolvedUrl == null || resolvedUrl.isBlank()) {
                throw new IllegalStateException("원본 파일 URL을 구성할 수 없습니다. (publicDataPk=" + publicDataPk + ")");
            }

            // datasetView.do는 HTML 페이지이므로, 이 경우에는 302로 리다이렉트 처리
            if (resolvedUrl.toLowerCase(Locale.ROOT).contains("datasetview.do")) {
                return ResponseEntity.status(302)
                        .header(HttpHeaders.LOCATION, resolvedUrl)
                        .build();
            }

            // 만약 resolvedUrl이 실제 CSV/JSON 다운로드 엔드포인트라면 스트리밍
            byte[] body = webClient.get()
                    .uri(resolvedUrl)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();

            String filename = buildFilenameFromPk(publicDataPk, resolvedUrl);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment()
                                    .filename(filename, StandardCharsets.UTF_8)
                                    .build().toString())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(body);
        });
    }

    /**
     * (기존 시그니처) PK + fileDetailSn 방식은 더 이상 사용하지 않음.
     * 필요시 여기서도 resolveDownloadUrlByPk(publicDataPk) 로직을 재사용해 302/스트리밍 처리하면 됨.
     */
    @Override
    public byte[] download(Long publicDataPk, Long fileDetailSn) {
        throw new UnsupportedOperationException("downloadFile(String publicDataPk)를 사용하세요.");
    }

    // === 아래는 유틸 ===

    // OA-코드 패턴 (예: OA-20880)
    private static final Pattern OA_CODE = Pattern.compile("(?i)^OA-\\d+$");

    /**
     * publicDataPk를 받아 최종 접근 URL을 만든다.
     * 현재는 OA 코드면 datasetView URL을 조립해서 반환한다.
     * (확장) 오픈API CSV/JSON 엔드포인트를 알고 있다면 여기서 그 URL을 반환하도록 변경 가능.
     */
    private String resolveDownloadUrlByPk(String publicDataPk) {
        if (publicDataPk == null || publicDataPk.isBlank()) return null;

        // OA-코드 형태이면 datasetView URL 조립
        if (OA_CODE.matcher(publicDataPk).matches()) {
            return buildDatasetViewUrl(publicDataPk);
        }

        // OA 코드가 아니면 (확장 포인트) 다른 식별자에 대한 매핑 로직 추가
        log.warn("알 수 없는 PK 형식입니다. 그대로 datasetView URL 시도: {}", publicDataPk);
        return buildDatasetViewUrl(publicDataPk); // 최선의 폴백
    }

    /** 예시로 주신 규칙에 맞춰 datasetView URL 조립 */
    private String buildDatasetViewUrl(String publicDataPk) {
        // https://data.seoul.go.kr/dataList/OA-20880/S/1/datasetView.do
        return String.format("%s/dataList/%s/S/1/datasetView.do", seoulPortalBaseUrl, publicDataPk);
    }

    /** 파일 이름 유추 (CSV/JSON 직접 다운로드가 될 때만 사용) */
    private String buildFilenameFromPk(String publicDataPk, String url) {
        String base = (publicDataPk == null || publicDataPk.isBlank()) ? "seoul-data" : publicDataPk;
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains(".json")) return base + ".json";
        if (lower.contains(".csv"))  return base + ".csv";
        return base + ".dat";
    }
}
