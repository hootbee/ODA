package com.example.oda.service;

import com.example.oda.config.GeminiProperties;
import com.example.oda.dto.Candidate;
import com.example.oda.dto.Content;
import com.example.oda.dto.GeminiCategoryResponse;
import com.example.oda.dto.Part;
import com.example.oda.entity.PublicData;
import com.example.oda.repository.PublicDataRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.util.List;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromptServiceTest {

    private static MockWebServer mockWebServer;

    @Mock
    private PublicDataRepository publicDataRepository;
    @Mock
    private GeminiProperties geminiProperties;
    @Mock
    private GeminiProperties.Prompt promptProps;

    private final ObjectMapper objectMapper = new ObjectMapper(); // ObjectMapper는 Mock 객체가 아닌 실제 객체 사용
    private PromptService promptService;

    @BeforeAll
    static void setUpAll() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();
    }

    @AfterAll
    static void tearDownAll() throws IOException {
        mockWebServer.shutdown();
    }

    @BeforeEach
    void setUp() {
        String baseUrl = mockWebServer.url("/").toString();
        when(geminiProperties.getBaseUrl()).thenReturn(baseUrl);
        when(geminiProperties.getPrompt()).thenReturn(promptProps);
        when(promptProps.getCategoryInstruction()).thenReturn("카테고리 지시문 %s %s");
        when(promptProps.getRecommendationInstruction()).thenReturn("추천 지시문 %s %s %s");
        when(geminiProperties.getModel()).thenReturn("test-model");
        when(geminiProperties.getApiKey()).thenReturn("test-api-key");

        promptService = new PromptService(publicDataRepository, geminiProperties, objectMapper, WebClient.builder());
    }

    // DTO 객체를 받아 완벽한 Mock 응답 JSON 문자열을 만들어주는 헬퍼 메소드
    private String createMockResponseJson(String responseText) throws JsonProcessingException {
        Part part = new Part();
        part.setText(responseText);
        Content content = new Content();
        content.setParts(List.of(part));
        Candidate candidate = new Candidate();
        candidate.setContent(content);
        GeminiCategoryResponse response = new GeminiCategoryResponse();
        response.setCandidates(List.of(candidate));

        return objectMapper.writeValueAsString(response);
    }


    @Test
    @DisplayName("유효한 카테고리와 데이터가 있을 때 추천 목록을 성공적으로 반환해야 한다")
    void processPrompt_shouldReturnRecommendations() throws JsonProcessingException {
        // [Given]
        // 1. 가짜 AI 응답을 DTO와 ObjectMapper를 사용해 안전하게 생성
        String categoryResponseJson = createMockResponseJson("``````");
        String recommendationResponseJson = createMockResponseJson("``````");

        // 2. MockWebServer에 응답들을 순서대로 예약
        mockWebServer.enqueue(new MockResponse().setBody(categoryResponseJson).addHeader("Content-Type", "application/json"));
        mockWebServer.enqueue(new MockResponse().setBody(recommendationResponseJson).addHeader("Content-Type", "application/json"));

        // 3. DB Mocking
        PublicData data1 = new PublicData(1, "서울시 초중고 교육통계", "교육");
        PublicData data2 = new PublicData(2, "청소년 경제교육 자료", "교육");
        when(publicDataRepository.findByCategory("교육")).thenReturn(List.of(data1, data2));

        // [When]
        Mono<List<String>> resultMono = promptService.processPrompt("초등학생 교육 데이터 찾아줘");

        // [Then]
        StepVerifier.create(resultMono)
                .expectNext(List.of("서울시 초중고 교육통계", "청소년 경제교육 자료"))
                .verifyComplete();
    }
}
