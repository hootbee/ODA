package com.example.oda.service.prompt;

import com.example.oda.dto.*;
import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.ChatMessageRepository;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.service.PromptService;
import com.example.oda.service.QueryPlannerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromptServiceImpl implements PromptService {

    private final QueryPlannerService   queryPlannerService;
    private final DetailService         detailService;
    private final SearchService         searchService;
    private final UtilizationService    utilizationService;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ObjectMapper          objectMapper;

    /* ================================================================ */
    /*                             프롬프트 처리                         */
    /* ================================================================ */
    @Override
    @Transactional
    public Mono<ChatResponseDto> processPrompt(PromptRequestDto dto,
                                               Authentication authentication) {

        final String prompt    = dto.getPrompt();
        final Long   sessionId = dto.getSessionId();
        final String reqLastDataName = dto.getLastDataName();

        log.info("=== 프롬프트 처리 시작 ===");
        log.info("입력 프롬프트: '{}'", prompt);
        log.info("세션 ID: {}", sessionId);
        log.info("요청에서 받은 lastDataName: {}", reqLastDataName);

        String email = getEmail(authentication);
        if (email == null) {
            return Mono.error(new IllegalStateException("사용자 이메일을 찾을 수 없습니다."));
        }

        // 블로킹 JPA 호출을 별도 스레드에서 처리
        return Mono.fromCallable(() -> {
                    ChatSession session = (sessionId == null)
                            ? createSession(prompt, email)
                            : chatSessionRepository.findById(sessionId)
                            .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다: " + sessionId));

                    /* 세션에서 lastDataName 복구 */
                    String effectiveLastDataName = (reqLastDataName == null || reqLastDataName.isBlank())
                            ? session.getLastDataName()
                            : reqLastDataName;

                    log.info("최종 lastDataName: {}", effectiveLastDataName);

                    return new SessionData(session, effectiveLastDataName, prompt, email);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(this::dispatchByMode);
    }

    /* ================================================================ */
    /*                    모드 결정 & 분기 (핵심 로직)                    */
    /* ================================================================ */
    private Mono<ChatResponseDto> dispatchByMode(SessionData sessionData) {
        ChatSession session = sessionData.session();
        String lastDataName = sessionData.lastDataName();
        String prompt = sessionData.prompt();
        String email = sessionData.email();

        Mono<JsonNode> responseMono;

        /* ===== 새로운 분기 로직 ===== */

        // 1️⃣ "다른 데이터 조회" 명령어 체크 → lastDataName만 해제하고 안내 메시지
        if (isNewSearchCommand(prompt)) {
            log.info("새로운 검색 명령어 감지 - lastDataName 해제");
            session.setLastDataName(null);
            chatSessionRepository.save(session);

            // ✅ 실제 검색하지 않고 안내 메시지만 반환
            List<String> resetMessage = List.of(
                    "🔄 데이터 선택이 해제되었습니다.",
                    "새로운 데이터를 검색하고 싶으시면 원하는 키워드를 입력해주세요.",
                    "예: '서울시 교통 데이터', '부산 관광 정보' 등"
            );
            responseMono = Mono.just(objectMapper.valueToTree(resetMessage));

            // 2️⃣ lastDataName이 있으면 → 모든 질문을 해당 데이터 기반으로 처리
        } else if (lastDataName != null && !lastDataName.isBlank()) {
            log.info("데이터 활용 모드 - lastDataName: {}", lastDataName);

            if (prompt.toLowerCase().contains("전체 활용")) {
                log.info("전체 활용 분기 실행");
                responseMono = buildFullUtilMono(lastDataName);

            } else if (containsTraditionalUtilKeyword(prompt)) {
                log.info("전통적 활용 키워드 분기 실행");
                responseMono = buildSingleUtilMono(lastDataName, prompt);

            } else if (prompt.contains("상세") || prompt.contains("자세히")) {
                log.info("상세 정보 분기 실행");
                String fileName = prompt.replace("상세", "").replace("자세히", "").trim();
                session.setLastDataName(fileName);
                chatSessionRepository.save(session);
                responseMono = detailService.getDataDetails(prompt)
                        .map(text -> objectMapper.createArrayNode().add(text));

            } else {
                // 🎯 핵심: 자유로운 질문도 해당 데이터 기반으로 처리
                log.info("맞춤형 활용 분기 실행 - 사용자 질문: '{}'", prompt);
                responseMono = buildCustomUtilMono(lastDataName, prompt);
            }

            // 3️⃣ lastDataName이 없으면 → 일반 검색
        } else {
            log.info("일반 검색 모드 실행");
            responseMono = runSearchLogic(prompt, session);
        }

        return responseMono.flatMap(json -> {
            log.info("최종 응답 JSON: {}", json.toPrettyString());
            saveChatMessage(session, email, prompt, json);
            return Mono.just(new ChatResponseDto(
                    json,
                    session.getId(),
                    session.getSessionTitle(),
                    session.getLastDataName()));
        });
    }

    /* ================================================================ */
    /*                           헬퍼 메서드                            */
    /* ================================================================ */

    /**
     * "다른 데이터 조회" 같은 새 검색 명령어 체크
     */
    private boolean isNewSearchCommand(String prompt) {
        String lower = prompt.toLowerCase();
        return lower.contains("다른 데이터") ||
                lower.contains("새로운 데이터") ||
                lower.contains("다른 정보") ||
                lower.contains("새 검색") ||
                lower.contains("새로운 검색") ||
                lower.contains("다른 자료") ||
                lower.matches(".*다른.*조회.*") ||
                lower.matches(".*새로.*찾.*") ||
                lower.matches(".*다시.*검색.*");
    }

    /**
     * 기존 5가지 패턴 (전체/비즈니스/연구/정책/도구)
     */
    private boolean containsTraditionalUtilKeyword(String p) {
        String s = p.toLowerCase();
        return s.matches(".*(비즈니스 활용|연구 활용|정책 활용|데이터 결합|분석 도구).*") ||
                s.matches(".*(business 활용|research 활용|policy 활용|combination 활용|tool 활용).*");
    }

    /**
     * 전체 활용방안 (대시보드)
     */
    private Mono<JsonNode> buildFullUtilMono(String fileName) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

    /**
     * 전통적 단일 활용방안 (비즈니스/연구/정책/도구)
     */
    private Mono<JsonNode> buildSingleUtilMono(String fileName, String analysisType) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(analysisType);
        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(objectMapper::valueToTree);
    }

    /**
     * 🎯 맞춤형 활용방안 - 자유로운 질문을 해당 데이터 기반으로 처리
     */
    private Mono<JsonNode> buildCustomUtilMono(String fileName, String userPrompt) {
        log.info("맞춤형 활용방안 생성 - 파일: {}, 질문: {}", fileName, userPrompt);

        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(userPrompt);  // 사용자의 자유로운 질문 전달

        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(objectMapper::valueToTree);
    }

    /**
     * 일반 검색 로직
     */
    private Mono<JsonNode> runSearchLogic(String prompt, ChatSession session) {
        log.info("일반 검색 모드로 진행");

        try {
            QueryPlanDto plan = queryPlannerService.createQueryPlan(prompt);

            log.info("원본 프롬프트: {}", prompt);
            log.info("추출된 키워드: {}", plan.getKeywords());
            log.info("AI 분류 결과: {}", plan.getMajorCategory());
            log.info("결과 개수 제한: {}", plan.getLimit());

            List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());
            List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);
            List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), prompt);

            log.info("전체 검색 결과 수: {}", sortedResults.size());

            List<String> results;

            if (sortedResults.isEmpty()) {
                String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                if (regionKeyword != null) {
                    results = List.of(
                            "해당 지역(" + regionKeyword + ")의 데이터가 부족합니다.",
                            "다른 지역의 유사한 데이터를 참고하거나",
                            "상위 카테고리(" + plan.getMajorCategory() + ")로 검색해보세요."
                    );
                } else {
                    results = List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다.");
                }
            } else {
                results = sortedResults.stream()
                        .map(PublicData::getFileDataName)
                        .filter(name -> name != null && !name.trim().isEmpty())
                        .limit(plan.getLimit())
                        .collect(Collectors.toList());

                // 첫 번째 결과를 세션에 저장
                if (!results.isEmpty()) {
                    session.setLastDataName(results.get(0));
                    chatSessionRepository.save(session);
                    log.info("세션에 lastDataName 저장: {}", results.get(0));
                }

                if (!results.isEmpty() && results.size() >= 3) {
                    List<String> mutableResults = new java.util.ArrayList<>(results);
                    mutableResults.add("💡 특정 데이터에 대한 자세한 정보가 필요하시면");
                    mutableResults.add("'[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.");
                    mutableResults.add("🔍 데이터 활용방안이 궁금하시면 '전체 활용'이라고 말씀하세요.");
                    results = mutableResults;
                }
            }

            JsonNode jsonNode = objectMapper.valueToTree(results);
            return Mono.just(jsonNode);

        } catch (Exception e) {
            log.error("검색 중 오류 발생", e);
            return Mono.just(objectMapper.valueToTree(
                    List.of("데이터를 조회하는 중 오류가 발생했습니다.")));
        }
    }


    /**
     * 새로운 세션 생성
     */
    private ChatSession createSession(String prompt, String email) {
        ChatSession session = new ChatSession();
        session.setUserEmail(email);
        String title = prompt.length() > 30 ? prompt.substring(0, 30) + "..." : prompt;
        session.setSessionTitle(title);
        return chatSessionRepository.save(session);
    }

    /**
     * 채팅 메시지 저장
     */
    private void saveChatMessage(ChatSession session, String email,
                                 String userMessage, JsonNode botResponseNode) {
        try {
            String botResponse = objectMapper.writeValueAsString(botResponseNode);
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setChatSession(session);
            chatMessage.setUserEmail(email);
            chatMessage.setUserMessage(userMessage);
            chatMessage.setBotResponse(botResponse);
            chatMessageRepository.save(chatMessage);
            log.info("채팅 메시지 저장 완료 - 사용자: {}", email);
        } catch (Exception e) {
            log.error("채팅 메시지 저장 실패", e);
        }
    }

    /**
     * 인증에서 이메일 추출
     */
    private String getEmail(Authentication auth) {
        if (auth == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof OAuth2User user) {
            return user.getAttribute("email");
        }
        if (principal instanceof org.springframework.security.core.userdetails.User user) {
            return user.getUsername();
        }
        return null;
    }

    /* ================================================================ */
    /*                     인터페이스 기본 구현                          */
    /* ================================================================ */

    /** 상세 정보 */
    @Override
    public Mono<String> getDataDetails(String prompt) {
        return detailService.getDataDetails(prompt);
    }

    /** 단일 활용 */
    @Override
    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto dto) {
        return utilizationService.getSingleUtilizationRecommendation(dto);
    }

    /** 전체 활용 */
    @Override
    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto dto) {
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

    /** 세션 목록 + 최근 메시지 */
    @Override
    public Mono<List<ChatHistoryDto>> getChatHistory(Authentication auth) {
        String email = getEmail(auth);
        if (email == null) return Mono.empty();

        return Mono.fromCallable(() -> chatSessionRepository
                        .findByUserEmailOrderByCreatedAtDesc(email)
                        .stream()
                        .map(this::toHistoryDto)
                        .collect(Collectors.toList()))
                .subscribeOn(Schedulers.boundedElastic());
    }

    /** 전체 프롬프트 로그 */
    @Override
    public Mono<List<ChatMessage>> getPromptHistory(Authentication auth) {
        String email = getEmail(auth);
        if (email == null) return Mono.empty();

        return Mono.fromCallable(() -> chatMessageRepository
                        .findByUserEmailOrderByCreatedAtAsc(email))
                .subscribeOn(Schedulers.boundedElastic())
                .doOnSuccess(history -> log.info("사용자 {}의 프롬프트 히스토리 조회 완료", email));
    }

    /* ===== DTO 변환 및 헬퍼 클래스 ===== */

    private ChatHistoryDto toHistoryDto(ChatSession session) {
        List<ChatMessageDto> messages = chatMessageRepository
                .findByChatSessionOrderByCreatedAtAsc(session)
                .stream()
                .map(message -> ChatMessageDto.builder()
                        .userMessage(message.getUserMessage())
                        .botResponse(message.getBotResponse())
                        .createdAt(message.getCreatedAt())
                        .lastDataName(session.getLastDataName())
                        .build())
                .collect(Collectors.toList());

        return ChatHistoryDto.builder()
                .sessionId(session.getId())
                .sessionTitle(session.getSessionTitle())
                .messages(messages)
                .build();
    }

    /**
     * 세션 데이터 래퍼 클래스 - Record 사용으로 불변성 보장
     */
    private record SessionData(
            ChatSession session,
            String lastDataName,
            String prompt,
            String email
    ) {}
}
