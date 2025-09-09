package com.example.oda.prompt;

import com.example.oda.prompt.dto.QueryPlanDto;
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
public class QueryPlannerServiceImpl implements QueryPlannerService {

    // 도메인 키워드 매핑을 Set으로 (중복 제거 + contains O(1))
    private final Map<String, Set<String>> categoryKeywords = new HashMap<>();

    public QueryPlannerServiceImpl() {
        categoryKeywords.put("교통및물류", new HashSet<>(Arrays.asList("교통", "도로", "지하철", "버스", "물류", "주차", "교통사고", "신호등", "교통안전", "도로안전", "사고예방")));
        categoryKeywords.put("공공질서및안전", new HashSet<>(Arrays.asList("안전", "보안", "방범", "치안", "안전사고", "시민안전", "공공안전", "생활안전")));
        categoryKeywords.put("문화체육관광", new HashSet<>(Arrays.asList("문화재", "관광", "체육", "문화", "박물관", "공연", "축제", "예술")));
        categoryKeywords.put("환경", new HashSet<>(Arrays.asList("환경", "대기", "수질", "폐기물", "오염", "녹지", "생태", "기후")));
        categoryKeywords.put("교육", new HashSet<>(Arrays.asList("교육", "학교", "대학", "학습", "도서관", "연구", "학생", "교사")));
        categoryKeywords.put("보건", new HashSet<>(Arrays.asList("보건", "병원", "의료", "건강", "질병", "의약", "코로나", "백신")));
        categoryKeywords.put("사회복지", new HashSet<>(Arrays.asList("복지", "어린이", "노인", "장애", "저소득", "돌봄", "보육", "복지관")));
        categoryKeywords.put("산업·통상·중소기업", new HashSet<>(Arrays.asList("산업", "기업", "창업", "경제", "무역", "중소기업", "공장", "제조업")));
        categoryKeywords.put("일반공공행정", new HashSet<>(Arrays.asList("행정", "민원", "공무원", "정책", "규제", "법령", "시청", "구청")));
        categoryKeywords.put("재정·세제·금융", new HashSet<>(Arrays.asList("재정", "세금", "금융", "예산", "투자", "경제", "세무", "은행"))); // ★ 괄호 수정
        categoryKeywords.put("지역개발", new HashSet<>(Arrays.asList("개발", "도시", "지역", "건설", "인프라", "택지", "재개발", "도시계획")));
        categoryKeywords.put("농림", new HashSet<>(Arrays.asList("농업", "임업", "농산물", "산림", "축산", "어업", "농가", "농촌")));
    }

    @Override
    public QueryPlanDto createQueryPlan(String prompt) {
        String majorCategory = extractMajorCategory(prompt);
        List<String> keywords = extractKeywords(prompt);
        Integer searchYear = extractYear(prompt);
        String providerAgency = extractAgency(prompt);
        boolean hasDateFilter = hasDateRelatedTerms(prompt);
        int limit = extractLimit(prompt);

        return new QueryPlanDto(majorCategory, keywords, searchYear, providerAgency, hasDateFilter, limit);
    }

    private int extractLimit(String prompt) {
        String lowerPrompt = prompt.toLowerCase();
        Pattern pattern = Pattern.compile("(\\d+)\\s*개"); // \\d, \\s
        Matcher matcher = pattern.matcher(prompt);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        if (lowerPrompt.contains("많이")) return 20;
        if (lowerPrompt.contains("간단히") || lowerPrompt.contains("요약")) return 5;
        return 12;
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
        return bestMatch != null ? bestMatch : "기타";
    }

    private List<String> extractKeywords(String prompt) {
        List<String> all = new ArrayList<>();
        all.addAll(extractDomainKeywords(prompt));
        all.addAll(extractRegions(prompt));
        all.addAll(extractYears(prompt));
        all.addAll(extractGeneralKeywords(prompt, all)); // excludeWords 역할

        return all.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().collect(Collectors.toList());
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
        return found;
    }

    private List<String> extractRegions(String prompt) {
        List<String> regions = Arrays.asList(
                "서울","부산","대구","인천","광주","대전","울산","세종",
                "경기","강원","충북","충남","전북","전남","경북","경남","제주","서구"
        );
        return regions.stream().filter(prompt::contains).distinct().collect(Collectors.toList());
    }

    private List<String> extractYears(String prompt) {
        Pattern pattern = Pattern.compile("(\\d{4})"); // \\d
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
        return years.stream().distinct().collect(Collectors.toList());
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

        return Arrays.stream(cleaned.split("\\s+")) // \\s+
                .map(String::trim)
                .filter(s -> s.length() >= 2)
                .filter(s -> !stop.contains(s))
                .distinct()
                .limit(3)
                .collect(Collectors.toList());
    }

    private Integer extractYear(String prompt) {
        Pattern pattern = Pattern.compile("(\\d{4})"); // \\d
        Matcher matcher = pattern.matcher(prompt);
        if (matcher.find()) {
            int year = Integer.parseInt(matcher.group(1));
            if (year >= 2000 && year <= 2035) return year;
        }
        int currentYear = Calendar.getInstance().get(Calendar.YEAR);
        if (prompt.contains("작년")) return currentYear - 1;
        if (prompt.contains("올해") || prompt.contains("금년") || prompt.contains("최근") || prompt.contains("최신"))
            return currentYear;
        return null;
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

        for (Map.Entry<String, String> e : agencies.entrySet()) {
            if (lower.contains(e.getKey())) return e.getValue();
        }
        return "기타기관";
    }

    private boolean hasDateRelatedTerms(String prompt) {
        List<String> dateTerms = Arrays.asList(
                "최근","최신","2023","2024","2025","작년","올해","업데이트","갱신","신규","새로운","최근 몇 년","최근 몇개월"
        );
        return dateTerms.stream().anyMatch(prompt::contains);
    }
}
