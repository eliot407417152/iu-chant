import { cssColor } from "@/lib/richText";
import type { Seg } from "@/lib/types";

/**
 * 顯示一行歌詞：有多色片段就逐段上色；片段有「標註」時，標註會用 ruby 排在那段字的正上方並置中對齊
 * （例如 You, I trust 〔my you〕 上方標 I U）。
 */
export default function LineText({ text, segs, className = "line-text" }: { text: string; segs?: Seg[]; className?: string }) {
  const rich =
    segs && segs.length > 0 && segs.some((g) => g.color || g.note) && segs.map((g) => g.text).join("") === text;
  const hasNote = !!rich && segs!.some((g) => g.note);
  return (
    <span className={hasNote ? `${className} has-ruby` : className}>
      {rich
        ? segs!.map((g, i) => {
            const color = cssColor(g.color);
            const inner = color ? <span style={{ color }}>{g.text}</span> : <>{g.text}</>;
            if (!g.note) return <span key={i}>{inner}</span>;
            const nc = cssColor(g.noteColor) ?? "var(--c-call)";
            return (
              <ruby key={i} className="seg-ruby">
                {inner}
                <rp>(</rp>
                <rt style={{ color: nc }}>{g.note}</rt>
                <rp>)</rp>
              </ruby>
            );
          })
        : text}
    </span>
  );
}
