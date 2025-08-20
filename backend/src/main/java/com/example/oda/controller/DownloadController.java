package com.example.oda.controller;

import com.example.oda.service.FileDownloadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DownloadController {

    private final FileDownloadService fileDownloadService;

    @GetMapping("/download/{publicDataPk}")
    public Mono<ResponseEntity<byte[]>> downloadFile(@PathVariable String publicDataPk) {
        return fileDownloadService.downloadFile(publicDataPk);
    }
}
