export type Filter = "all" | "chant" | "studio" | "mini" | "single" | "remake" | "ost";

/** 網址 ?cat=chant 這類參數轉成分類；不認得就是「全部」 */
export function parseFilter(v: string | undefined): Filter {
  return FILTERS.some((f) => f.key === v) ? (v as Filter) : "all";
}

export const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "chant", label: "應援歌單" },
  { key: "studio", label: "正規專輯" },
  { key: "mini", label: "迷你專輯" },
  { key: "single", label: "單曲" },
  { key: "remake", label: "翻唱專輯" },
  { key: "ost", label: "OST" },
];
