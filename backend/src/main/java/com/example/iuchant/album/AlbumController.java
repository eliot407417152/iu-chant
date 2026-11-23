package com.example.iuchant.album;

import com.example.iuchant.album.AlbumDtos.AlbumDto;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/albums")
public class AlbumController {

    private final AlbumService service;
    private final CoverService covers;

    public AlbumController(AlbumService service, CoverService covers) {
        this.service = service;
        this.covers = covers;
    }

    @GetMapping
    public List<AlbumDto> list() {
        return service.list();
    }

    /** 管理員上傳的封面圖。網址帶 ?v=版本，所以可以放心長期快取 */
    @GetMapping("/{slug}/cover")
    public ResponseEntity<byte[]> cover(@PathVariable String slug) {
        AlbumCover c = covers.get(slug);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(c.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(c.getData());
    }
}
