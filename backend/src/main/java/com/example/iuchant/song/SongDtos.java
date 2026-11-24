package com.example.iuchant.song;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

/** 欄位名稱必須和前端 lib/types.ts 一致 */
public final class SongDtos {
    private SongDtos() {}

    /** 一行裡的一段文字與它的顏色（color 是顏色代號如 sing、call，或 #rrggbb；null 代表預設色） */
    public record SegDto(
            @NotNull @Size(max = 500) String text,
            @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9#]*$") String color,
            /** 顯示在這段文字正上方、與它對齊的標註（例如要喊的 I U） */
            @Size(max = 100) String note,
            @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9#]*$") String noteColor) {}

    public record LyricLineDto(
            /** 還沒打點的草稿行用 -1 表示；其餘必須 >= 0 */
            @DecimalMin("-1") double startSec,
            @NotBlank @Size(max = 500) String text,
            @Size(max = 500) String roman,
            @Size(max = 500) String sub,
            ChantType chant,
            @Valid @Size(max = 100) List<SegDto> segs) {}

    /** 一支 YouTube 影片。歌詞時間 = 播放時間 + offsetSec */
    public record VideoDto(
            @NotBlank @Pattern(regexp = "^[\\w-]{11}$", message = "影片 ID 必須是 11 碼") String id,
            double offsetSec) {}

    /** 四種影片：應援版本、MV、純音樂、演唱會；沒有的就是 null（不會輸出） */
    public record VideosDto(VideoDto chant, VideoDto mv, VideoDto inst, VideoDto live) {}

    /** 每個影片版本各自一份歌詞（沒有就是空陣列） */
    public record LyricsDto(
            @Valid List<LyricLineDto> chant,
            @Valid List<LyricLineDto> mv,
            @Valid List<LyricLineDto> inst,
            @Valid List<LyricLineDto> live) {

        public List<LyricLineDto> of(VideoKind kind) {
            List<LyricLineDto> l = switch (kind) {
                case CHANT -> chant;
                case MV -> mv;
                case INST -> inst;
                case LIVE -> live;
            };
            return l == null ? List.of() : l;
        }
    }

    public record SongDto(
            String id,
            String title,
            String albumId,
            String albumTitle,
            LocalDate releaseDate,
            String featuring,
            VideosDto videos,
            Integer chantOrder,
            LyricsDto lyrics) {}

    /** 管理端：整批取代一首歌的影片、應援歌單順序與各版本歌詞 */
    public record SongContentRequest(
            @Valid VideoDto chant,
            @Valid VideoDto mv,
            @Valid VideoDto inst,
            @Valid VideoDto live,
            @Min(1) Integer chantOrder,
            @NotNull @Valid LyricsDto lyrics) {}
}
