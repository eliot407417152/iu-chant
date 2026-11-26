package com.example.iuchant.album;

import com.example.iuchant.album.AlbumDtos.AlbumDto;
import com.example.iuchant.album.AlbumDtos.AlbumMetaRequest;
import com.example.iuchant.album.AlbumDtos.SongSummaryDto;
import com.example.iuchant.song.Song;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AlbumService {

    private final AlbumRepository repo;
    private final AlbumCoverRepository covers;
    private final DeletedAlbumRepository deleted;

    public AlbumService(AlbumRepository repo, AlbumCoverRepository covers, DeletedAlbumRepository deleted) {
        this.repo = repo;
        this.covers = covers;
        this.deleted = deleted;
    }

    /** 刪除整張專輯（連同底下所有歌曲、影片、歌詞與上傳的封面），並記下它的代稱，重啟時不會被 catalog.json 補回來 */
    @Transactional
    public void delete(String slug) {
        Album a = repo.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到專輯：" + slug));
        covers.findByAlbumId(a.getId()).ifPresent(covers::delete);
        repo.delete(a);
        if (!deleted.existsById(slug)) deleted.save(new DeletedAlbum(slug));
    }

    /** 依發行日期由舊到新 */
    @Transactional(readOnly = true)
    public List<AlbumDto> list() {
        return repo.findAll(Sort.by("releaseDate", "id")).stream().map(this::toDto).toList();
    }

    /** 修改專輯基本資料（slug 與封面不變） */
    @Transactional
    public AlbumDto updateMeta(String slug, AlbumMetaRequest req) {
        Album a = repo.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到專輯：" + slug));
        a.setTitle(req.title().trim());
        a.setTypeLabel(req.typeLabel().trim());
        a.setType(req.type());
        a.setReleaseDate(req.releaseDate());
        a.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        return toDto(repo.save(a));
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
