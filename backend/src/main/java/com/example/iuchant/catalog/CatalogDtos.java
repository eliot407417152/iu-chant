package com.example.iuchant.catalog;

import com.example.iuchant.album.AlbumType;

import java.time.LocalDate;
import java.util.List;

/** seed/catalog.json 與 POST /api/admin/catalog/import 共用的格式 */
public final class CatalogDtos {
    private CatalogDtos() {}

    public record CatalogSong(
            String slug,
            int trackNo,
            String title,
            int durationSec,
            boolean titleTrack,
            String featuring,
            String note,
            Integer chantOrder) {}

    public record CatalogAlbum(
            String slug,
            String title,
            String typeLabel,
            AlbumType type,
            LocalDate releaseDate,
            String coverUrl,
            String note,
            List<CatalogSong> songs) {}
}
