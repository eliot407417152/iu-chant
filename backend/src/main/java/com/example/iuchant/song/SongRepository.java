package com.example.iuchant.song;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SongRepository extends JpaRepository<Song, Long> {
    Optional<Song> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
