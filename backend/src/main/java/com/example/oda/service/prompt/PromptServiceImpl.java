package com.example.oda.service.prompt;

import com.example.oda.dto.*;
import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.MessageSender;
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

        // ✅ JsonNode 대신 바로 ChatResponseDto를 반환하는 구조로 변경
        return processRequest(session, lastDataName, prompt, email);
    }

    /**
     * ✅ 요청 처리 및 ChatResponseDto 반환을 하나의 메서드로 통합
     */
    private Mono<ChatResponseDto> processRequest(ChatSession session, String lastDataName, String prompt, String email) {
        Mono<JsonNode> responseMono;

        /* ===== 분기 로직 ===== */

        // 1️⃣ "/도움말" 명령어 체크
        if (prompt.equals("/도움말")) {
            log.info("도움말 명령어 감지");
            List<String> helpMessage = List.of(
                    "안녕하세요! 저는 공공 데이터를 찾고 활용하는 것을 돕는 AI 챗봇입니다.",
                    "다음과 같이 질문해보세요:",
                    "• 특정 데이터 검색: '서울시 교통 데이터 보여줘'",
                    "• 데이터 상세 정보: '[파일명] 자세히' 또는 '[파일명] 상세정보'",
                    "• 데이터 활용 방안: '[파일명] 전체 활용' 또는 '[파일명] 비즈니스 활용'",
                    "• 새로운 데이터 검색 시작: '다른 데이터 조회'",
                    "• 현재 대화 초기화: '새 대화' (프론트엔드 기능)"
            );
            responseMono = Mono.just(objectMapper.valueToTree(helpMessage));

        // 2️⃣ "다른 데이터 조회" 명령어 체크
        } else if (isNewSearchCommand(prompt)) {
            log.info("새로운 검색 명령어 감지 - lastDataName 해제");
            session.setLastDataName(null);
            chatSessionRepository.save(session);

            List<String> resetMessage = List.of(
                    "🔄 데이터 선택이 해제되었습니다.",
                    "새로운 데이터를 검색하고 싶으시면 원하는 키워드를 입력해주세요.",
                    "예: '서울시 교통 데이터', '부산 관광 정보' 등"
            );
            responseMono = Mono.just(objectMapper.valueToTree(resetMessage));

        // 2️⃣ "상세" 또는 "자세히" 명령어 체크 (lastDataName 유무와 상관없이 먼저 처리)
        } else if (prompt.contains("상세") || prompt.contains("자세히")) {
            log.info("상세 정보 분기 실행 (우선 처리)");
            responseMono = processDetailRequest(session, prompt);

        // 3️⃣ lastDataName이 있으면 → 데이터 활용 모드
        } else if (lastDataName != null && !lastDataName.isBlank()) {
            log.info("데이터 활용 모드 - lastDataName: {}", lastDataName);

            if (prompt.toLowerCase().contains("전체 활용")) {
                log.info("전체 활용 분기 실행");
                responseMono = buildFullUtilMono(lastDataName);

            } else if (containsTraditionalUtilKeyword(prompt)) {
                log.info("전통적 활용 키워드 분기 실행");
                responseMono = buildSingleUtilMono(lastDataName, prompt);

            } else {
                log.info("맞춤형 활용 분기 실행 - 사용자 질문: '{}'", prompt);
                responseMono = buildCustomUtilMono(lastDataName, prompt);
            }

        // 4️⃣ lastDataName이 없으면 → 일반 검색
        } else {
            log.info("일반 검색 모드 실행");
            responseMono = runSearchLogic(prompt, session);
        }

        // ✅ JsonNode를 받아서 ChatResponseDto로 변환 후 반환
        return responseMono.flatMap(json -> {
            log.info("최종 응답 JSON: {}", json.toPrettyString());

            // 메시지 저장
            saveSingleChatMessage(session, email, MessageSender.USER, prompt);
            saveSingleChatMessage(session, email, MessageSender.BOT, json.toPrettyString());

            // ChatResponseDto 생성 및 반환
            ChatResponseDto responseDto = new ChatResponseDto(
                    json,
                    session.getId(),
                    session.getSessionTitle(),
                    session.getLastDataName()
            );

            return Mono.just(responseDto);
        });
    }

    /**
     * ✅ 상세 정보 요청 처리 메서드 분리
     */
    private Mono<JsonNode> processDetailRequest(ChatSession session, String prompt) {
        String extractedFileName = prompt.replace("상세", "").replace("자세히", "").trim();
        String effectiveFileName;

        if (extractedFileName.isEmpty() || extractedFileName.equals("---")) {
            effectiveFileName = session.getLastDataName();
            if (effectiveFileName == null || effectiveFileName.isBlank()) {
                log.warn("상세 정보 요청에 파일명이 없으며, 세션에 lastDataName도 설정되어 있지 않습니다.");
                return Mono.just(objectMapper.valueToTree(List.of("어떤 데이터의 상세 정보를 원하시는지 파일명을 함께 알려주세요.")));
            }
            log.info("세션의 lastDataName '{}'을(를) 사용하여 상세 정보 조회", effectiveFileName);
        } else {
            effectiveFileName = extractedFileName;
            log.info("프롬프트에서 추출된 파일명 '{}'을(를) 사용하여 상세 정보 조회", effectiveFileName);
        }

        session.setLastDataName(effectiveFileName);
        chatSessionRepository.save(session);

        return detailService.getDataDetails(effectiveFileName)
                .map(detailText -> {
                    String hint = "\n\n" +
                                          "💡 이 데이터를 어떻게 활용하고 싶으신가요? 자유롭게 질문해주세요!\n" +
                                          "예시:\n" +
                                          "• \"전체 활용\" - 모든 활용방안 대시보드 🔍\n" +
                                          "• \"해외 사례와 연관 지어 활용\"\n" +
                                          "• \"[특정 목적]을 위한 활용\" - 예: \"마케팅 전략 수립을 위한 활용\"\n" +
                                          "• \"이 데이터 CSV 파일 보여줘\" - (아직 구현되지 않았지만) CSV 파일 내용을 직접 확인";
                    return objectMapper.createArrayNode().add(detailText + hint);
                });
    }

    /* ================================================================ */
    /*                           헬퍼 메서드                            */
    /* ================================================================ */

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

    private boolean containsTraditionalUtilKeyword(String p) {
        String s = p.toLowerCase();
        return s.matches(".*(비즈니스 활용|연구 활용|정책 활용|데이터 결합|분석 도구).*") ||
                s.matches(".*(business 활용|research 활용|policy 활용|combination 활용|tool 활용).*");
    }

    private Mono<JsonNode> buildFullUtilMono(String fileName) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

    private Mono<JsonNode> buildSingleUtilMono(String fileName, String analysisType) {
        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(analysisType);
        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(recommendations -> {
                    List<String> combined = new java.util.ArrayList<>(recommendations);
                    combined.add("\n\n💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.");
                    return objectMapper.valueToTree(combined);
                });
    }

    private Mono<JsonNode> buildCustomUtilMono(String fileName, String userPrompt) {
        log.info("맞춤형 활용방안 생성 - 파일: {}, 질문: {}", fileName, userPrompt);

        SingleUtilizationRequestDto dto = new SingleUtilizationRequestDto();
        SingleUtilizationRequestDto.DataInfo dataInfo = new SingleUtilizationRequestDto.DataInfo();
        dataInfo.setFileName(fileName);
        dto.setDataInfo(dataInfo);
        dto.setAnalysisType(userPrompt);

        return utilizationService.getSingleUtilizationRecommendation(dto)
                .map(recommendations -> {
                    List<String> combined = new java.util.ArrayList<>(recommendations);
                    combined.add("\n\n💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.");
                    return objectMapper.valueToTree(combined);
                });
    }

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

                if (!results.isEmpty()) {
                    String hintMessage = "\n\n💡 특정 데이터에 대한 자세한 정보가 필요하시면\n'[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.";
                    int lastIndex = results.size() - 1;
                    results.set(lastIndex, results.get(lastIndex) + hintMessage);
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

    private ChatSession createSession(String prompt, String email) {
        ChatSession session = new ChatSession();
        session.setUserEmail(email);
        String title = prompt.length() > 30 ? prompt.substring(0, 30) + "..." : prompt;
        session.setSessionTitle(title);
        return chatSessionRepository.save(session);
    }

    private void saveSingleChatMessage(ChatSession session, String email, MessageSender sender, String content) {
        try {
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setChatSession(session);
            chatMessage.setUserEmail(email);
            chatMessage.setSender(sender);
            chatMessage.setContent(content);
            chatMessageRepository.save(chatMessage);
            log.info("채팅 메시지 저장 완료 - 사용자: {}, 발신자: {}", email, sender);
        } catch (Exception e) {
            log.error("채팅 메시지 저장 실패", e);
        }
    }

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

    @Override
    public Mono<String> getDataDetails(String prompt) {
        return detailService.getDataDetails(prompt);
    }

    @Override
    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto dto) {
        return utilizationService.getSingleUtilizationRecommendation(dto);
    }

    @Override
    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto dto) {
        return utilizationService.getFullUtilizationRecommendations(dto);
    }

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

    @Override
    public Mono<List<ChatMessage>> getPromptHistory(Authentication auth) {
        String email = getEmail(auth);
        if (email == null) return Mono.empty();

        return Mono.fromCallable(() -> chatMessageRepository
                        .findByUserEmailOrderByCreatedAtAsc(email))
                .subscribeOn(Schedulers.boundedElastic())
                .doOnSuccess(history -> log.info("사용자 {}의 프롬프트 히스토리 조회 완료", email));
    }

    private ChatHistoryDto toHistoryDto(ChatSession session) {
        List<ChatMessageDto> messages = chatMessageRepository
                .findByChatSessionOrderByCreatedAtAsc(session)
                .stream()
                .map(message -> ChatMessageDto.builder()
                        .sender(message.getSender())
                        .content(message.getContent())
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

    private record SessionData(
            ChatSession session,
            String lastDataName,
            String prompt,
            String email
    ) {}

    @Override
    @Transactional
    public void deleteChatSession(Long sessionId, Authentication authentication) {
        String email = getEmail(authentication);
        if (email == null) {
            throw new IllegalStateException("사용자 이메일을 찾을 수 없습니다.");
        }

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다: " + sessionId));

        if (!session.getUserEmail().equals(email)) {
            throw new SecurityException("세션을 삭제할 권한이 없습니다.");
        }

        chatMessageRepository.deleteByChatSession(session);
        chatSessionRepository.delete(session);
        log.info("세션 ID {} 및 관련 메시지 삭제 완료", sessionId);
    }
}
