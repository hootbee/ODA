package com.example.oda.service;

import org.springframework.stereotype.Service;

@Service
public class PromptService {

    public String processPrompt(String prompt) {
    // 여기에 실제 비즈니스 로직(LLM 연동 등)이 들어갑니다.
    // 지금은 프롬프트가 잘 도착했는지 확인하기 위해 콘솔에 출력합니다.
    System.out.println("Received prompt in service: " + prompt);

    // 클라이언트에게 보낼 응답을 생성합니다.
    String responseMessage = "AI가 프롬프트: '" + prompt + "'에 대해 답변을 생성중입니다...";
    return responseMessage;
}
}
