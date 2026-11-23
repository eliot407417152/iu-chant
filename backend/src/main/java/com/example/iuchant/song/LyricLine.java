package com.example.iuchant.song;

import jakarta.persistence.*;

@Entity
@Table(name = "lyric_line")
public class LyricLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id")
    private Song song;

    /**
     * 這行歌詞屬於哪個影片版本。舊資料是 null，一律視為應援版本（CHANT）。
     * 欄位允許 null，才能直接在舊資料庫上自動新增，不用刪資料。
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "video_kind", length = 10)
    private VideoKind videoKind;

    @Column(name = "line_no", nullable = false)
    private int lineNo;

    /** 這一行開始的秒數 */
    @Column(name = "start_sec", nullable = false)
    private double startSec;

    @Column(name = "line_text", nullable = false, length = 500)
    private String text;

    /** 空耳（羅馬拼音） */
    @Column(name = "roman_text", length = 500)
    private String roman;

    /** 翻譯或說明 */
    @Column(name = "sub_text", length = 500)
    private String sub;

    @Enumerated(EnumType.STRING)
    @Column(name = "chant_type", length = 10)
    private ChantType chantType;

    public Long getId() { return id; }
    public Song getSong() { return song; }
    public void setSong(Song song) { this.song = song; }
    public VideoKind getVideoKind() { return videoKind; }
    public void setVideoKind(VideoKind videoKind) { this.videoKind = videoKind; }
    /** 舊資料（null）視為應援版本 */
    public VideoKind effectiveKind() { return videoKind == null ? VideoKind.CHANT : videoKind; }
    public int getLineNo() { return lineNo; }
    public void setLineNo(int lineNo) { this.lineNo = lineNo; }
    public double getStartSec() { return startSec; }
    public void setStartSec(double startSec) { this.startSec = startSec; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getRoman() { return roman; }
    public void setRoman(String roman) { this.roman = roman; }
    public String getSub() { return sub; }
    public void setSub(String sub) { this.sub = sub; }
    public ChantType getChantType() { return chantType; }
    public void setChantType(ChantType chantType) { this.chantType = chantType; }
}
