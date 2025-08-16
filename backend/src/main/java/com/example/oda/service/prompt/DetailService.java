package com.example.oda.service.prompt;

import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DetailService {

    private static final Logger log = LoggerFactory.getLogger(DetailService.class);
    private final PublicDataRepository publicDataRepository;

    public DetailService(PublicDataRepository publicDataRepository) {
        this.publicDataRepository = publicDataRepository;
    }
    public Mono<PublicData> getDataDetails(String prompt) {
        return Mono.fromCallable(() -> {
            String fileDataName = extractFileNameFromPrompt(prompt);
            log.info("상세 정보 조회 요청: '{}'", fileDataName);
            Optional<PublicData> exactMatch = publicDataRepository.findByFileDataName(fileDataName);
            if (exactMatch.isPresent()) {
                return exactMatch.get();
            }
            List<PublicData> partialMatches = publicDataRepository.findByFileDataNameContaining(fileDataName);
            if (!partialMatches.isEmpty()) {
                return partialMatches.get(0);
            }
            return null;
        }).flatMap(Mono::justOrEmpty);
    }

    private String extractFileNameFromPrompt(String prompt) {
        log.info("파일명 추출 시작: '{}'", prompt);
        Pattern fullFilePattern = Pattern.compile("([가-힣a-zA-Z0-9]+광역시\s[가-구]+_[가-힣a-zA-Z0-9\s]+_\\d{8})");
        Matcher fullMatcher = fullFilePattern.matcher(prompt);
        if (fullMatcher.find()) {
            String fileName = fullMatcher.group(1).trim();
            log.info("완전한 파일명 패턴으로 추출: '{}'", fileName);
            return fileName;
        }
        Pattern partialPattern = Pattern.compile("([가-힣a-zA-Z0-9_\\s]+_\\d{8})");
        Matcher partialMatcher = partialPattern.matcher(prompt);
        if (partialMatcher.find()) {
            String fileName = partialMatcher.group(1).trim();
            log.info("부분 패턴으로 추출: '{}'", fileName);
            return fileName;
        }
        String fileName = prompt
                .replaceAll("(?i)(상세정보|자세히|더 알고|상세|에 대해|에 대한|의|을|를)", "")
                .trim();
        log.info("기존 방식으로 추출: '{}'", fileName);
        return fileName;
    }

    
}