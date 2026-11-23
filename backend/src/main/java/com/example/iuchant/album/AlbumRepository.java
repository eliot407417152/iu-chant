package com.example.iuchant.album;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlbumRepository extends JpaRepository<Album, Long> {

    /** 一次把歌曲一起抓出來，避免每張專輯多打一次資料庫 */
    @Override
    @EntityGraph(attributePaths = "songs")
    List<Album> findAll(Sort sort);

    Optional<Album> findBySlug(String slug);
}
