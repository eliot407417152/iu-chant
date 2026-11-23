package com.example.iuchant.backup;

import com.example.iuchant.album.Album;
import com.example.iuchant.album.AlbumRepository;
import com.example.iuchant.album.CoverService;
import com.example.iuchant.backup.BackupDtos.*;
import com.example.iuchant.song.Song;
import com.example.iuchant.song.SongRepository;
import com.example.iuchant.song.SongService;
import com.example.iuchant.song.VideoKind;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 備份：把所有專輯（含上傳的封面）、歌曲、影片、應援歌單順序與各版本歌詞匯出成一個 JSON。
 * 還原：依 slug 新增或覆蓋。備份檔裡沒有的歌曲不會被刪除。
 */
@Service
public class BackupService {

    public static final int FORMAT_VERSION = 1;

    private final AlbumRepository albums;
    private final SongRepository songs;
    private final SongService songService;
    private final CoverService coverService;

    public BackupService(AlbumRepository albums, SongRepository songs, SongService songService,
                         CoverService coverService) {
        this.albums = albums;
        this.songs = songs;
        this.songService = songService;
        this.coverService = coverService;
    }

    @Transactional(readOnly = true)
    public BackupFile export() {
        List<BackupAlbum> out = albums.findAll(Sort.by("releaseDate", "id")).stream().map(this::toBackup).toList();
        return new BackupFile(FORMAT_VERSION, OffsetDateTime.now().toString(), out);
    }

    @Transactional
    public RestoreResult restore(BackupFile file) {
        if (file.version() != FORMAT_VERSION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "不支援的備份版本：" + file.version() + "（需要 " + FORMAT_VERSION + "）");
        }
        int songCount = 0;
        int lineCount = 0;
        for (BackupAlbum a : file.albums()) {
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

            Map<String, Song> existing = new HashMap<>();
            for (Song s : album.getSongs()) existing.put(s.getSlug(), s);

            for (BackupSong bs : a.songs()) {
                Song s = existing.get(bs.slug());
                if (s == null) {
                    if (songs.existsBySlug(bs.slug())) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "歌曲 slug 已被其他專輯使用：" + bs.slug());
                    }
                    s = new Song();
                    s.setSlug(bs.slug());
                    s.setAlbum(album);
                    album.getSongs().add(s);
                }
                s.setTrackNo(bs.trackNo());
                s.setTitle(bs.title());
                s.setDurationSec(bs.durationSec());
                s.setTitleTrack(bs.titleTrack());
                s.setFeaturing(bs.featuring());
                s.setNote(bs.note());
                songService.applyContent(s, bs.chant(), bs.mv(), bs.inst(), bs.live(), bs.chantOrder(), bs.lyrics());
                songCount++;
                lineCount += s.getLines().size();
            }
            album = albums.save(album);
            if (a.coverImage() != null && !a.coverImage().isBlank()) {
                coverService.importDataUrl(album, a.coverImage());
            }
        }
        return new RestoreResult(file.albums().size(), songCount, lineCount);
    }

    private BackupAlbum toBackup(Album a) {
        List<BackupSong> list = a.getSongs().stream().map(this::toBackup).toList();
        return new BackupAlbum(a.getSlug(), a.getTitle(), a.getTypeLabel(), a.getType(), a.getReleaseDate(),
                a.getCoverUrl(), a.getNote(), coverService.exportDataUrl(a), list);
    }

    private BackupSong toBackup(Song s) {
        var v = songService.toVideos(s);
        return new BackupSong(s.getSlug(), s.getTrackNo(), s.getTitle(), s.getDurationSec(), s.isTitleTrack(),
                s.getFeaturing(), s.getNote(), s.getChantOrder(),
                v.chant(), v.mv(), v.inst(), v.live(), songService.toLyrics(s));
    }
}
