package com.example.iuchant.song;

import com.example.iuchant.song.SongDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class SongService {

    private final SongRepository repo;

    public SongService(SongRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public SongDto get(String slug) {
        return toDto(find(slug));
    }

    /** 整批取代這首歌的影片與各版本歌詞；歌曲本身（曲名、專輯）由目錄匯入維護 */
    @Transactional
    public SongDto updateContent(String slug, SongContentRequest req) {
        Song song = find(slug);
        applyContent(song, req.chant(), req.mv(), req.inst(), req.live(), req.chantOrder(), req.lyrics());
        return toDto(repo.save(song));
    }

    /** 把影片、應援歌單順序與歌詞寫進 Song（不存檔）。管理頁儲存與備份還原共用 */
    public void applyContent(Song song, VideoDto chant, VideoDto mv, VideoDto inst, VideoDto live,
                             Integer chantOrder, LyricsDto lyrics) {
        song.setChantVideo(chant == null ? null : chant.id());
        song.setChantOffset(chant == null ? 0 : chant.offsetSec());
        song.setMvVideo(mv == null ? null : mv.id());
        song.setMvOffset(mv == null ? 0 : mv.offsetSec());
        song.setInstVideo(inst == null ? null : inst.id());
        song.setInstOffset(inst == null ? 0 : inst.offsetSec());
        song.setLiveVideo(live == null ? null : live.id());
        song.setLiveOffset(live == null ? 0 : live.offsetSec());
        song.setChantOrder(chantOrder);

        song.getLines().clear();
        boolean hasChant = false;
        for (VideoKind kind : VideoKind.values()) {
            List<LyricLineDto> sorted = (lyrics == null ? List.<LyricLineDto>of() : lyrics.of(kind)).stream()
                    .sorted(Comparator.comparingDouble(LyricLineDto::startSec))
                    .toList();
            int no = 1;
            for (LyricLineDto d : sorted) {
                LyricLine l = new LyricLine();
                l.setSong(song);
                l.setVideoKind(kind);
                l.setLineNo(no++);
                l.setStartSec(d.startSec());
                l.setText(d.text());
                l.setRoman(blankToNull(d.roman()));
                l.setSub(blankToNull(d.sub()));
                l.setChantType(d.chant());
                if (d.chant() != null) hasChant = true;
                song.getLines().add(l);
            }
        }
        song.setHasChant(hasChant);
    }

    private Song find(String slug) {
        return repo.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到歌曲：" + slug));
    }

    private SongDto toDto(Song s) {
        return new SongDto(s.getSlug(), s.getTitle(), s.getAlbum().getSlug(), s.getAlbum().getTitle(),
                s.getAlbum().getReleaseDate(), s.getFeaturing(), toVideos(s), s.getChantOrder(), toLyrics(s));
    }

    public VideosDto toVideos(Song s) {
        return new VideosDto(
                video(s.getChantVideo(), s.getChantOffset()),
                video(s.getMvVideo(), s.getMvOffset()),
                video(s.getInstVideo(), s.getInstOffset()),
                video(s.getLiveVideo(), s.getLiveOffset()));
    }

    /** 依版本分組；舊資料（沒有版本）歸在應援版本。每個版本依 lineNo 排序 */
    public LyricsDto toLyrics(Song s) {
        return new LyricsDto(linesOf(s, VideoKind.CHANT), linesOf(s, VideoKind.MV),
                linesOf(s, VideoKind.INST), linesOf(s, VideoKind.LIVE));
    }

    private List<LyricLineDto> linesOf(Song s, VideoKind kind) {
        return s.getLines().stream()
                .filter(l -> l.effectiveKind() == kind)
                .sorted(Comparator.comparingInt(LyricLine::getLineNo))
                .map(this::toDto)
                .toList();
    }

    private static VideoDto video(String id, double offset) {
        return id == null ? null : new VideoDto(id, offset);
    }

    private LyricLineDto toDto(LyricLine l) {
        return new LyricLineDto(l.getStartSec(), l.getText(), l.getRoman(), l.getSub(), l.getChantType());
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
