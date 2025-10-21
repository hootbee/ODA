package com.example.oda.prompt;

import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.ChatSession;
import com.example.oda.entity.MessageSender;
import com.example.oda.entity.PublicData;
import com.example.oda.prompt.dto.*;
import com.example.oda.repository.ChatMessageRepository;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.prompt.handlers.PromptHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PromptServiceImpl implements PromptService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final WebClient webClient;
    private final SearchService searchService;
    private final ObjectMapper objectMapper;
    private final List<PromptHandler> promptHandlers;

    public PromptServiceImpl(ChatMessageRepository chatMessageRepository, ChatSessionRepository chatSessionRepository, WebClient.Builder webClientBuilder, SearchService searchService, ObjectMapper objectMapper, List<PromptHandler> promptHandlers) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.webClient = webClientBuilder.baseUrl("http://agent:3001").build();
        this.searchService = searchService;
        this.objectMapper = objectMapper;
        this.promptHandlers = promptHandlers;
    }

    @Override
    @Transactional
    public Mono<ChatResponseDto> processPrompt(PromptRequestDto dto, Authentication authentication) {
        final String prompt = dto.getPrompt();
        final Long sessionId = dto.getSessionId();
        final String reqLastDataName = dto.getLastDataName();

        String email = getEmail(authentication);
        if (email == null) {
            return Mono.error(new IllegalStateException("사용자 이메일을 찾을 수 없습니다."));
        }

        return Mono.fromCallable(() -> {
                    ChatSession session = (sessionId == null)
                            ? createSession(prompt, email)
                            : chatSessionRepository.findById(sessionId).orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다: " + sessionId));
                    String effectiveLastDataName = (reqLastDataName == null || reqLastDataName.isBlank()) ? session.getLastDataName() : reqLastDataName;
                    return new SessionData(session, effectiveLastDataName, prompt, email);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(sessionData -> {
                    // 1. 특정 명령어 핸들러가 있는지 먼저 확인
                    Optional<PromptHandler> commandHandler = promptHandlers.stream()
                            .filter(h -> h.canHandle(sessionData.prompt(), sessionData.lastDataName()))
                            .findFirst();

                    Mono<JsonNode> responseMono;
                    if (commandHandler.isPresent()) {
                        // 2. 명령어 핸들러가 있으면 해당 핸들러로 처리
                        log.info("명령어 감지. 핸들러로 위임: {}", commandHandler.get().getClass().getSimpleName());
                        responseMono = commandHandler.get().handle(sessionData.session(), sessionData.prompt(), sessionData.lastDataName());
                    } else {
                        // 3. 없으면 AI 에이전트로 위임 (기본 검색 로직)
                        log.info("일반 검색 요청. AI 에이전트로 위임...");
                        responseMono = delegateToAIAgent(sessionData.prompt());
                    }

                    return responseMono.flatMap(jsonResponse -> {
                        saveSingleChatMessage(sessionData.session(), sessionData.email(), MessageSender.USER, sessionData.prompt());
                        saveSingleChatMessage(sessionData.session(), sessionData.email(), MessageSender.BOT, jsonResponse.toPrettyString());
                        return Mono.just(new ChatResponseDto(jsonResponse, sessionData.session().getId(), sessionData.session().getSessionTitle(), sessionData.session().getLastDataName()));
                    });
                });
    }

    private Mono<JsonNode> delegateToAIAgent(String prompt) {
        String targetUrl = "http://agent:3001/api/search-hybrid";
        log.info("[Backend] Attempting to call AI Agent at: {}", targetUrl);
        log.info("[Backend] Sending prompt: '{}'", prompt);

        return this.webClient.post()
                .uri("/api/search-hybrid")
                .bodyValue(Map.of("prompt", prompt))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .doOnSuccess(response -> log.info("[Backend] Successfully received response from AI Agent."))
                .onErrorResume(error -> {
                    // WebClient에서 발생하는 모든 오류(네트워크, 4xx/5xx 상태 코드 등)를 여기서 일괄 처리합니다.
                    log.error("[Backend] An error occurred while communicating with the AI Agent: {}", error.getMessage());

                    // 사용자 요청에 따라, 다운로드 실패 관련 오류 메시지를 생성합니다.
                    ObjectNode errorNode = objectMapper.createObjectNode();
                    errorNode.put("type", "error");
                    errorNode.put("message", "다운로드할 CSV 파일을 찾을 수 없습니다. 파일이 존재하지 않거나 지원하지 않는 형식(예: ZIP)일 수 있습니다.");
                    
                    // 이 JSON 노드를 성공적으로 반환하여, 컨트롤러가 200 OK로 응답하게 합니다.
                    return Mono.just(errorNode);
                });
    }

    @Override
    public Mono<ObjectNode> executePlan(QueryPlanDto plan) {
        log.info("AI 에이전트로부터 받은 계획 실행: {}", plan);

        return Mono.fromCallable(() -> {
            // 1. 데이터 검색 및 필터링
            List<PublicData> allResults = searchService.searchAndFilterData(plan.getKeywords(), plan.getMajorCategory());

            // 2. 중복 제거
            List<PublicData> uniqueResults = searchService.deduplicateResults(allResults);

            // 3. 정렬 (현재는 최신순)
            List<PublicData> sortedResults = searchService.sortResultsByRelevance(uniqueResults, plan.getKeywords(), ""); // prompt는 더 이상 사용되지 않음

            // 4. 결과 JSON 생성
            ObjectNode root = objectMapper.createObjectNode();
            if (sortedResults.isEmpty()) {
                log.warn("최종 검색 결과가 없습니다. 'search_not_found' 메시지를 생성합니다.");
                String regionKeyword = searchService.extractRegionFromKeywords(plan.getKeywords());
                root.put("type", "search_not_found");
                ObjectNode payload = objectMapper.createObjectNode();
                payload.set("failedKeywords", objectMapper.valueToTree(plan.getKeywords()));
                payload.put("suggestedCategory", plan.getMajorCategory());
                payload.put("regionKeyword", regionKeyword);
                root.set("payload", payload);
            } else {
                List<String> resultNames = sortedResults.stream()
                        .map(PublicData::getTitle)
                        .filter(name -> name != null && !name.trim().isEmpty())
                        .limit(plan.getLimit())
                        .collect(Collectors.toList());

                log.info("최종 {}개의 결과를 클라이언트에게 반환합니다. (요청된 개수: {})", resultNames.size(), plan.getLimit());
                root.put("type", "search_results");
                ObjectNode payload = objectMapper.createObjectNode();
                payload.set("results", objectMapper.valueToTree(resultNames));
                payload.put("totalCount", resultNames.size());
                root.set("payload", payload);
            }
            return root;
        }).subscribeOn(Schedulers.boundedElastic());
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
                .lastDataName(session.getLastDataName())
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
