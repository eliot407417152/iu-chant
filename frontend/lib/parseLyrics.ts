import type { ChantType, LyricLine } from "./types";

/** 打點前的歌詞行：startSec 還沒設定時為 null */
export type DraftLine = Omit<LyricLine, "startSec"> & { startSec: number | null };

const isChant = (s: string) => s.startsWith("((") && s.endsWith("))");
const inner = (s: string) => s.slice(2, -2).trim();
const isNote = (s: string) => s.startsWith("*");
const hasHangul = (s: string) => /[\uac00-\ud7a3]/.test(s);

/**
 * 解析貼上的歌詞文字。規則：
 * - 一行歌詞後面緊接一行翻譯
 * - 用 (( )) 包起來的是應援相關的行
 *   · 緊接在歌詞前面的一行 → 那句歌詞的空耳，整句標為「跟唱」
 *   · 其他連續的 (( )) 行 → 一組喊口號：3 行 = 空耳、要喊的詞、意思；
 *     2 行 = 含韓文的那行是要喊的詞，另一行當空耳；1 行 = 要喊的詞（含「歡呼」則標為歡呼）
 * - 空白行分隔段落；以 * 開頭的行是備註，會略過
 */
export function parseLyrics(raw: string): { lines: DraftLine[]; skippedNotes: number } {
  const rows = raw.split(/\r?\n/).map((l) => l.trim());
  const out: DraftLine[] = [];
  let skippedNotes = 0;
  let i = 0;

  const isLyricRow = (s: string | undefined): s is string =>
    s !== undefined && s !== "" && !isNote(s) && !isChant(s);

  const readLyric = (roman?: string) => {
    const text = rows[i++];
    let sub: string | undefined;
    if (isLyricRow(rows[i])) sub = rows[i++];
    const line: DraftLine = { startSec: null, text };
    if (roman) line.roman = roman;
    if (sub) line.sub = sub;
    if (roman) line.chant = "sing";
    out.push(line);
  };

  while (i < rows.length) {
    const row = rows[i];
    if (row === "") { i++; continue; }
    if (isNote(row)) { skippedNotes++; i++; continue; }

    if (isChant(row)) {
      const run: string[] = [];
      while (i < rows.length && isChant(rows[i])) run.push(inner(rows[i++]));
      const roman = isLyricRow(rows[i]) ? run.pop() : undefined;
      for (let k = 0; k < run.length; ) {
        const n = Math.min(3, run.length - k);
        out.push(chantLine(run.slice(k, k + n)));
        k += n;
      }
      if (roman !== undefined) readLyric(roman);
      continue;
    }

    readLyric();
  }
  return { lines: out, skippedNotes };
}

function chantLine(g: string[]): DraftLine {
  if (g.length === 1) {
    const chant: ChantType = g[0].includes("歡呼") ? "cheer" : "call";
    return { startSec: null, text: g[0], chant };
  }
  if (g.length === 2) {
    const textIdx = hasHangul(g[1]) && !hasHangul(g[0]) ? 1 : 0;
    return { startSec: null, text: g[textIdx], roman: g[1 - textIdx], chant: "call" };
  }
  return { startSec: null, roman: g[0], text: g[1], sub: g[2], chant: "call" };
}

/** 從 YouTube 網址或純 ID 取出 11 碼影片 ID，無效則回傳空字串 */
export function extractVideoId(input: string): string {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : "";
}
