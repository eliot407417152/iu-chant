package com.example.iuchant.album;

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
}
