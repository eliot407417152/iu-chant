package com.example.iuchant.album;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** 欄位名稱必須和前端 lib/types.ts 一致 */
public final class AlbumDtos {
    private AlbumDtos() {}

    public record SongSummaryDto(
            String id,
            int trackNo,
            String title,
            int durationSec,
            boolean isTitleTrack,
            String featuring,
            String note,
            boolean hasChant,
            boolean hasVideo,
            Integer chantOrder) {}

    public record AlbumDto(
            String id,
            String title,
            String typeLabel,
            AlbumType type,
            LocalDate releaseDate,
            String coverUrl,
            String note,
            List<SongSummaryDto> songs) {}

    /** 管理端：修改專輯的基本資料。type 決定首頁屬於哪個分類（正規／迷你／單曲／翻唱／OST） */
    public record AlbumMetaRequest(
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 50) String typeLabel,
            @NotNull AlbumType type,
            @NotNull LocalDate releaseDate,
            @Size(max = 300) String note) {}
}
