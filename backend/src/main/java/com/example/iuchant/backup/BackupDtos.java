package com.example.iuchant.backup;

import com.example.iuchant.album.AlbumType;
import com.example.iuchant.song.SongDtos.LyricsDto;
import com.example.iuchant.song.SongDtos.PlainDto;
import com.example.iuchant.song.SongDtos.VideoDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** 備份檔格式（一個 JSON 檔）。匯出與匯入共用 */
public final class BackupDtos {
    private BackupDtos() {}

    public record BackupSong(
            @NotBlank String slug,
            int trackNo,
            @NotBlank String title,
            int durationSec,
            boolean titleTrack,
            String featuring,
            String note,
            Integer chantOrder,
            @Valid VideoDto chant,
            @Valid VideoDto mv,
            @Valid VideoDto inst,
            @Valid VideoDto live,
            @Valid LyricsDto lyrics,
            /** 「只有歌詞」的版本；舊備份檔沒有這個欄位，視為每個版本都要打點 */
            PlainDto plain) {}

    public record BackupAlbum(
            @NotBlank String slug,
            @NotBlank String title,
            @NotBlank String typeLabel,
            @NotNull AlbumType type,
            @NotNull LocalDate releaseDate,
            String coverUrl,
            String note,
            /** 管理員上傳的封面，data URL（data:image/jpeg;base64,...）；沒有上傳就省略 */
            String coverImage,
            @NotNull @Valid List<BackupSong> songs) {}

    public record BackupFile(
            int version,
            String exportedAt,
            @NotNull @Valid List<BackupAlbum> albums) {}

    public record RestoreResult(int albums, int songs, int lyricLines) {}
}
