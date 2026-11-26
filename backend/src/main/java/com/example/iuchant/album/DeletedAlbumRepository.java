package com.example.iuchant.album;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DeletedAlbumRepository extends JpaRepository<DeletedAlbum, String> {
}
