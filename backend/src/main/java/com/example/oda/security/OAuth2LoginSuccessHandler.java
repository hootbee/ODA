// security/OAuth2LoginSuccessHandler.java
package com.example.oda.security;

import com.example.oda.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public OAuth2LoginSuccessHandler(JwtService jwtService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // 사용자 정보 추출
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        // JWT 토큰 생성
        String token = jwtService.createToken(email, name, picture);

        // 사용자 정보 구성
        Map<String, Object> userInfo = Map.of(
                "email", email != null ? email : "",
                "name", name != null ? name : "",
                "picture", picture != null ? picture : "",
                "authenticated", true
        );

        // React 앱으로 리다이렉트 (토큰과 사용자 정보 포함)
        String redirectUrl = String.format(
                "http://localhost:3000/login/success?token=%s&user=%s",
                token,
                java.net.URLEncoder.encode(objectMapper.writeValueAsString(userInfo), "UTF-8")
        );

        response.sendRedirect(redirectUrl);
    }
}
