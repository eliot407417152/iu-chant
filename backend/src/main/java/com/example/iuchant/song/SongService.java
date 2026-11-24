package com.example.iuchant.song;

import com.example.iuchant.song.SongDtos.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class SongService {

    private final SongRepository repo;
    private static final ObjectMapper JSON = new ObjectMapper();

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
            List<LyricLineDto> given = lyrics == null ? List.<LyricLineDto>of() : lyrics.of(kind);
            // 全部都打好點才依時間排序；還有草稿行（startSec < 0）時照編輯器的順序存，才不會把行順序打亂
            boolean draft = given.stream().anyMatch(d -> d.startSec() < 0);
            List<LyricLineDto> sorted = draft
                    ? given
                    : given.stream().sorted(Comparator.comparingDouble(LyricLineDto::startSec)).toList();
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
                l.setRichJson(segsToJson(d.segs()));
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
        return new LyricLineDto(l.getStartSec(), l.getText(), l.getRoman(), l.getSub(), l.getChantType(),
                jsonToSegs(l.getRichJson()));
    }

    /** 只有真的有顏色時才存；全部都是預設色就當成沒有 */
    private static String segsToJson(List<SegDto> segs) {
        if (segs == null || segs.stream().noneMatch(g -> (g.color() != null && !g.color().isBlank()) || (g.note() != null && !g.note().isBlank()))) return null;
        try {
            String json = JSON.writeValueAsString(segs);
            return json.length() <= 2000 ? json : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static List<SegDto> jsonToSegs(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return JSON.readValue(json, new TypeReference<List<SegDto>>() {});
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
