package com.example.iuchant.song;

import com.example.iuchant.album.Album;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "song")
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "album_id")
    private Album album;

    @Column(name = "track_no", nullable = false)
    private int trackNo;

    @Column(nullable = false)
    private String title;

    @Column(name = "duration_sec", nullable = false)
    private int durationSec;

    /** 主打歌 */
    @Column(name = "title_track", nullable = false)
    private boolean titleTrack;

    /** 例如 Feat. Mario、With 成始璄 */
    @Column(length = 200)
    private String featuring;

    /** 例如 先行單曲、CD Only */
    @Column(length = 200)
    private String note;

    // ---- 四種影片（沒有就是 null）。offset：歌詞時間 = 播放時間 + offset ----
    @Column(name = "chant_video", length = 20)
    private String chantVideo;
    @Column(name = "chant_offset", nullable = false)
    private double chantOffset;

    @Column(name = "mv_video", length = 20)
    private String mvVideo;
    @Column(name = "mv_offset", nullable = false)
    private double mvOffset;

    @Column(name = "inst_video", length = 20)
    private String instVideo;
    @Column(name = "inst_offset", nullable = false)
    private double instOffset;

    @Column(name = "live_video", length = 20)
    private String liveVideo;
    // columnDefinition 讓舊資料庫自動新增欄位時，既有的列預設為 0
    @Column(name = "live_offset", nullable = false, columnDefinition = "double precision default 0")
    private double liveOffset;

    /** 在應援歌單中的順序；null 代表不在應援歌單 */
    @Column(name = "chant_order")
    private Integer chantOrder;

    /** 歌詞中至少有一行應援，用來在列表顯示「應援法」標籤 */
    @Column(name = "has_chant", nullable = false)
    private boolean hasChant;

    /**
     * 「只有歌詞、不打點」的影片版本，以逗號分隔，例如 "CHANT,LIVE"；null 代表每個版本都要打點。
     * 欄位允許 null，舊資料庫自動新增欄位時不用刪資料。
     */
    @Column(name = "plain_kinds", length = 40)
    private String plainKinds;

    @OneToMany(mappedBy = "song", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNo ASC")
    private List<LyricLine> lines = new ArrayList<>();

    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Album getAlbum() { return album; }
    public void setAlbum(Album album) { this.album = album; }
    public int getTrackNo() { return trackNo; }
    public void setTrackNo(int trackNo) { this.trackNo = trackNo; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getDurationSec() { return durationSec; }
    public void setDurationSec(int durationSec) { this.durationSec = durationSec; }
    public boolean isTitleTrack() { return titleTrack; }
    public void setTitleTrack(boolean titleTrack) { this.titleTrack = titleTrack; }
    public String getFeaturing() { return featuring; }
    public void setFeaturing(String featuring) { this.featuring = featuring; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getChantVideo() { return chantVideo; }
    public void setChantVideo(String chantVideo) { this.chantVideo = chantVideo; }
    public double getChantOffset() { return chantOffset; }
    public void setChantOffset(double chantOffset) { this.chantOffset = chantOffset; }
    public String getMvVideo() { return mvVideo; }
    public void setMvVideo(String mvVideo) { this.mvVideo = mvVideo; }
    public double getMvOffset() { return mvOffset; }
    public void setMvOffset(double mvOffset) { this.mvOffset = mvOffset; }
    public String getInstVideo() { return instVideo; }
    public void setInstVideo(String instVideo) { this.instVideo = instVideo; }
    public double getInstOffset() { return instOffset; }
    public void setInstOffset(double instOffset) { this.instOffset = instOffset; }
    public String getLiveVideo() { return liveVideo; }
    public void setLiveVideo(String liveVideo) { this.liveVideo = liveVideo; }
    public double getLiveOffset() { return liveOffset; }
    public void setLiveOffset(double liveOffset) { this.liveOffset = liveOffset; }
    public Integer getChantOrder() { return chantOrder; }
    public void setChantOrder(Integer chantOrder) { this.chantOrder = chantOrder; }
    public boolean isHasChant() { return hasChant; }
    public void setHasChant(boolean hasChant) { this.hasChant = hasChant; }
    public List<LyricLine> getLines() { return lines; }

    public boolean isPlain(VideoKind kind) {
        return plainKinds != null && java.util.Arrays.asList(plainKinds.split(",")).contains(kind.name());
    }

    public void setPlainKinds(Set<VideoKind> kinds) {
        plainKinds = (kinds == null || kinds.isEmpty())
                ? null
                : kinds.stream().map(Enum::name).sorted().collect(Collectors.joining(","));
    }

    public boolean hasAnyVideo() {
        return chantVideo != null || mvVideo != null || instVideo != null || liveVideo != null;
    }
}
