package com.example.iuchant.album;

import jakarta.persistence.*;

/** 管理員上傳的封面圖。獨立一張表，專輯列表不會每次都把圖片讀出來 */
@Entity
@Table(name = "album_cover")
public class AlbumCover {

    /** 圖片大小上限（H2 的 VARBINARY 上限約 1 MB） */
    public static final int MAX_BYTES = 1_000_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "album_id", nullable = false, unique = true)
    private Long albumId;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "image_data", nullable = false, length = MAX_BYTES)
    private byte[] data;

    public Long getId() { return id; }
    public Long getAlbumId() { return albumId; }
    public void setAlbumId(Long albumId) { this.albumId = albumId; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}
