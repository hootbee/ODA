package com.example.oda.service.prompt;

import com.example.oda.dto.*;
import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.ChatMessageRepository;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.service.PromptService;
import com.example.oda.service.QueryPlannerService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PromptServiceImpl implements PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptServiceImpl.class);

    private final QueryPlannerService queryPlannerService;
    private final DetailService detailService;
    private final SearchService searchService;
    private final UtilizationService utilizationService;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ObjectMapper objectMapper;

    public PromptServiceImpl(QueryPlannerService queryPlannerService, DetailService detailService, SearchService searchService, UtilizationService utilizationService, ChatMessageRepository chatMessageRepository, ChatSessionRepository chatSessionRepository, ObjectMapper objectMapper) {
        this.queryPlannerService = queryPlannerService;
        this.detailService = detailService;
        this.searchService = searchService;
        this.utilizationService = utilizationService;
        this.chatMessageRepository = chatMessageRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public Mono<ChatResponseDto> processPrompt(PromptRequestDto requestDto, Authentication authentication) {
        String prompt = requestDto.getPrompt();
        Long sessionId = requestDto.getSessionId();

        String email = getEmailFromAuthentication(authentication);
        if (email == null) {
            return Mono.error(new IllegalStateException("User email could not be extracted from principal."));
        }

        // 1. 세션 찾기 또는 생성
        ChatSession session = (sessionId == null)
                ? createNewSession(prompt, email)
                : chatSessionRepository.findById(sessionId).orElseThrow(() -> new RuntimeException("Session not found"));

        // 2. AI 로직 실행 (기존 로직과 거의 동일)
        Mono<List<String>> responseMono = runAiLogic(prompt);

        // 3. 결과가 나오면 채팅 메시지 저장 및 DTO 반환
        return responseMono.map(responseList -> {
            saveChatMessage(session, email, prompt, responseList);
            return new ChatResponseDto(responseList, session.getId(), session.getSessionTitle());
        });
    }

    private ChatSession createNewSession(String prompt, String email) {
        ChatSession newSession = new ChatSession();
        newSession.setUserEmail(email);
        String title = prompt.length() > 30 ? prompt.substring(0, 30) + "..." : prompt;
        newSession.setSessionTitle(title);
        return chatSessionRepository.save(newSession);
    }

    private void saveChatMessage(ChatSession session, String email, String userMessage, List<String> botResponseList) {
        try {
            String botResponse = objectMapper.writeValueAsString(botResponseList);
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setChatSession(session);
            chatMessage.setUserEmail(email);
            chatMessage.setUserMessage(userMessage);
            chatMessage.setBotResponse(botResponse);
            chatMessageRepository.save(chatMessage);
        } catch (JsonProcessingException e) {
            log.error("Error converting bot response to JSON string", e);
        }
    }

    private Mono<List<String>> runAiLogic(String prompt) {
        log.info("=== 프롬프트 처리 시작 ===");
        log.info("입력 프롬프트: '{}'", prompt);

        if (detailService.isDetailRequest(prompt)) {
            log.info("상세 조회 요청으로 판단");
            return detailService.getDataDetails(prompt)
                    .map(List::of)
                    .doOnNext(result -> log.info("상세 조회 결과 반환: {} 문자", result.get(0).length()));
        }

        log.info("일반 검색 모드로 진행");
        QueryPlanDto queryPlan = queryPlannerService.createQueryPlan(prompt);

        return Mono.just(queryPlan)
                .flatMap(plan -> {
                    log.info("원본 프롬프트: {}", prompt);
                    log.info("추출된 키워드: {}", plan.getKeywords());
                    log.info("AI 분류 결과: {}", plan.getMajorCategory());
                    log.info("결과 개수 제한: {}", plan.getLimit());

                    List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());
                    List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);
                    List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), prompt);

                    log.info("전체 검색 결과 수: {}", sortedResults.size());

                    if (sortedResults.isEmpty()) {
                        String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                        if (regionKeyword != null) {
                            return Mono.just(List.of(
                                    "해당 지역(" + regionKeyword + ")의 데이터가 부족합니다.",
                                    "다른 지역의 유사한 데이터를 참고하거나",
                                    "상위 카테고리(" + plan.getMajorCategory() + ")로 검색해보세요."
                            ));
                        } else {
                            return Mono.just(List.of("해당 조건에 맞는 데이터를 찾을 수 없습니다."));
                        }
                    }

                    List<String> results = sortedResults.stream()
                            .map(PublicData::getFileDataName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .limit(plan.getLimit())
                            .collect(Collectors.toList());

                    if (!results.isEmpty() && results.size() >= 3) {
                        results.add("💡 특정 데이터에 대한 자세한 정보가 필요하시면");
                        results.add("'[파일명] 상세정보' 또는 '[파일명] 자세히'라고 말씀하세요.");
                    }

                    return Mono.just(results);
                })
                .onErrorReturn(List.of("데이터를 조회하는 중 오류가 발생했습니다."));
    }

    @Override
    public Mono<String> getDataDetails(String prompt) {
        return detailService.getDataDetails(prompt);
    }

    @Override
    public Mono<List<String>> getSingleUtilizationRecommendation(SingleUtilizationRequestDto requestDto) {
        return utilizationService.getSingleUtilizationRecommendation(requestDto);
    }

    @Override
    public Mono<JsonNode> getFullUtilizationRecommendations(SingleUtilizationRequestDto requestDto) {
        return utilizationService.getFullUtilizationRecommendations(requestDto);
    }

    @Override
    public Mono<List<ChatHistoryDto>> getChatHistory(Authentication authentication) {
        String email = getEmailFromAuthentication(authentication);
        if (email == null) {
            return Mono.empty();
        }

        return Mono.fromCallable(() -> {
            List<ChatSession> sessions = chatSessionRepository.findByUserEmailOrderByCreatedAtDesc(email);
            return sessions.stream().map(this::mapSessionToHistoryDto).collect(Collectors.toList());
        });
    }

    private ChatHistoryDto mapSessionToHistoryDto(ChatSession session) {
        List<ChatMessage> messages = chatMessageRepository.findByChatSessionOrderByCreatedAtAsc(session);
        List<ChatMessageDto> messageDtos = messages.stream().map(message -> {
            // 여기에서 JSON 문자열로 된 botResponse를 파싱해야 합니다.
            // 간소화를 위해 일단 그대로 전달하거나, 혹은 파싱 로직을 추가합니다.
            return ChatMessageDto.builder()
                    .userMessage(message.getUserMessage())
                    .botResponse(message.getBotResponse()) // 실제로는 파싱 필요
                    .createdAt(message.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());

        return ChatHistoryDto.builder()
                .sessionId(session.getId())
                .sessionTitle(session.getSessionTitle())
                .messages(messageDtos)
                .build();
    }

    private String getEmailFromAuthentication(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User) {
            return ((OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof org.springframework.security.core.userdetails.User) {
            return ((org.springframework.security.core.userdetails.User) principal).getUsername();
        }
        return null;
    }

    @Override
    public Mono<List<ChatMessage>> getPromptHistory(Authentication authentication) {
        String email = getEmailFromAuthentication(authentication);
        if (email != null) {
            return Mono.fromCallable(() -> chatMessageRepository.findByUserEmailOrderByCreatedAtAsc(email))
                    .doOnSuccess(history -> log.info("Successfully fetched chat history for user {}", email));
        }
        return Mono.empty();
    }
}

