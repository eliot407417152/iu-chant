package com.example.iuchant.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 管理員登入時用來驗證金鑰：金鑰正確回 200，錯誤由 AdminKeyInterceptor 回 401 */
@RestController
public class AdminPingController {

    @GetMapping("/api/admin/ping")
    public Map<String, Boolean> ping() {
        return Map.of("ok", true);
    }
}
