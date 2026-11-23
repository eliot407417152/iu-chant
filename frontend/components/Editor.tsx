"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { PUBLIC_API_URL } from "@/lib/config";
import { formatClock } from "@/lib/format";
import { extractVideoId, parseLyrics, type DraftLine } from "@/lib/parseLyrics";
import { CHANT_LABEL, VIDEO_KINDS, VIDEO_LABEL, type Song, type VideoKind } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import TimeInput from "./TimeInput";

/** 按鍵總會比聽到慢一點，所以自動提早一點 */
const LEAD_SEC = 0.3;

type VideoInput = { input: string; offset: string };

function isFormField(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

function emptyBy<T>(make: () => T): Record<VideoKind, T> {
  return { chant: make(), mv: make(), inst: make(), live: make() };
}

/** 切換版本時，游標放在第一行還沒打點的位置；都打完了就放在最前面 */
function firstUnstamped(lines: DraftLine[]): number {
  const i = lines.findIndex((l) => l.startSec == null);
  return i >= 0 ? i : 0;
}

export default function Editor({ song }: { song: Song }) {
  const { adminKey, ready, logout } = useAdmin();
  if (!ready) return null;
  if (!adminKey) {
    return (
      <main className="shell">
        <nav><Link href={`/song/${song.id}`} className="back">‹ 回到歌曲頁</Link></nav>
        <p className="empty">
          請先<Link href="/admin" className="inline-link">登入管理員模式</Link>，才能編輯這首歌。
        </p>
      </main>
    );
  }
  return <EditorInner song={song} adminKey={adminKey} onAuthFail={logout} />;
}

function EditorInner({ song, adminKey, onAuthFail }: { song: Song; adminKey: string; onAuthFail: () => void }) {
  const [vin, setVin] = useState<Record<VideoKind, VideoInput>>(() =>
    VIDEO_KINDS.reduce(
      (acc, k) => ({
        ...acc,
        [k]: { input: song.videos[k]?.id ?? "", offset: String(song.videos[k]?.offsetSec ?? 0) },
      }),
      emptyBy<VideoInput>(() => ({ input: "", offset: "0" })),
    ),
  );
  /** 目前正在預覽、也是正在編輯歌詞的版本 */
  const [kind, setKind] = useState<VideoKind>(
    () => VIDEO_KINDS.find((k) => song.videos[k]) ?? VIDEO_KINDS.find((k) => song.lyrics[k].length > 0) ?? "chant",
  );
  const [order, setOrder] = useState(song.chantOrder != null ? String(song.chantOrder) : "");

  const videoId = extractVideoId(vin[kind].input);
  const offset = Number(vin[kind].offset) || 0;
  const { containerRef, ready, error, getTime, seekTo } = useYouTubePlayer(videoId);

  const [linesBy, setLinesBy] = useState<Record<VideoKind, DraftLine[]>>(() => ({
    chant: song.lyrics.chant,
    mv: song.lyrics.mv,
    inst: song.lyrics.inst,
    live: song.lyrics.live,
  }));
  const [rawBy, setRawBy] = useState<Record<VideoKind, string>>(() => emptyBy(() => ""));
  const lines = linesBy[kind];
  const raw = rawBy[kind];

  const [cursor, setCursor] = useState(() => firstUnstamped(linesBy[kind]));
  const [now, setNow] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 成功訊息幾秒後自動消失；錯誤訊息會一直留著，直到你關掉或再次操作
  useEffect(() => {
    if (!msg?.ok) return;
    const id = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(id);
  }, [msg]);

  const setLines = useCallback(
    (update: (ls: DraftLine[]) => DraftLine[]) => setLinesBy((all) => ({ ...all, [kind]: update(all[kind]) })),
    [kind],
  );

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setNow(getTime() + offset), 200);
    return () => clearInterval(id);
  }, [ready, getTime, offset]);

  const stamp = useCallback(() => {
    if (!ready || cursor >= lines.length) return;
    const t = Math.max(0, Math.round((getTime() + offset - LEAD_SEC) * 10) / 10);
    setLines((ls) => ls.map((l, i) => (i === cursor ? { ...l, startSec: t } : l)));
    setCursor((c) => c + 1);
  }, [ready, cursor, lines.length, getTime, offset, setLines]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) stamp();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(lines.length, c + 1));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isFormField(e.target)) e.preventDefault();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [stamp, lines.length]);

  useEffect(() => {
    document.querySelector(".ed-row.is-cursor")?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const setVideo = (k: VideoKind, patch: Partial<VideoInput>) =>
    setVin((v) => ({ ...v, [k]: { ...v[k], ...patch } }));

  const switchKind = (k: VideoKind) => {
    if (k === kind) return;
    setKind(k);
    setCursor(firstUnstamped(linesBy[k]));
    setSkipped(0);
    setMsg(null);
  };

  const handleParse = () => {
    const r = parseLyrics(raw);
    setLines(() => r.lines);
    setSkipped(r.skippedNotes);
    setCursor(0);
    setMsg({ ok: true, text: `「${VIDEO_LABEL[kind]}」解析出 ${r.lines.length} 行，請開始打點。` });
  };

  /** 把另一個版本的歌詞文字帶過來，時間清空重新打點（例如演唱會版歌詞一樣，但時間不同） */
  const copyFrom = (from: VideoKind) => {
    if (lines.length > 0 && !window.confirm(`會取代「${VIDEO_LABEL[kind]}」目前的 ${lines.length} 行歌詞，確定嗎？`)) return;
    setLines(() => linesBy[from].map((l) => ({ ...l, startSec: null })));
    setCursor(0);
    setMsg({ ok: true, text: `已帶入「${VIDEO_LABEL[from]}」的歌詞文字，時間已清空，請在「${VIDEO_LABEL[kind]}」重新打點。` });
  };

  const setStart = (i: number, value: number | null) => {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, startSec: value } : l)));
  };

  const buildBody = () => {
    const vid = (k: VideoKind) => {
      const id = extractVideoId(vin[k].input);
      return id ? { id, offsetSec: Number(vin[k].offset) || 0 } : undefined;
    };
    const ly = (k: VideoKind) =>
      linesBy[k].map((l) => ({ startSec: l.startSec, text: l.text, roman: l.roman, sub: l.sub, chant: l.chant }));
    return {
      chant: vid("chant"),
      mv: vid("mv"),
      inst: vid("inst"),
      live: vid("live"),
      chantOrder: order.trim() === "" ? null : Number(order),
      lyrics: { chant: ly("chant"), mv: ly("mv"), inst: ly("inst"), live: ly("live") },
    };
  };

  const save = async () => {
    setMsg(null);
    for (const k of VIDEO_KINDS) {
      if (vin[k].input.trim() && !extractVideoId(vin[k].input)) {
        return setMsg({ ok: false, text: `「${VIDEO_LABEL[k]}」的網址無法辨識，請貼 YouTube 網址或 11 碼影片 ID。` });
      }
    }
    if (order.trim() !== "" && !(Number.isInteger(Number(order)) && Number(order) >= 1)) {
      return setMsg({ ok: false, text: "應援歌單順序必須是 1 以上的整數，或留空。" });
    }
    for (const k of VIDEO_KINDS) {
      const missing = linesBy[k].findIndex((l) => l.startSec == null);
      if (missing >= 0) {
        switchKind(k);
        setCursor(missing);
        return setMsg({ ok: false, text: `「${VIDEO_LABEL[k]}」第 ${missing + 1} 行還沒有打點。` });
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/admin/songs/${encodeURIComponent(song.id)}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(buildBody()),
      });
      if (res.ok) {
        const t = new Date().toLocaleTimeString("zh-TW", { hour12: false });
        setMsg({ ok: true, text: `✓ 已儲存（${t}）。可以回到歌曲頁看結果。` });
      }
      else if (res.status === 401) {
        setMsg({ ok: false, text: "管理金鑰已失效，請重新登入。" });
        onAuthFail();
      } else setMsg({ ok: false, text: `儲存失敗（${res.status}）：${(await res.text()).slice(0, 200)}` });
    } catch {
      setMsg({ ok: false, text: "儲存失敗：無法連線到後端，請確認後端已啟動。" });
    } finally {
      setSaving(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildBody(), null, 2));
      setMsg({ ok: true, text: "已複製 JSON。" });
    } catch {
      setMsg({ ok: false, text: "無法複製，請改用「儲存」。" });
    }
  };

  const copySources = VIDEO_KINDS.filter((k) => k !== kind && linesBy[k].length > 0);

  return (
    <main className="shell">
      <nav className="song-nav">
        <Link href="/admin" className="back">‹ 管理員模式</Link>
        <Link href={`/song/${song.id}`} className="pill">看歌曲頁</Link>
      </nav>
      <header className="song-head">
        <h1>編輯：{song.title}</h1>
        <p className="muted">{song.albumTitle}・設定影片、應援歌單順序、各版本的歌詞與應援法。</p>
      </header>

      <div className="ed-grid">
        <section className="ed-left">
          <fieldset className="ed-videos">
            <legend>YouTube 影片（沒有的留空）</legend>
            {VIDEO_KINDS.map((k) => (
              <div key={k} className="ed-video-row">
                <label className="ed-radio">
                  <input type="radio" name="preview" checked={kind === k} onChange={() => switchKind(k)} />
                  {VIDEO_LABEL[k]}
                  <span className="muted ed-count">{linesBy[k].length > 0 ? `${linesBy[k].length} 行` : "無歌詞"}</span>
                </label>
                <input
                  aria-label={`${VIDEO_LABEL[k]} 網址或影片 ID`}
                  value={vin[k].input}
                  onChange={(e) => setVideo(k, { input: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <input
                  className="ed-offset"
                  aria-label={`${VIDEO_LABEL[k]} 歌詞偏移秒數`}
                  type="number"
                  step="0.1"
                  value={vin[k].offset}
                  onChange={(e) => setVideo(k, { offset: e.target.value })}
                />
              </div>
            ))}
            <p className="muted ed-hint">
              選到的版本會顯示在下方播放器，<strong>下面的歌詞與打點也是在編輯這個版本</strong>，
              每個版本的歌詞和時間各自獨立。最右邊是「歌詞偏移（秒）」：歌詞時間 = 影片播放時間 + 偏移，
              通常填 0 就好；沒有自己歌詞的版本，會借用其他版本的歌詞，這時偏移才用得到。
            </p>
          </fieldset>

          <label className="ed-field">
            應援歌單順序（留空代表不在應援歌單）
            <input type="number" min="1" step="1" value={order} onChange={(e) => setOrder(e.target.value)} />
          </label>

          <div className="video">
            <div ref={containerRef} className="video-inner" />
            {!videoId && <p className="video-error">在上面填入「{VIDEO_LABEL[kind]}」的網址就會顯示在這裡</p>}
            {error && <p className="video-error" role="alert">{error}</p>}
          </div>

          <p className="ed-editing">
            正在編輯：<strong>{VIDEO_LABEL[kind]}</strong> 的歌詞（{lines.length} 行）
          </p>

          <div className="ed-stamp">
            <button type="button" className="stamp-btn" onClick={stamp} disabled={!ready || cursor >= lines.length}>
              打點（空白鍵）
            </button>
            <span className="muted">
              目前 {formatClock(now)}・下一行：第 {Math.min(cursor + 1, lines.length)} / {lines.length} 行
            </span>
          </div>
          <p className="muted ed-hint">
            每一行開始唱的瞬間按空白鍵（已自動提早 {LEAD_SEC} 秒）。上下方向鍵可移動目前行，也能直接改右邊的分與秒。
            按鍵沒反應時，先點一下影片外的空白處。
          </p>

          <label className="ed-field">
            貼上「{VIDEO_LABEL[kind]}」的歌詞
            <textarea
              value={raw}
              onChange={(e) => setRawBy((r) => ({ ...r, [kind]: e.target.value }))}
              placeholder={"原文歌詞\n翻譯\n\n(( 空耳 ))\n原文歌詞\n翻譯\n\n(( 要喊的詞 ))"}
            />
          </label>
          <div className="ed-actions">
            <button type="button" className="btn" onClick={handleParse} disabled={!raw.trim()}>
              解析並取代目前的歌詞
            </button>
            {copySources.length > 0 && (
              <select
                className="ed-copy"
                aria-label="從其他版本帶入歌詞文字"
                value=""
                onChange={(e) => e.target.value && copyFrom(e.target.value as VideoKind)}
              >
                <option value="">從其他版本帶入歌詞…</option>
                {copySources.map((k) => (
                  <option key={k} value={k}>
                    {VIDEO_LABEL[k]}（{linesBy[k].length} 行）
                  </option>
                ))}
              </select>
            )}
            {skipped > 0 && <span className="muted">已略過 {skipped} 行備註（以 * 開頭）</span>}
          </div>

          <div className="ed-actions">
            <button type="button" className="stamp-btn" onClick={save} disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </button>
            <button type="button" className="btn" onClick={copyJson}>複製 JSON</button>
          </div>
        </section>

        <section className="ed-right" aria-label={`${VIDEO_LABEL[kind]}的歌詞行`}>
          {lines.length === 0 ? (
            <p className="empty">
              「{VIDEO_LABEL[kind]}」還沒有歌詞。貼上歌詞並按「解析」，或從其他版本帶入，會顯示在這裡。
              只設定影片的話，可以直接按儲存。
            </p>
          ) : (
            <ol className="ed-lines">
              {lines.map((l, i) => (
                <li
                  key={i}
                  className={["ed-row", i === cursor ? "is-cursor" : "", l.chant ? `has-chant c-${l.chant}` : ""]
                    .join(" ")
                    .trim()}
                >
                  <button type="button" className="ed-idx" onClick={() => setCursor(i)} aria-label={`把第 ${i + 1} 行設為目前行`}>
                    {i + 1}
                  </button>
                  <span className="ed-text">
                    {l.chant && <span className="line-tag">{CHANT_LABEL[l.chant]}</span>}
                    {l.roman && <span className="line-roman">{l.roman}</span>}
                    <span className="line-text">{l.text}</span>
                    {l.sub && <span className="line-sub">{l.sub}</span>}
                  </span>
                  <TimeInput value={l.startSec} onChange={(v) => setStart(i, v)} label={`第 ${i + 1} 行開始時間`} />
                  <button
                    type="button"
                    className="btn"
                    disabled={l.startSec == null || !ready}
                    onClick={() => seekTo(Math.max(0, (l.startSec as number) - offset))}
                  >
                    播放
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      {msg && (
        <div className={msg.ok ? "toast toast-ok" : "toast toast-err"} role={msg.ok ? "status" : "alert"}>
          <span>{msg.text}</span>
          <button type="button" className="toast-close" onClick={() => setMsg(null)} aria-label="關閉訊息">✕</button>
        </div>
      )}
    </main>
  );
}
