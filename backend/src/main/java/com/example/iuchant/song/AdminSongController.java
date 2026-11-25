package com.example.iuchant.song;

import com.example.iuchant.song.SongDtos.ChantListRequest;
import com.example.iuchant.song.SongDtos.SongContentRequest;
import com.example.iuchant.song.SongDtos.SongDto;
import com.example.iuchant.song.SongDtos.SongMetaRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    /** 修改清單上的基本資料：曲名、曲序、時長、主打、Feat.、備註，或搬到別張專輯 */
    @PutMapping("/{slug}/meta")
    public SongDto updateMeta(@PathVariable String slug, @Valid @RequestBody SongMetaRequest request) {
        return service.updateMeta(slug, request);
    }

    @DeleteMapping("/{slug}")
    public Map<String, Boolean> delete(@PathVariable String slug) {
        service.delete(slug);
        return Map.of("deleted", true);
    }

    /** 整批設定應援歌單的內容與順序 */
    @PutMapping("/chant-list")
    public Map<String, Integer> setChantList(@Valid @RequestBody ChantListRequest request) {
        return Map.of("count", service.setChantList(request.songs()));
    }
}
