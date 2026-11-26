package com.example.iuchant.album;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 管理員刪除過的專輯代稱。
 * 啟動時 CatalogSeeder 會把 catalog.json 裡資料庫沒有的專輯補回來，沒有這張表的話，刪掉的專輯重啟後又會跑回來。
 */
@Entity
@Table(name = "deleted_album")
public class DeletedAlbum {

    @Id
    @Column(length = 150)
    private String slug;

    protected DeletedAlbum() {}

    public DeletedAlbum(String slug) {
        this.slug = slug;
    }

    public String getSlug() { return slug; }
}
