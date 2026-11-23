package com.example.iuchant.album;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AlbumCoverRepository extends JpaRepository<AlbumCover, Long> {
    Optional<AlbumCover> findByAlbumId(Long albumId);
}
