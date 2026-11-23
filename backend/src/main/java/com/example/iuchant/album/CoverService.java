package com.example.iuchant.album;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.Set;

/** 專輯封面：上傳、移除、讀取，以及備份用的 data URL 轉換 */
@Service
public class CoverService {

    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final AlbumRepository albums;
    private final AlbumCoverRepository covers;

    public CoverService(AlbumRepository albums, AlbumCoverRepository covers) {
        this.albums = albums;
        this.covers = covers;
    }

    @Transactional(readOnly = true)
    public AlbumCover get(String slug) {
        Album album = findAlbum(slug);
        return covers.findByAlbumId(album.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "這張專輯沒有上傳封面"));
    }

    /** 回傳新的封面網址 */
    @Transactional
    public String upload(String slug, String contentType, byte[] data) {
        Album album = findAlbum(slug);
        store(album, contentType, data);
        return AlbumService.coverUrlOf(album);
    }

    /** 移除上傳的封面；回傳之後使用的網址（可能是 coverUrl，也可能是 null） */
    @Transactional
    public String remove(String slug) {
        Album album = findAlbum(slug);
        covers.findByAlbumId(album.getId()).ifPresent(covers::delete);
        album.setCoverVersion(null);
        return AlbumService.coverUrlOf(album);
    }

    /** 備份用：回傳 data URL；沒有上傳過就回 null */
    @Transactional(readOnly = true)
    public String exportDataUrl(Album album) {
        return covers.findByAlbumId(album.getId())
                .map(c -> "data:" + c.getContentType() + ";base64," + Base64.getEncoder().encodeToString(c.getData()))
                .orElse(null);
    }

    /** 備份還原用：album 必須已經存檔（有 id） */
    @Transactional
    public void importDataUrl(Album album, String dataUrl) {
        int comma = dataUrl.indexOf(";base64,");
        if (!dataUrl.startsWith("data:") || comma < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "封面圖片格式錯誤：" + album.getSlug());
        }
        String type = dataUrl.substring(5, comma);
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(dataUrl.substring(comma + 8));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "封面圖片內容損毀：" + album.getSlug());
        }
        store(album, type, bytes);
    }

    private void store(Album album, String contentType, byte[] data) {
        String type = contentType == null ? "" : contentType.split(";")[0].trim().toLowerCase();
        if (!TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "只接受 JPEG、PNG、WebP 圖片");
        }
        if (data == null || data.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "圖片是空的");
        }
        if (data.length > AlbumCover.MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "圖片不能超過 1 MB");
        }
        AlbumCover cover = covers.findByAlbumId(album.getId()).orElseGet(() -> {
            AlbumCover n = new AlbumCover();
            n.setAlbumId(album.getId());
            return n;
        });
        cover.setContentType(type);
        cover.setData(data);
        covers.save(cover);
        album.setCoverVersion(System.currentTimeMillis());
        albums.save(album);
    }

    private Album findAlbum(String slug) {
        return albums.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到專輯：" + slug));
    }
}
