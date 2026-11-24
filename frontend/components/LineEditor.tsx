"use client";

import { useRef, useState } from "react";
import {
  PALETTE,
  charIndex,
  colorsToSegs,
  cssColor,
  paint,
  reflow,
  segsToColors,
  setNote,
} from "@/lib/richText";
import type { DraftLine } from "@/lib/parseLyrics";
import { CHANT_LABEL, type ChantType } from "@/lib/types";
import LineText from "./LineText";

export interface LineActions {
  onChange: (patch: Partial<DraftLine>) => void;
  onMove: (dir: -1 | 1) => void;
  onAdd: (where: "above" | "below") => void;
  onMergeNext: () => void;
  /** at：游標位置（字元數） */
  onSplit: (at: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface Props extends LineActions {
  line: DraftLine;
  index: number;
  total: number;
}

const CHANT_TYPES = Object.keys(CHANT_LABEL) as ChantType[];

/** 一行歌詞的行內編輯面板：文字、空耳、翻譯、應援類型、選字上色，以及合併／拆行／新增／刪除 */
export default function LineEditor({ line, index, total, ...act }: Props) {
  const textRef = useRef<HTMLInputElement>(null);
  /** 輸入框失去焦點後仍要記得選取範圍（按顏色按鈕會讓輸入框失焦） */
  const sel = useRef({ start: 0, end: 0 });
  const [hint, setHint] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState("call");

  const colors = segsToColors(line.text, line.segs);

  const rememberSel = () => {
    const el = textRef.current;
    if (!el) return;
    sel.current = {
      start: charIndex(line.text, el.selectionStart ?? 0),
      end: charIndex(line.text, el.selectionEnd ?? 0),
    };
  };

  const setText = (next: string) => {
    act.onChange({ text: next, segs: colorsToSegs(next, reflow(line.text, next, colors)) });
  };

  const applyColor = (color: string | undefined) => {
    rememberSel();
    let { start, end } = sel.current;
    if (start === end) {
      if (color === undefined) {
        // 沒選字就清除：整行回到預設色
        start = 0;
        end = Array.from(line.text).length;
      } else {
        setHint("先在上方文字框用滑鼠（或 Shift＋方向鍵）選取要上色的字，再按顏色。");
        return;
      }
    }
    setHint("");
    act.onChange({ segs: colorsToSegs(line.text, paint(colors, start, end, color)) });
  };

  /** 在選取的字正上方加標註（例如選「my you」，標註「I U」） */
  const applyNote = () => {
    rememberSel();
    const { start, end } = sel.current;
    if (start === end) {
      setHint("先在上方文字框選取要「對齊」的字（例如 my you），再按「加上標註」。");
      return;
    }
    if (!noteText.trim()) {
      setHint("請先在標註框輸入要顯示在上方的字（例如 I U）。");
      return;
    }
    setHint("");
    act.onChange({ segs: colorsToSegs(line.text, setNote(colors, start, end, noteText.trim(), noteColor)) });
  };

  const removeNote = () => {
    rememberSel();
    let { start, end } = sel.current;
    if (start === end) {
      start = 0;
      end = Array.from(line.text).length;
    }
    setHint("");
    act.onChange({ segs: colorsToSegs(line.text, setNote(colors, start, end, undefined, undefined)) });
  };

  const split = () => {
    rememberSel();
    const at = sel.current.start;
    const len = Array.from(line.text).length;
    if (at <= 0 || at >= len) {
      setHint("先把游標點在要拆開的位置（不能在最前面或最後面）。");
      return;
    }
    setHint("");
    act.onSplit(at);
  };

  const keep = (e: React.MouseEvent) => e.preventDefault(); // 按鈕不要搶走輸入框的選取範圍

  return (
    <div className="ed-edit" role="group" aria-label={`編輯第 ${index + 1} 行`}>
      <label className="ed-edit-field">
        歌詞（要喊的詞）
        <input
          ref={textRef}
          value={line.text}
          onChange={(e) => setText(e.target.value)}
          onSelect={rememberSel}
          onKeyUp={rememberSel}
          onMouseUp={rememberSel}
          onBlur={rememberSel}
        />
      </label>

      <div className="ed-colors">
        <span className="muted">選取文字後按顏色：</span>
        {PALETTE.map((p) => (
          <button
            key={p.key}
            type="button"
            className="swatch"
            style={{ background: cssColor(p.key) }}
            title={p.label}
            aria-label={`把選取的字改成${p.label}`}
            onMouseDown={keep}
            onClick={() => applyColor(p.key)}
          />
        ))}
        <label className="swatch swatch-custom" title="自訂顏色" onMouseDown={keep}>
          <input
            type="color"
            aria-label="自訂顏色"
            defaultValue="#d0378a"
            onChange={(e) => applyColor(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-sm" onMouseDown={keep} onClick={() => applyColor(undefined)}>
          清除顏色
        </button>
      </div>

      <div className="ed-colors ed-notes">
        <span className="muted">字上方標註：</span>
        <input
          className="ed-note-input"
          value={noteText}
          placeholder="例如 I U"
          aria-label="標註文字"
          onChange={(e) => setNoteText(e.target.value)}
        />
        <select aria-label="標註顏色" value={noteColor} onChange={(e) => setNoteColor(e.target.value)}>
          {PALETTE.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <button type="button" className="btn btn-sm" onMouseDown={keep} onClick={applyNote}>加上標註（對齊選取的字）</button>
        <button type="button" className="btn btn-sm" onMouseDown={keep} onClick={removeNote}>移除標註</button>
      </div>

      {line.segs && (
        <div className="ed-preview" aria-label="預覽">
          <LineText text={line.text} segs={line.segs} />
        </div>
      )}
      {hint && <p className="ed-hint-warn" role="status">{hint}</p>}

      <div className="ed-edit-two">
        <label className="ed-edit-field">
          空耳（上方小字）
          <input value={line.roman ?? ""} onChange={(e) => act.onChange({ roman: e.target.value || undefined })} />
        </label>
        <label className="ed-edit-field">
          翻譯／說明（下方小字）
          <input value={line.sub ?? ""} onChange={(e) => act.onChange({ sub: e.target.value || undefined })} />
        </label>
      </div>

      <label className="ed-edit-field ed-edit-type">
        這一行的類型
        <select
          value={line.chant ?? ""}
          onChange={(e) => act.onChange({ chant: (e.target.value || undefined) as ChantType | undefined })}
        >
          <option value="">一般歌詞（不是應援）</option>
          {CHANT_TYPES.map((t) => (
            <option key={t} value={t}>{CHANT_LABEL[t]}</option>
          ))}
        </select>
      </label>

      <div className="ed-edit-actions">
        <button type="button" className="btn btn-sm" disabled={index === 0} onClick={() => act.onMove(-1)}>↑ 上移</button>
        <button type="button" className="btn btn-sm" disabled={index === total - 1} onClick={() => act.onMove(1)}>↓ 下移</button>
        <button type="button" className="btn btn-sm" onClick={() => act.onAdd("above")}>＋ 上方新增</button>
        <button type="button" className="btn btn-sm" onClick={() => act.onAdd("below")}>＋ 下方新增</button>
        <button type="button" className="btn btn-sm" disabled={index === total - 1} onClick={act.onMergeNext}>⤓ 和下一行合併</button>
        <button type="button" className="btn btn-sm" onMouseDown={keep} onClick={split}>✂ 在游標處拆成兩行</button>
        <button type="button" className="btn btn-sm" onClick={act.onDuplicate}>複製這行</button>
        <button type="button" className="btn btn-sm btn-danger" onClick={act.onDelete}>刪除這行</button>
        <button type="button" className="stamp-btn btn-sm" onClick={act.onClose}>完成</button>
      </div>
    </div>
  );
}
