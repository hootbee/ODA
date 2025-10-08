package com.example.oda.prompt;

import com.example.oda.prompt.dto.QueryPlanDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;            // ★ 추가
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class QueryPlannerServiceImpl implements QueryPlannerService {

    // 도메인 키워드 매핑을 Set으로 (중복 제거 + contains O(1))
    private final Map<String, Set<String>> categoryKeywords = new HashMap<>();

    public QueryPlannerServiceImpl() {

        categoryKeywords.put("보건", new HashSet<>(Arrays.asList(
                "보건", "의료", "병원", "건강", "질병", "감염병", "코로나", "백신", "의약", "검진", "진료"
        )));

        categoryKeywords.put("문화/관광", new HashSet<>(Arrays.asList(
                "문화", "관광", "축제", "전시", "공연", "예술", "박물관", "문화재", "체육", "여행", "명소"
        )));

        categoryKeywords.put("산업/경제", new HashSet<>(Arrays.asList(
                "산업", "경제", "기업", "창업", "제조", "무역", "고용", "중소기업", "시장", "소비", "투자", "금융"
        )));

        categoryKeywords.put("복지", new HashSet<>(Arrays.asList(
                "복지", "사회복지", "돌봄", "노인", "아동", "장애인", "저소득", "보육", "생활지원", "복지관"
        )));

        categoryKeywords.put("환경", new HashSet<>(Arrays.asList(
                "환경", "대기", "수질", "오염", "폐기물", "기후", "탄소", "생태", "미세먼지", "에너지", "녹지"
        )));

        categoryKeywords.put("교육", new HashSet<>(Arrays.asList(
                "교육", "학교", "대학", "학생", "교사", "학습", "연구", "도서관", "교과", "평가"
        )));

        categoryKeywords.put("일반행정", new HashSet<>(Arrays.asList(
                "행정", "정책", "민원", "공무원", "정부", "자치", "법령", "시청", "구청", "제도"
        )));

        categoryKeywords.put("교통", new HashSet<>(Arrays.asList(
                "교통", "도로", "버스", "지하철", "철도", "신호등", "주차", "교통안전", "교통사고", "물류", "대중교통"
        )));

        categoryKeywords.put("인구/가구", new HashSet<>(Arrays.asList(
                "인구", "가구", "출생", "사망", "인구통계", "이동", "통계", "세대", "인구수", "연령대"
        )));

        categoryKeywords.put("안전", new HashSet<>(Arrays.asList(
                "안전", "재난", "재해", "방재", "방범", "치안", "응급", "소방", "사고", "대피", "위험"
        )));

        categoryKeywords.put("도시관리", new HashSet<>(Arrays.asList(
                "도시", "지역", "개발", "도시계획", "시설", "도로관리", "조경", "인프라", "구역", "공원"
        )));

        categoryKeywords.put("주택/건설", new HashSet<>(Arrays.asList(
                "주택", "건설", "부동산", "재개발", "건축", "아파트", "임대", "주거", "토지", "건축물"
        )));
    }

    @Override
    public QueryPlanDto createQueryPlan(String prompt) {
        log.info("===== Query Plan 생성 시작: 원본 프롬프트 =====\n{}", prompt);
        long startTime = System.currentTimeMillis();

        String majorCategory = extractMajorCategory(prompt);
        List<String> keywords = extractKeywords(prompt);
        Integer searchYear = extractYear(prompt);
        String providerAgency = extractAgency(prompt);
        boolean hasDateFilter = hasDateRelatedTerms(prompt);
        int limit = extractLimit(prompt);

        QueryPlanDto plan = new QueryPlanDto(majorCategory, keywords, searchYear, providerAgency, hasDateFilter, limit);

        long endTime = System.currentTimeMillis();
        log.info("===== Query Plan 생성 완료 ({}ms 소요) =====\n{}", (endTime - startTime), plan);

        return plan;
    }

    private int extractLimit(String prompt) {
        String lowerPrompt = prompt.toLowerCase();
        Pattern pattern = Pattern.compile("(\\d+)\\s*개"); // \d, \s
        Matcher matcher = pattern.matcher(prompt);
        int limit = 12; // Default
        if (matcher.find()) {
            try {
                limit = Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        } else if (lowerPrompt.contains("많이")) {
            limit = 20;
        } else if (lowerPrompt.contains("간단히") || lowerPrompt.contains("요약")) {
            limit = 5;
        }
        log.debug("[QueryPlan] Limit 추출: {}개", limit);
        return limit;
    }

    private String extractMajorCategory(String prompt) {
        String lowerPrompt = prompt.toLowerCase();
        String bestMatch = null;
        long highestScore = 0;

        for (Map.Entry<String, Set<String>> entry : categoryKeywords.entrySet()) {
            long score = entry.getValue().stream().filter(k -> lowerPrompt.contains(k.toLowerCase())).count();
            if (score > highestScore) {
                highestScore = score;
                bestMatch = entry.getKey();
            }
        }
        String result = bestMatch != null ? bestMatch : "기타";
        log.debug("[QueryPlan] Major Category 추출: {} (점수: {})", result, highestScore);
        return result;
    }

    private List<String> extractKeywords(String prompt) {
        List<String> all = new ArrayList<>();
        all.addAll(extractDomainKeywords(prompt));
        all.addAll(extractRegions(prompt));
        all.addAll(extractYears(prompt));
        all.addAll(extractGeneralKeywords(prompt, all)); // excludeWords 역할

        List<String> finalKeywords = all.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().collect(Collectors.toList());
        log.debug("[QueryPlan] 최종 키워드 추출: {}", finalKeywords);
        return finalKeywords;
    }

    private List<String> extractDomainKeywords(String prompt) {
        Map<String, Set<String>> domainPatterns = new HashMap<>();
        domainPatterns.put("교통", new HashSet<>(Arrays.asList("교통", "교통사고", "교통안전", "도로안전", "사고예방")));
        domainPatterns.put("안전", new HashSet<>(Arrays.asList("안전", "보안", "방범", "치안", "안전사고")));
        domainPatterns.put("연구", new HashSet<>(Arrays.asList("프로젝트", "연구", "분석", "조사", "개발")));
        domainPatterns.put("시민", new HashSet<>(Arrays.asList("시민", "주민", "시민안전", "공공안전", "생활안전")));
        domainPatterns.put("환경", new HashSet<>(Arrays.asList("환경", "대기질", "수질", "오염", "기후")));
        domainPatterns.put("문화", new HashSet<>(Arrays.asList("문화", "관광", "축제", "문화재", "박물관")));
        domainPatterns.put("복지", new HashSet<>(Arrays.asList("복지", "돌봄", "보육", "노인", "장애인")));
        domainPatterns.put("데이터", new HashSet<>(Arrays.asList("공공데이터", "데이터", "정보", "자료")));

        List<String> found = new ArrayList<>();
        String lower = prompt.toLowerCase();

        for (Set<String> set : domainPatterns.values()) {
            for (String kw : set) {
                if (lower.contains(kw.toLowerCase())) {
                    found.add(kw);
                }
            }
        }
        log.debug("[QueryPlan] 도메인 키워드 추출: {}", found);
        return found;
    }

    private List<String> extractRegions(String prompt) {
        List<String> regions = Arrays.asList(
                "서울","부산","대구","인천","광주","대전","울산","세종",
                "경기","강원","충북","충남","전북","전남","경북","경남","제주","서구"
        );
        List<String> found = regions.stream().filter(prompt::contains).distinct().collect(Collectors.toList());
        log.debug("[QueryPlan] 지역 키워드 추출: {}", found);
        return found;
    }

    private List<String> extractYears(String prompt) {
        Pattern pattern = Pattern.compile("(\\d{4})"); // \d
        Matcher matcher = pattern.matcher(prompt);
        List<String> years = new ArrayList<>();
        while (matcher.find()) {
            int y = Integer.parseInt(matcher.group(1));
            if (y >= 2000 && y <= 2035) years.add(String.valueOf(y));
        }
        int currentYear = Calendar.getInstance().get(Calendar.YEAR);
        if (prompt.contains("작년")) years.add(String.valueOf(currentYear - 1));
        if (prompt.contains("올해") || prompt.contains("금년") || prompt.contains("최근") || prompt.contains("최신"))
            years.add(String.valueOf(currentYear));

        List<String> found = years.stream().distinct().collect(Collectors.toList());
        log.debug("[QueryPlan] 연도 키워드 추출: {}", found);
        return found;
    }

    private List<String> extractGeneralKeywords(String prompt, List<String> excludeWords) {
        // 불용어 + 이미 추출된 단어를 Set에 합치기
        Set<String> stop = new HashSet<>(Arrays.asList(
                "관련","대한","있는","그","이","저","것","에","를","와","과","의","년",
                "데이터","정보","자료","나는","내가","우리","어떤","어느","무엇","뭐",
                "하기","위해서","하려면","하고있어","찾고있어","좋을까","것이","것을",
                "현황","시설","업체","목록"
        ));
        stop.addAll(excludeWords);

        // 유니코드 문자/숫자/공백만 남기기
        String cleaned = prompt
                .replaceAll("[의가을를에서와과년]", " ")
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ");

        List<String> found = Arrays.stream(cleaned.split("\s+")) // \s+
                .map(String::trim)
                .filter(s -> s.length() >= 2)
                .filter(s -> !stop.contains(s))
                .distinct()
                .limit(3)
                .collect(Collectors.toList());
        log.debug("[QueryPlan] 일반 키워드 추출 (제외단어: {}): {}", excludeWords, found);
        return found;
    }

    private Integer extractYear(String prompt) {
        Pattern pattern = Pattern.compile("(\\d{4})"); // \d
        Matcher matcher = pattern.matcher(prompt);
        Integer year = null;
        if (matcher.find()) {
            int parsedYear = Integer.parseInt(matcher.group(1));
            if (parsedYear >= 2000 && parsedYear <= 2035) year = parsedYear;
        }
        if (year == null) {
            int currentYear = Calendar.getInstance().get(Calendar.YEAR);
            if (prompt.contains("작년")) year = currentYear - 1;
            else if (prompt.contains("올해") || prompt.contains("금년") || prompt.contains("최근") || prompt.contains("최신"))
                year = currentYear;
        }
        log.debug("[QueryPlan] 검색 연도 추출: {}", year);
        return year;
    }

    private String extractAgency(String prompt) {
        String lower = prompt.toLowerCase();
        Map<String, String> agencies = new HashMap<>();
        agencies.put("인천", "인천광역시서구");
        agencies.put("대구", "대구광역시서구");
        agencies.put("서울", "서울특별시");
        agencies.put("부산", "부산광역시");
        agencies.put("대전", "대전광역시");
        agencies.put("광주", "광주광역시");
        agencies.put("울산", "울산광역시");
        agencies.put("세종", "세종특별자치시");
        agencies.put("경기", "경기도");
        agencies.put("강원", "강원도");
        agencies.put("충북", "충청북도");
        agencies.put("충남", "충청남도");
        agencies.put("전북", "전라북도");
        agencies.put("전남", "전라남도");
        agencies.put("경북", "경상북도");
        agencies.put("경남", "경상남도");
        agencies.put("제주", "제주특별자치도");

        String agency = "기타기관";
        for (Map.Entry<String, String> e : agencies.entrySet()) {
            if (lower.contains(e.getKey())) {
                agency = e.getValue();
                break;
            }
        }
        log.debug("[QueryPlan] 제공 기관 추출: {}", agency);
        return agency;
    }

    private boolean hasDateRelatedTerms(String prompt) {
        List<String> dateTerms = Arrays.asList(
                "최근","최신","2023","2024","2025","작년","올해","업데이트","갱신","신규","새로운","최근 몇 년","최근 몇개월"
        );
        boolean hasDateTerm = dateTerms.stream().anyMatch(prompt::contains);
        log.debug("[QueryPlan] 날짜 관련 키워드 포함 여부: {}", hasDateTerm);
        return hasDateTerm;
    }
}

