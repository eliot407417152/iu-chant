package com.example.iuchant.album;

import com.example.iuchant.album.AlbumDtos.AlbumDto;
import com.example.iuchant.album.AlbumDtos.AlbumMetaRequest;
import com.example.iuchant.song.SongDtos.SongCreateRequest;
import com.example.iuchant.song.SongDtos.SongDto;
import com.example.iuchant.song.SongService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

/** 管理 API：專輯封面。需要 X-Admin-Key 標頭 */
@RestController
@RequestMapping("/api/admin/albums")
public class AdminAlbumController {

    /** coverUrl 為 null 時不會輸出（Jackson 設定為略過 null） */
    public record CoverResponse(String coverUrl) {}

    private final CoverService covers;
    private final AlbumService albums;
    private final SongService songs;

    public AdminAlbumController(CoverService covers, AlbumService albums, SongService songs) {
        this.covers = covers;
        this.albums = albums;
        this.songs = songs;
    }

    /** 修改專輯的曲名、類別（分類）、發行日期與備註 */
    @PutMapping("/{slug}")
    public AlbumDto updateMeta(@PathVariable String slug, @Valid @RequestBody AlbumMetaRequest request) {
        return albums.updateMeta(slug, request);
    }

    /** 刪除整張專輯（含所有歌曲與歌詞，無法復原；建議先匯出備份） */
    @DeleteMapping("/{slug}")
    public java.util.Map<String, Boolean> delete(@PathVariable String slug) {
        albums.delete(slug);
        return java.util.Map.of("deleted", true);
    }

    /** 在這張專輯新增一首歌 */
    @PostMapping("/{slug}/songs")
    public SongDto addSong(@PathVariable String slug, @Valid @RequestBody SongCreateRequest request) {
        return songs.create(slug, request);
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
