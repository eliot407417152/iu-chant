package com.example.iuchant.backup;

import com.example.iuchant.backup.BackupDtos.BackupFile;
import com.example.iuchant.backup.BackupDtos.RestoreResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/** 管理 API：備份匯出與匯入。需要 X-Admin-Key 標頭 */
@RestController
@RequestMapping("/api/admin/backup")
public class AdminBackupController {

    private final BackupService service;

    public AdminBackupController(BackupService service) {
        this.service = service;
    }

    @GetMapping
    public BackupFile export() {
        return service.export();
    }

    @PostMapping("/restore")
    public RestoreResult restore(@Valid @RequestBody BackupFile file) {
        return service.restore(file);
    }
}
