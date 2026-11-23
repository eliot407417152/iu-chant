package com.example.iuchant.album;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

/** 管理 API：專輯封面。需要 X-Admin-Key 標頭 */
@RestController
@RequestMapping("/api/admin/albums")
public class AdminAlbumController {

    /** coverUrl 為 null 時不會輸出（Jackson 設定為略過 null） */
    public record CoverResponse(String coverUrl) {}

    private final CoverService covers;

    public AdminAlbumController(CoverService covers) {
        this.covers = covers;
    }

    /** 直接把圖片位元組當成請求內容送來，Content-Type 為 image/jpeg、image/png 或 image/webp */
    @PutMapping(value = "/{slug}/cover", consumes = {"image/jpeg", "image/png", "image/webp"})
    public CoverResponse upload(@PathVariable String slug,
                                @RequestHeader(HttpHeaders.CONTENT_TYPE) String contentType,
                                @RequestBody byte[] body) {
        return new CoverResponse(covers.upload(slug, contentType, body));
    }

    @DeleteMapping("/{slug}/cover")
    public CoverResponse remove(@PathVariable String slug) {
        return new CoverResponse(covers.remove(slug));
    }
}
