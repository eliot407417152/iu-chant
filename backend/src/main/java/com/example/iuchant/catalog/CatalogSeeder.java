package com.example.iuchant.catalog;

import com.example.iuchant.album.AlbumRepository;
import com.example.iuchant.album.DeletedAlbumRepository;
import com.example.iuchant.catalog.CatalogDtos.CatalogAlbum;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

/** 啟動時：資料庫是空的就匯入 resources/seed/catalog.json；否則只補上還沒有的新專輯 */
@Component
public class CatalogSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogSeeder.class);

    private final AlbumRepository albums;
    private final DeletedAlbumRepository deleted;
    private final CatalogImportService importer;
    private final ObjectMapper mapper;

    public CatalogSeeder(AlbumRepository albums, DeletedAlbumRepository deleted, CatalogImportService importer,
                         ObjectMapper mapper) {
        this.albums = albums;
        this.deleted = deleted;
        this.importer = importer;
        this.mapper = mapper;
    }

    @Override
    public void run(String... args) throws Exception {
        List<CatalogAlbum> data;
        try (InputStream in = new ClassPathResource("seed/catalog.json").getInputStream()) {
            data = mapper.readValue(in, new TypeReference<List<CatalogAlbum>>() {});
        }

        if (albums.count() == 0) {
            // 即使資料庫是空的，也不要把管理員刪除過的專輯補回來
            List<CatalogAlbum> initial = data.stream().filter(a -> !deleted.existsById(a.slug())).toList();
            int songs = importer.importCatalog(initial);
            log.info("已匯入 {} 張專輯／單曲、{} 首歌", initial.size(), songs);
            return;
        }

        // 資料庫已經有資料：只補上 catalog.json 新增、但資料庫還沒有的專輯。
        // 已存在的專輯完全不動，所以不會蓋掉你在管理員模式改過的內容；管理員刪除過的專輯也不會再補回來。
        List<CatalogAlbum> missing = data.stream()
                .filter(a -> albums.findBySlug(a.slug()).isEmpty() && !deleted.existsById(a.slug()))
                .toList();
        if (missing.isEmpty()) return;
        try {
            int songs = importer.importCatalog(missing);
            log.info("已補上新專輯 {} 張、{} 首歌：{}", missing.size(), songs,
                    missing.stream().map(CatalogAlbum::title).toList());
        } catch (Exception e) {
            log.warn("補上新專輯失敗（不影響既有資料）：{}", e.getMessage());
        }
    }
}
