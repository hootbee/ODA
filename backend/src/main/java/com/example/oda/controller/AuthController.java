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
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
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
                // JWT에 name 클레임을 추가했으므로, 필요하다면 JwtService를 통해 name을 가져올 수 있습니다.
                // 여기서는 간단히 email만 반환하거나, 필요시 JwtService를 주입받아 토큰에서 name을 추출할 수 있습니다.
                // 현재는 JWTService가 주입되어 있으므로, 토큰에서 name을 가져오는 로직을 추가할 수 있습니다.
                // 하지만 이 엔드포인트는 주로 인증 여부와 기본 정보만 확인하므로, email만으로도 충분할 수 있습니다.
                // 만약 name과 picture가 반드시 필요하다면, JWT에 해당 정보를 포함시키고 여기서 추출해야 합니다.
                // 예시: name = jwtService.getNameFromToken(jwtService.resolveToken(request)); // request 객체 필요
                // 현재는 request 객체가 없으므로, JWT에 name이 있다면 클레임에서 직접 가져오는 것이 더 적절합니다.
                // 하지만 UserDetails에는 name이나 picture 속성이 직접 없으므로, 여기서는 email만 반환합니다.
                // 프론트엔드에서 name과 picture가 필요하다면, 로그인 시 받은 토큰에서 직접 파싱하거나
                // 백엔드에서 별도의 사용자 정보 조회 API를 제공해야 합니다.
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
