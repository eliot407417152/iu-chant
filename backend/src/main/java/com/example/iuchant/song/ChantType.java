package com.example.iuchant.song;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** JSON 內使用小寫，和前端一致 */
public enum ChantType {
    SING,   // 跟唱：大家一起唱這句歌詞（會附上空耳）
    CALL,   // 喊口號：歌詞之外喊的詞
    CHEER,  // 歡呼
    CLAP,   // 拍手
    QUIET,  // 安靜
    ALL;    // 全體

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ChantType fromJson(String value) {
        return ChantType.valueOf(value.trim().toUpperCase());
    }
}
