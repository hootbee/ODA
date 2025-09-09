package com.example.oda.prompt;

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
public class DetailServiceImpl implements DetailService {

    private static final Logger log = LoggerFactory.getLogger(DetailServiceImpl.class);
    private final PublicDataRepository publicDataRepository;

    public DetailServiceImpl(PublicDataRepository publicDataRepository) {
        this.publicDataRepository = publicDataRepository;
    }

    @Override
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

        // 예: "광주광역시 남구_전기차 등록 현황_20250311"
        // - 광역시/특별시/특별자치시 등도 고려
        // - 중간 공백 허용, '남구/동구/서구/북구' 등 구/군/시 단위 허용
        // - 가운데 제목 부분은 언더스코어 전까지 한 덩어리
        // - 끝은 정확히 8자리 날짜
        Pattern fullFilePattern = Pattern.compile(
                "([가-힣A-Za-z0-9]+\\s*(?:광역시|특별시|특별자치시)\\s*[가-힣]+(?:구|군|시)_[^_]+_\\d{8})"
        );
        Matcher fullMatcher = fullFilePattern.matcher(prompt);
        if (fullMatcher.find()) {
            String fileName = fullMatcher.group(1).trim();
            log.info("완전한 파일명 패턴으로 추출: '{}'", fileName);
            return fileName;
        }

        // 부분 패턴: "…_YYYYMMDD" 꼬리를 가진 경우를 넓게 매칭
        Pattern partialPattern = Pattern.compile("([가-힣A-Za-z0-9_\\s]+_\\d{8})");
        Matcher partialMatcher = partialPattern.matcher(prompt);
        if (partialMatcher.find()) {
            String fileName = partialMatcher.group(1).trim();
            log.info("부분 패턴으로 추출: '{}'", fileName);
            return fileName;
        }

        // 마지막 폴백: 불필요 문구 제거 후 트림
        String fileName = prompt
                .replaceAll("(?i)(상세정보|자세히|더\\s*알고|상세|에\\s*대해|에\\s*대한|의|을|를)", "")
                .trim();
        log.info("폴백 방식으로 추출: '{}'", fileName);
        return fileName;
    }
}
