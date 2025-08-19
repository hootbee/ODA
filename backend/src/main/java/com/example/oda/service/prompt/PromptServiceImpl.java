package com.example.oda.service.prompt;

import com.example.oda.dto.*;
import com.example.oda.entity.ChatMessage;
import com.example.oda.entity.MessageSender;
import com.example.oda.entity.ChatSession;
import com.example.oda.repository.ChatMessageRepository;
import com.example.oda.repository.ChatSessionRepository;
import com.example.oda.service.PromptService;
import com.example.oda.service.prompt.handlers.PromptHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class PromptServiceImpl implements PromptService {

    private final DetailService         detailService;
    private final UtilizationService    utilizationService;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ObjectMapper          objectMapper;
    private final List<PromptHandler>   promptHandlers;

    public PromptServiceImpl(DetailService detailService, UtilizationService utilizationService, ChatMessageRepository chatMessageRepository, ChatSessionRepository chatSessionRepository, ObjectMapper objectMapper, List<PromptHandler> promptHandlers) {
        this.detailService = detailService;
        this.utilizationService = utilizationService;
        this.chatMessageRepository = chatMessageRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.objectMapper = objectMapper;
        this.promptHandlers = promptHandlers;
    }

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

        System.out.println("========================================================");
        System.out.println("[PromptServiceImpl] Received new prompt.");
        System.out.println("[PromptServiceImpl] User Input (Prompt): " + prompt);
        System.out.println("[PromptServiceImpl] Request DTO lastDataName: " + reqLastDataName);

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

                    System.out.println("[PromptServiceImpl] Session lastDataName (before logic): " + session.getLastDataName());

                    /* 세션에서 lastDataName 복구 */
                    String effectiveLastDataName = (reqLastDataName == null || reqLastDataName.isBlank())
                            ? session.getLastDataName()
                            : reqLastDataName;

                    log.info("최종 lastDataName: {}", effectiveLastDataName);
                    System.out.println("[PromptServiceImpl] Effective lastDataName for dispatch: " + effectiveLastDataName);

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

        PromptHandler handler = promptHandlers.stream()
                .filter(h -> h.canHandle(prompt, lastDataName))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("처리할 수 있는 핸들러를 찾을 수 없습니다."));

        System.out.println("[PromptServiceImpl] Dispatching to handler: " + handler.getClass().getSimpleName());

        return handler.handle(session, prompt, lastDataName).flatMap(json -> {
            log.info("최종 응답 JSON: {}", json.toPrettyString());
            saveSingleChatMessage(session, email, MessageSender.USER, prompt);
            saveSingleChatMessage(session, email, MessageSender.BOT, json.toPrettyString());

            System.out.println("[PromptServiceImpl] Session lastDataName (after handler execution): " + session.getLastDataName());
            System.out.println("========================================================");

            return Mono.just(new ChatResponseDto(
                    json,
                    session.getId(),
                    session.getSessionTitle(),
                    session.getLastDataName()
            ));
        });
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