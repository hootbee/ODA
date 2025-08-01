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

    public boolean isDetailRequest(String prompt) {
        String lowerPrompt = prompt.toLowerCase().trim();
        return (lowerPrompt.contains("상세정보") ||
                lowerPrompt.contains("자세히") ||
                lowerPrompt.contains("더 알고") ||
                (lowerPrompt.contains("상세") && !lowerPrompt.contains("데이터"))) &&
                !lowerPrompt.matches(".*\\d+개.*") &&
                !lowerPrompt.contains("제공") &&
                !lowerPrompt.contains("보여") &&
                !lowerPrompt.contains("검색") &&
                !lowerPrompt.contains("찾아");
    }

    public Mono<String> getDataDetails(String prompt) {
        return Mono.fromCallable(() -> {
            String fileDataName = extractFileNameFromPrompt(prompt);
            log.info("상세 정보 조회 요청: '{}'", fileDataName);
            Optional<PublicData> exactMatch = publicDataRepository.findByFileDataName(fileDataName);
            if (exactMatch.isPresent()) {
                return formatDataDetails(exactMatch.get());
            }
            List<PublicData> partialMatches = publicDataRepository.findByFileDataNameContaining(fileDataName);
            if (!partialMatches.isEmpty()) {
                return formatDataDetails(partialMatches.get(0));
            }
            return "❌ 해당 파일명을 찾을 수 없습니다: " + fileDataName;
        });
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

    private String formatDataDetails(PublicData data) {
        StringBuilder details = new StringBuilder();
        details.append("📋 데이터 상세 정보\n");
        details.append("═".repeat(50)).append("\n\n");
        details.append("📄 파일명: ").append(data.getFileDataName() != null ? data.getFileDataName() : "정보 없음").append("\n\n");
        details.append("🏷️ 제목: ").append(data.getTitle() != null ? data.getTitle() : "정보 없음").append("\n\n");
        details.append("📂 분류체계: ").append(data.getClassificationSystem() != null ? data.getClassificationSystem() : "정보 없음").append("\n\n");
        details.append("🏢 제공기관: ").append(data.getProviderAgency() != null ? data.getProviderAgency() : "정보 없음").append("\n\n");
        details.append("📅 수정일: ").append(data.getModifiedDate() != null ? data.getModifiedDate().toString() : "정보 없음").append("\n\n");
        details.append("📎 확장자: ").append(data.getFileExtension() != null ? data.getFileExtension() : "정보 없음").append("\n\n");
        details.append("🔑 키워드: ").append(data.getKeywords() != null ? data.getKeywords() : "정보 없음").append("\n\n");
        if (data.getDescription() != null && !data.getDescription().trim().isEmpty()) {
            details.append("📝 상세 설명:\n");
            details.append("-".repeat(30)).append("\n");
            details.append(data.getDescription()).append("\n");
        } else {
            details.append("📝 상세 설명: 정보 없음\n");
        }
        return details.toString();
    }
}