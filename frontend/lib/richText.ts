import type { Seg } from "./types";

/** 單一字元的樣式：文字顏色，以及（選用）顯示在它正上方的標註 */
export interface CharAttr {
  color?: string;
  note?: string;
  noteColor?: string;
}
/** 每個字元各自的樣式（undefined = 預設），長度與 text 的字元數相同 */
export type CharColors = (CharAttr | undefined)[];

export const PALETTE: { key: string; label: string }[] = [
  { key: "sing", label: "粉紅" },
  { key: "call", label: "橘黃" },
  { key: "cheer", label: "青綠" },
  { key: "clap", label: "藍" },
  { key: "all", label: "紫" },
  { key: "quiet", label: "灰" },
];

/** 顏色代號 → CSS 顏色。代號走主題變數（深淺色模式都看得清楚），#rrggbb 照原樣 */
export function cssColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  if (PALETTE.some((p) => p.key === color)) return `var(--c-${color})`;
  return undefined;
}

const chars = (s: string) => Array.from(s);
const clean = (a: CharAttr | undefined): CharAttr | undefined =>
  a && (a.color || a.note) ? a : undefined;
const same = (a?: CharAttr, b?: CharAttr) =>
  (a?.color ?? "") === (b?.color ?? "") && (a?.note ?? "") === (b?.note ?? "") && (a?.noteColor ?? "") === (b?.noteColor ?? "");

export function segsToColors(text: string, segs?: Seg[]): CharColors {
  const n = chars(text).length;
  if (!segs || segs.length === 0) return new Array(n).fill(undefined);
  const out: CharColors = [];
  for (const g of segs) {
    const attr = clean({ color: g.color || undefined, note: g.note || undefined, noteColor: g.noteColor || undefined });
    for (const _ of chars(g.text)) out.push(attr);
  }
  // 文字和片段對不上時（資料被改過），放棄樣式，避免錯位
  return out.length === n ? out : new Array(n).fill(undefined);
}

/** 樣式相同的連續字元合併成一段；完全沒有樣式就回傳 undefined（不用存） */
export function colorsToSegs(text: string, colors: CharColors): Seg[] | undefined {
  if (colors.every((c) => !clean(c))) return undefined;
  const cs = chars(text);
  const segs: Seg[] = [];
  let prev: CharAttr | undefined;
  cs.forEach((ch, i) => {
    const a = clean(colors[i]);
    const last = segs[segs.length - 1];
    if (last && same(prev, a)) last.text += ch;
    else {
      const seg: Seg = { text: ch };
      if (a?.color) seg.color = a.color;
      if (a?.note) {
        seg.note = a.note;
        if (a.noteColor) seg.noteColor = a.noteColor;
      }
      segs.push(seg);
    }
    prev = a;
  });
  return segs;
}

/** 對第 start～end 個字元（不含 end）上色；color 為 undefined 就是清除文字顏色（標註不動） */
export function paint(colors: CharColors, start: number, end: number, color: string | undefined): CharColors {
  return colors.map((c, i) => (i >= start && i < end ? clean({ ...c, color }) : c));
}

/** 在第 start～end 個字元的正上方加標註；note 為空就是移除這段範圍的標註 */
export function setNote(
  colors: CharColors,
  start: number,
  end: number,
  note: string | undefined,
  noteColor: string | undefined,
): CharColors {
  return colors.map((c, i) =>
    i >= start && i < end ? clean({ ...c, note: note || undefined, noteColor: note ? noteColor : undefined }) : c,
  );
}

/**
 * 文字被改過之後，盡量保留原本的樣式：前面沒動的字和後面沒動的字各自保留，
 * 中間新打的字沿用它前一個字的文字顏色（標註不延伸）。
 */
export function reflow(oldText: string, newText: string, colors: CharColors): CharColors {
  const a = chars(oldText);
  const b = chars(newText);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const prevColor = pre > 0 ? colors[pre - 1]?.color : undefined;
  const fill = prevColor ? { color: prevColor } : undefined;
  return [
    ...colors.slice(0, pre),
    ...new Array(b.length - pre - suf).fill(fill),
    ...colors.slice(a.length - suf),
  ];
}

/** 輸入框的選取位置（UTF-16 索引）→ 字元索引 */
export function charIndex(text: string, utf16Index: number): number {
  return chars(text.slice(0, utf16Index)).length;
}

export function utf16Index(text: string, charIdx: number): number {
  return chars(text).slice(0, charIdx).join("").length;
}

export function splitColors(text: string, colors: CharColors, at: number) {
  const cs = chars(text);
  return {
    leftText: cs.slice(0, at).join(""),
    rightText: cs.slice(at).join(""),
    leftColors: colors.slice(0, at),
    rightColors: colors.slice(at),
  };
}
