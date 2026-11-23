package com.example.iuchant.song;

import com.example.iuchant.song.SongDtos.SongDto;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/songs")
public class SongController {

    private final SongService service;

    public SongController(SongService service) {
        this.service = service;
    }

    @GetMapping("/{slug}")
    public SongDto get(@PathVariable String slug) {
        return service.get(slug);
    }
}
