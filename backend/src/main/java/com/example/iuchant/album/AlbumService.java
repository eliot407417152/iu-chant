package com.example.iuchant.album;

import com.example.iuchant.album.AlbumDtos.AlbumDto;
import com.example.iuchant.album.AlbumDtos.SongSummaryDto;
import com.example.iuchant.song.Song;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AlbumService {

    private final AlbumRepository repo;

    public AlbumService(AlbumRepository repo) {
        this.repo = repo;
    }

    /** 依發行日期由舊到新 */
    @Transactional(readOnly = true)
    public List<AlbumDto> list() {
        return repo.findAll(Sort.by("releaseDate", "id")).stream().map(this::toDto).toList();
    }

    private AlbumDto toDto(Album a) {
        List<SongSummaryDto> songs = a.getSongs().stream().map(this::toDto).toList();
        return new AlbumDto(a.getSlug(), a.getTitle(), a.getTypeLabel(), a.getType(),
                a.getReleaseDate(), coverUrlOf(a), a.getNote(), songs);
    }

    /** 有上傳過封面就用上傳的（網址帶版本，換圖後瀏覽器會重新載入）；否則用 coverUrl */
    public static String coverUrlOf(Album a) {
        if (a.getCoverVersion() != null) {
            return "/api/albums/" + a.getSlug() + "/cover?v=" + a.getCoverVersion();
        }
        return a.getCoverUrl();
    }

    private SongSummaryDto toDto(Song s) {
        return new SongSummaryDto(s.getSlug(), s.getTrackNo(), s.getTitle(), s.getDurationSec(),
                s.isTitleTrack(), s.getFeaturing(), s.getNote(), s.isHasChant(),
                s.hasAnyVideo(), s.getChantOrder());
    }
}
