package com.example.iuchant.song;

import com.example.iuchant.song.SongDtos.SongContentRequest;
import com.example.iuchant.song.SongDtos.SongDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/** 管理 API：需要 X-Admin-Key 標頭，見 AdminKeyInterceptor */
@RestController
@RequestMapping("/api/admin/songs")
public class AdminSongController {

    private final SongService service;

    public AdminSongController(SongService service) {
        this.service = service;
    }

    /** 補上或更新一首歌的 YouTube 影片、歌詞與應援法 */
    @PutMapping("/{slug}/content")
    public SongDto updateContent(@PathVariable String slug, @Valid @RequestBody SongContentRequest request) {
        return service.updateContent(slug, request);
    }
}
