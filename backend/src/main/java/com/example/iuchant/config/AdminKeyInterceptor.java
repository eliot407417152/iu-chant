package com.example.iuchant.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** 最簡單的管理保護：標頭 X-Admin-Key 必須等於設定檔的 app.admin-key */
@Component
public class AdminKeyInterceptor implements HandlerInterceptor {

    private final byte[] key;

    public AdminKeyInterceptor(@Value("${app.admin-key}") String key) {
        this.key = key.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true; // CORS 預檢請求不帶金鑰
        }
        String given = request.getHeader("X-Admin-Key");
        if (given == null || !MessageDigest.isEqual(key, given.getBytes(StandardCharsets.UTF_8))) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "缺少或錯誤的 X-Admin-Key");
            return false;
        }
        return true;
    }
}
