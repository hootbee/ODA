package com.example.oda.auth;

import com.fasterxml.jackson.databind.JsonNode;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import reactor.core.publisher.Mono;

public interface JwtService {
    String createToken(String email, String name, String picture);
    boolean validateToken(String token);
    String getEmailFromToken(String token);
    String getNameFromToken(String token);
    String getPictureFromToken(String token);
    Authentication getAuthentication(String token);
    String resolveToken(HttpServletRequest request);
}
