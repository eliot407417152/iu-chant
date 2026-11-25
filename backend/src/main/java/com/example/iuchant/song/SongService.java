package com.example.iuchant.song;

import com.example.iuchant.album.Album;
import com.example.iuchant.album.AlbumRepository;
import com.example.iuchant.song.SongDtos.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SongService {

    private final SongRepository repo;
    private final AlbumRepository albums;
    private static final ObjectMapper JSON = new ObjectMapper();

    public SongService(SongRepository repo, AlbumRepository albums) {
        this.repo = repo;
        this.albums = albums;
    }

    @Transactional(readOnly = true)
    public SongDto get(String slug) {
        return toDto(find(slug));
    }

    /** 整批取代這首歌的影片與各版本歌詞；歌曲本身（曲名、專輯）由目錄匯入維護 */
    @Transactional
    public SongDto updateContent(String slug, SongContentRequest req) {
        Song song = find(slug);
        applyContent(song, req.chant(), req.mv(), req.inst(), req.live(), req.chantOrder(), req.lyrics(), req.plain());
        return toDto(repo.save(song));
    }

    /** 修改清單上的基本資料（曲名、曲序、時長、主打、Feat.、備註），也可以把歌搬到別張專輯。slug 不變，網址不會失效 */
    @Transactional
    public SongDto updateMeta(String slug, SongMetaRequest req) {
        Song song = find(slug);
        if (req.albumId() != null && !req.albumId().isBlank() && !req.albumId().equals(song.getAlbum().getSlug())) {
            Album target = albums.findBySlug(req.albumId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到專輯：" + req.albumId()));
            song.setAlbum(target);
        }
        song.setTitle(req.title().trim());
        song.setTrackNo(req.trackNo());
        song.setDurationSec(req.durationSec());
        song.setTitleTrack(req.titleTrack());
        song.setFeaturing(blankToNull(req.featuring()));
        song.setNote(blankToNull(req.note()));
        return toDto(repo.save(song));
    }

    /** 在專輯新增一首歌（還沒有影片與歌詞，之後用編輯頁補） */
    @Transactional
    public SongDto create(String albumSlug, SongCreateRequest req) {
        Album album = albums.findBySlug(albumSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到專輯：" + albumSlug));
        int trackNo = req.trackNo() != null
                ? req.trackNo()
                : album.getSongs().stream().mapToInt(Song::getTrackNo).max().orElse(0) + 1;

        String base = albumSlug + "-t" + trackNo;
        if (base.length() > 140) base = base.substring(0, 140);
        String slug = base;
        for (int i = 2; repo.existsBySlug(slug); i++) slug = base + "-" + i;

        Song song = new Song();
        song.setSlug(slug);
        song.setAlbum(album);
        song.setTrackNo(trackNo);
        song.setTitle(req.title().trim());
        song.setDurationSec(req.durationSec() == null ? 0 : req.durationSec());
        song.setTitleTrack(req.titleTrack());
        song.setFeaturing(blankToNull(req.featuring()));
        song.setNote(blankToNull(req.note()));
        return toDto(repo.save(song));
    }

    /** 刪除一首歌（連同它的影片與歌詞） */
    @Transactional
    public void delete(String slug) {
        Song song = find(slug);
        song.getAlbum().getSongs().remove(song);
        repo.delete(song);
    }

    /** 整批設定應援歌單：依序編號 1、2、3…，沒列出的歌移出歌單。回傳歌單長度 */
    @Transactional
    public int setChantList(List<String> slugs) {
        Map<String, Song> all = new HashMap<>();
        for (Song s : repo.findAll()) all.put(s.getSlug(), s);

        Set<String> seen = new HashSet<>();
        for (String slug : slugs) {
            if (!all.containsKey(slug)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到歌曲：" + slug);
            }
            if (!seen.add(slug)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "歌曲重複：" + slug);
            }
        }
        all.values().forEach(s -> s.setChantOrder(null));
        int order = 1;
        for (String slug : slugs) all.get(slug).setChantOrder(order++);
        repo.saveAll(all.values());
        return slugs.size();
    }

    /** 把影片、應援歌單順序與歌詞寫進 Song（不存檔）。管理頁儲存與備份還原共用 */
    public void applyContent(Song song, VideoDto chant, VideoDto mv, VideoDto inst, VideoDto live,
                             Integer chantOrder, LyricsDto lyrics, PlainDto plain) {
        song.setChantVideo(chant == null ? null : chant.id());
        song.setChantOffset(chant == null ? 0 : chant.offsetSec());
        song.setMvVideo(mv == null ? null : mv.id());
        song.setMvOffset(mv == null ? 0 : mv.offsetSec());
        song.setInstVideo(inst == null ? null : inst.id());
        song.setInstOffset(inst == null ? 0 : inst.offsetSec());
        song.setLiveVideo(live == null ? null : live.id());
        song.setLiveOffset(live == null ? 0 : live.offsetSec());
        song.setChantOrder(chantOrder);

        Set<VideoKind> plainKinds = EnumSet.noneOf(VideoKind.class);
        for (VideoKind kind : VideoKind.values()) {
            if (plain != null && plain.of(kind)) plainKinds.add(kind);
        }
        song.setPlainKinds(plainKinds);

        song.getLines().clear();
        boolean hasChant = false;
        for (VideoKind kind : VideoKind.values()) {
            List<LyricLineDto> given = lyrics == null ? List.<LyricLineDto>of() : lyrics.of(kind);
            // 「只有歌詞」的版本不打點：時間一律存 -1，並照編輯器的順序存
            boolean isPlain = plainKinds.contains(kind);
            // 全部都打好點才依時間排序；還有草稿行（startSec < 0）時照編輯器的順序存，才不會把行順序打亂
            boolean draft = isPlain || given.stream().anyMatch(d -> d.startSec() < 0);
            List<LyricLineDto> sorted = draft
                    ? given
                    : given.stream().sorted(Comparator.comparingDouble(LyricLineDto::startSec)).toList();
            int no = 1;
            for (LyricLineDto d : sorted) {
                LyricLine l = new LyricLine();
                l.setSong(song);
                l.setVideoKind(kind);
                l.setLineNo(no++);
                l.setStartSec(isPlain ? -1 : d.startSec());
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
                s.getAlbum().getReleaseDate(), s.getFeaturing(), toVideos(s), s.getChantOrder(), toLyrics(s), toPlain(s));
    }

    public PlainDto toPlain(Song s) {
        return new PlainDto(s.isPlain(VideoKind.CHANT), s.isPlain(VideoKind.MV),
                s.isPlain(VideoKind.INST), s.isPlain(VideoKind.LIVE));
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
