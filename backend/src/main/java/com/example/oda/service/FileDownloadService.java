package com.example.oda.service;

import org.springframework.http.ResponseEntity;
import reactor.core.publisher.Mono;

public interface FileDownloadService {
    Mono<ResponseEntity<byte[]>> downloadFile(String publicDataPk);
}
