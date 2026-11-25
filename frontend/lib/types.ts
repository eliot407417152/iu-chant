export type ChantType = "sing" | "call" | "cheer" | "clap" | "quiet" | "all";

/** 一行裡的一段文字；color 是顏色代號（見 lib/richText.ts 的 PALETTE）或 #rrggbb，沒有代表預設色 */
export interface Seg {
  text: string;
  color?: string;
  /** 顯示在這段文字正上方、並與它對齊的標註（例如要喊的「I U」） */
  note?: string;
  /** 標註的顏色；沒有就用預設的喊口號色 */
  noteColor?: string;
}

export interface LyricLine {
  /** 這一行開始的秒數 */
  startSec: number;
  /** 主要文字：歌詞，或應援時要喊的詞 */
  text: string;
  /** 空耳（羅馬拼音） */
  roman?: string;
  /** 翻譯或說明 */
  sub?: string;
  /** 有值代表這一行是應援（用不同顏色顯示） */
  chant?: ChantType;
  /** 同一行裡不同顏色的片段（組合起來等於 text）；沒有代表整行同一個顏色 */
  segs?: Seg[];
}

export const CHANT_LABEL: Record<ChantType, string> = {
  sing: "跟唱",
  call: "喊口號",
  cheer: "歡呼",
  clap: "拍手",
  quiet: "安靜",
  all: "全體",
};

export type VideoKind = "chant" | "mv" | "inst" | "live";
export const VIDEO_KINDS: VideoKind[] = ["chant", "mv", "inst", "live"];
export const VIDEO_LABEL: Record<VideoKind, string> = {
  chant: "應援版本",
  mv: "MV",
  inst: "純音樂",
  live: "LIVE版",
};

/** 一支 YouTube 影片。歌詞時間 = 播放時間 + offsetSec */
export interface VideoSource {
  id: string;
  offsetSec: number;
}
export type Videos = Partial<Record<VideoKind, VideoSource>>;

/** 每個影片版本各自一份歌詞（沒有歌詞就是空陣列） */
export type Lyrics = Record<VideoKind, LyricLine[]>;

/** 哪些版本是「只有歌詞、不打點」：這種版本的歌詞行 startSec 都是 -1，只顯示歌詞，不跟著影片捲動 */
export type PlainFlags = Record<VideoKind, boolean>;
export const NO_PLAIN: PlainFlags = { chant: false, mv: false, inst: false, live: false };

export type AlbumType = "studio" | "mini" | "repackage" | "single" | "remake" | "ost";

/** 專輯列表裡的一首歌 */
export interface SongSummary {
  id: string;
  trackNo: number;
  title: string;
  durationSec: number;
  isTitleTrack: boolean;
  featuring?: string;
  note?: string;
  /** 已整理應援法 */
  hasChant: boolean;
  /** 至少有一支 YouTube 影片 */
  hasVideo: boolean;
  /** 在應援歌單中的順序；沒有代表不在應援歌單 */
  chantOrder?: number;
}

export interface Album {
  id: string;
  title: string;
  /** 顯示用類別，例如「迷你一輯」「數位單曲」 */
  typeLabel: string;
  type: AlbumType;
  /** YYYY-MM-DD */
  releaseDate: string;
  /** 外部網址，或後端的相對路徑（管理員上傳的封面）；用 coverSrc() 轉成可顯示的網址 */
  coverUrl?: string;
  note?: string;
  songs: SongSummary[];
}

/** 單首歌的詳細內容 */
export interface Song {
  id: string;
  title: string;
  albumId: string;
  albumTitle: string;
  releaseDate: string;
  featuring?: string;
  videos: Videos;
  chantOrder?: number;
  lyrics: Lyrics;
  /** 舊版後端沒有這個欄位，視為每個版本都要打點 */
  plain?: PlainFlags;
}

export const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
  { value: "studio", label: "正規專輯" },
  { value: "repackage", label: "改版專輯（歸在正規專輯）" },
  { value: "mini", label: "迷你專輯" },
  { value: "single", label: "單曲" },
  { value: "remake", label: "翻唱專輯" },
  { value: "ost", label: "OST" },
];
