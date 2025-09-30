package com.example.oda.controller;

import com.example.oda.service.FileDownloadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DownloadController {

    private final FileDownloadService fileDownloadService;

    @GetMapping(value = "/download", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> download(
            @RequestParam("publicDataPk") Long publicDataPk,
            @RequestParam("fileDetailSn") Long fileDetailSn
    ) {
        byte[] bytes = fileDownloadService.download(publicDataPk, fileDetailSn);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        // 파일명은 상황에 맞게
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                        .filename("publicdata-" + publicDataPk + "-" + fileDetailSn + ".bin")
                        .build()
                        .toString());

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }
}