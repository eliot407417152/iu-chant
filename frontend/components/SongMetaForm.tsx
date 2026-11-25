"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminAuthError, adminFetch } from "@/lib/admin";
import { formatDuration } from "@/lib/format";

export interface SongMeta {
  title: string;
  albumId: string;
  trackNo: number;
  durationSec: number;
  titleTrack: boolean;
  featuring?: string;
  note?: string;
}

interface Props {
  slug: string;
  initial: SongMeta;
  albums: { id: string; title: string }[];
  adminKey: string;
  onAuthFail: () => void;
  /** 儲存成功後通知上層（例如更新標題） */
  onSaved?: (meta: SongMeta) => void;
}

/** 「3:25」或「205」→ 秒；格式不對回傳 null */
export function parseDuration(input: string): number | null {
  const t = input.trim();
  if (t === "") return 0;
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** 編輯清單上的資料：曲名、所屬專輯、曲序、時長，以及「主打」「Feat.」「備註」這些標註 */
export default function SongMetaForm({ slug, initial, albums, adminKey, onAuthFail, onSaved }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [albumId, setAlbumId] = useState(initial.albumId);
  const [trackNo, setTrackNo] = useState(String(initial.trackNo));
  const [duration, setDuration] = useState(initial.durationSec > 0 ? formatDuration(initial.durationSec) : "");
  const [titleTrack, setTitleTrack] = useState(initial.titleTrack);
  const [featuring, setFeaturing] = useState(initial.featuring ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof AdminAuthError) onAuthFail();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "操作失敗" });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const sec = parseDuration(duration);
      if (!title.trim()) throw new Error("曲名不能是空的。");
      if (!(Number.isInteger(Number(trackNo)) && Number(trackNo) >= 1)) throw new Error("曲序必須是 1 以上的整數。");
      if (sec == null) throw new Error("時長請填「3:25」這種格式，或直接填秒數；沒有就留空。");
      const body = {
        title: title.trim(),
        trackNo: Number(trackNo),
        durationSec: sec,
        titleTrack,
        featuring: featuring.trim(),
        note: note.trim(),
        albumId,
      };
      await adminFetch(adminKey, `/api/admin/songs/${encodeURIComponent(slug)}/meta`, "PUT", body);
      onSaved?.({ ...body, featuring: body.featuring || undefined, note: body.note || undefined });
      setMsg({
        ok: true,
        text:
          albumId !== initial.albumId
            ? "✓ 已儲存，這首歌已搬到另一張專輯。公開頁面最多幾分鐘內更新。"
            : "✓ 已儲存。公開頁面最多幾分鐘內更新。",
      });
      router.refresh();
    });

  const remove = () => {
    if (!window.confirm(`確定要刪除〈${initial.title}〉嗎？\n它的影片、歌詞與應援法都會一起刪除，無法復原。`)) return;
    return run(async () => {
      await adminFetch(adminKey, `/api/admin/songs/${encodeURIComponent(slug)}`, "DELETE");
      router.push("/admin");
    });
  };

  return (
    <fieldset className="ed-videos admin-meta">
      <legend>清單資料與標註</legend>
      <label className="ed-edit-field">
        曲名
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="ed-edit-field">
        所屬專輯（換掉就是把這首歌搬到別張專輯）
        <select value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </label>
      <div className="ed-edit-two">
        <label className="ed-edit-field">
          曲序
          <input type="number" min="1" step="1" value={trackNo} onChange={(e) => setTrackNo(e.target.value)} />
        </label>
        <label className="ed-edit-field">
          時長（3:25，沒有就留空）
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:25" inputMode="numeric" />
        </label>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={titleTrack} onChange={(e) => setTitleTrack(e.target.checked)} />
        標示為「主打」
      </label>
      <label className="ed-edit-field">
        Feat. 標註（例如 Feat. Mario；沒有就留空）
        <input value={featuring} onChange={(e) => setFeaturing(e.target.value)} />
      </label>
      <label className="ed-edit-field">
        備註（顯示在曲名下面，例如 先行單曲；沒有就留空）
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="muted ed-hint">
        「應援歌」標籤由下方「應援歌單順序」決定；「應援法」標籤是歌詞裡有標應援就會自動出現。
      </p>
      <div className="ed-actions">
        <button type="button" className="stamp-btn" onClick={save} disabled={busy}>
          {busy ? "處理中…" : "儲存清單資料"}
        </button>
        <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>刪除這首歌</button>
      </div>
      {msg && <p className={msg.ok ? "ed-ok" : "ed-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </fieldset>
  );
}
