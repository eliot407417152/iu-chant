package com.example.iuchant.catalog;

import com.example.iuchant.catalog.CatalogDtos.CatalogAlbum;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** 管理 API：新增新發行的專輯或單曲。需要 X-Admin-Key 標頭 */
@RestController
@RequestMapping("/api/admin/catalog")
public class AdminCatalogController {

    private final CatalogImportService importer;

    public AdminCatalogController(CatalogImportService importer) {
        this.importer = importer;
    }

    @PostMapping("/import")
    public Map<String, Integer> importCatalog(@RequestBody List<CatalogAlbum> albums) {
        return Map.of("albums", albums.size(), "songs", importer.importCatalog(albums));
    }
}
