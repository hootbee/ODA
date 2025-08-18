// controller/AuthController.java
package com.example.oda.controller;

import com.example.oda.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AuthController {

    private final JwtService jwtService;

    @Autowired
    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Google OAuth2 로그인 시작
     */
    @GetMapping("/google")
    public ResponseEntity<Map<String, String>> googleLogin() {
        return ResponseEntity.ok(Map.of(
                "loginUrl", "/oauth2/authorization/google",
                "message", "Google 로그인 페이지로 이동하세요"
        ));
    }

    /**
     * 현재 사용자 정보 반환
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication, HttpServletRequest request) {
        if (authentication != null && authentication.isAuthenticated()) {
            String email = null;
            String name = null;
            String picture = null;

            Object principal = authentication.getPrincipal();

            if (principal instanceof OAuth2User) {
                OAuth2User oAuth2User = (OAuth2User) principal;
                email = oAuth2User.getAttribute("email");
                name = oAuth2User.getAttribute("name");
                picture = oAuth2User.getAttribute("picture");
            } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                // JWT 인증을 통해 들어온 경우
                email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
                String token = jwtService.resolveToken(request);
                if (token != null) {
                    name = jwtService.getNameFromToken(token);
                    picture = jwtService.getPictureFromToken(token);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "email", email != null ? email : "정보 없음",
                    "name", name != null ? name : "정보 없음",
                    "picture", picture != null ? picture : "정보 없음",
                    "authenticated", true
            ));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", false,
                "message", "인증되지 않은 사용자입니다"
        ));
    }

    /**
     * JWT 토큰 검증
     */
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestBody Map<String, String> request) {
        String token = request.get("token");

        if (token != null && jwtService.validateToken(token)) {
            String email = jwtService.getEmailFromToken(token);
            String name = jwtService.getNameFromToken(token);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "email", email,
                    "name", name
            ));
        }

        return ResponseEntity.ok(Map.of("valid", false));
    }

    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "성공적으로 로그아웃되었습니다"
        ));
    }
}
