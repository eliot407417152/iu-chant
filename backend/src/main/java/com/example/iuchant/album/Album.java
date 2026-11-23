package com.example.iuchant.album;

import com.example.iuchant.song.Song;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "album")
public class Album {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 網址與 API 使用的代稱，對前端而言就是 id */
    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @Column(nullable = false)
    private String title;

    /** 顯示用的類別，例如「迷你一輯」「數位單曲」 */
    @Column(name = "type_label", nullable = false, length = 50)
    private String typeLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "album_type", nullable = false, length = 20)
    private AlbumType type;

    @Column(name = "release_date", nullable = false)
    private LocalDate releaseDate;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(length = 300)
    private String note;

    /** 管理員上傳封面的版本（毫秒時間戳）；null 代表沒有上傳過，會改用 coverUrl */
    @Column(name = "cover_version")
    private Long coverVersion;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL)
    @OrderBy("trackNo ASC")
    private List<Song> songs = new ArrayList<>();

    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTypeLabel() { return typeLabel; }
    public void setTypeLabel(String typeLabel) { this.typeLabel = typeLabel; }
    public AlbumType getType() { return type; }
    public void setType(AlbumType type) { this.type = type; }
    public LocalDate getReleaseDate() { return releaseDate; }
    public void setReleaseDate(LocalDate releaseDate) { this.releaseDate = releaseDate; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public Long getCoverVersion() { return coverVersion; }
    public void setCoverVersion(Long coverVersion) { this.coverVersion = coverVersion; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public List<Song> getSongs() { return songs; }
}
