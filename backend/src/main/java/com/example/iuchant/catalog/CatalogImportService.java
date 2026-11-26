package com.example.iuchant.catalog;

import com.example.iuchant.album.Album;
import com.example.iuchant.album.AlbumRepository;
import com.example.iuchant.album.DeletedAlbumRepository;
import com.example.iuchant.catalog.CatalogDtos.CatalogAlbum;
import com.example.iuchant.catalog.CatalogDtos.CatalogSong;
import com.example.iuchant.song.Song;
import com.example.iuchant.song.SongRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 依 slug 新增或更新專輯與歌曲的基本資料。
 * 不會刪除任何東西，也不會動到已經整理好的影片與歌詞。
 */
@Service
public class CatalogImportService {

    private final AlbumRepository albums;
    private final SongRepository songs;
    private final DeletedAlbumRepository deleted;

    public CatalogImportService(AlbumRepository albums, SongRepository songs, DeletedAlbumRepository deleted) {
        this.albums = albums;
        this.songs = songs;
        this.deleted = deleted;
    }

    @Transactional
    public int importCatalog(List<CatalogAlbum> input) {
        int count = 0;
        for (CatalogAlbum a : input) {
            Album album = albums.findBySlug(a.slug()).orElseGet(() -> {
                Album n = new Album();
                n.setSlug(a.slug());
                return n;
            });
            album.setTitle(a.title());
            album.setTypeLabel(a.typeLabel());
            album.setType(a.type());
            album.setReleaseDate(a.releaseDate());
            album.setCoverUrl(a.coverUrl());
            album.setNote(a.note());
            deleted.deleteById(a.slug()); // 手動匯入代表要這張專輯，解除「已刪除」記錄

            Map<String, Song> existing = new HashMap<>();
            for (Song s : album.getSongs()) existing.put(s.getSlug(), s);

            for (CatalogSong cs : a.songs()) {
                Song s = existing.get(cs.slug());
                if (s == null) {
                    if (songs.existsBySlug(cs.slug())) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "歌曲 slug 已被其他專輯使用：" + cs.slug());
                    }
                    s = new Song();
                    s.setSlug(cs.slug());
                    s.setAlbum(album);
                    album.getSongs().add(s);
                    s.setChantOrder(cs.chantOrder()); // 只在新增時設定，不會覆蓋管理員之後的修改
                }
                s.setTrackNo(cs.trackNo());
                s.setTitle(cs.title());
                s.setDurationSec(cs.durationSec());
                s.setTitleTrack(cs.titleTrack());
                s.setFeaturing(cs.featuring());
                s.setNote(cs.note());
                count++;
            }
            albums.save(album);
        }
        return count;
    }
}
