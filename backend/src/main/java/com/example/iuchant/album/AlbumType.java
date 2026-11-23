package com.example.iuchant.album;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** JSON 內使用小寫：studio / mini / repackage / single / remake / ost */
public enum AlbumType {
    STUDIO,     // 正規專輯
    MINI,       // 迷你專輯
    REPACKAGE,  // 改版專輯
    SINGLE,     // 單曲專輯、數位單曲、合作單曲
    REMAKE,     // 翻唱專輯（花書籤系列）
    OST;        // 電視劇 OST

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static AlbumType fromJson(String value) {
        return AlbumType.valueOf(value.trim().toUpperCase());
    }
}
