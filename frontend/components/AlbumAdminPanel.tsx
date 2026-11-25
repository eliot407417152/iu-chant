"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminAuthError, adminFetch } from "@/lib/admin";
import { ALBUM_TYPES, type Album, type AlbumType } from "@/lib/types";
import { parseDuration } from "./SongMetaForm";

interface Props {
  album: Album;
  adminKey: string;
  onAuthFail: () => void;
}

/** 專輯標題下方的「編輯專輯」與「新增歌曲」：改曲名、類別（決定首頁分類）、發行日期、備註 */
export default function AlbumAdminPanel({ album, adminKey, onAuthFail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<"none" | "album" | "song">("none");
  const [title, setTitle] = useState(album.title);
  const [typeLabel, setTypeLabel] = useState(album.typeLabel);
  const [type, setType] = useState<AlbumType>(album.type);
  const [date, setDate] = useState(album.releaseDate);
  const [note, setNote] = useState(album.note ?? "");

  const [newTitle, setNewTitle] = useState("");
  const [newTrack, setNewTrack] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newMain, setNewMain] = useState(false);
  const [newFeat, setNewFeat] = useState("");
  const [newNote, setNewNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      router.refresh();
    } catch (e) {
      if (e instanceof AdminAuthError) onAuthFail();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "操作失敗" });
    } finally {
      setBusy(false);
    }
  };

  const saveAlbum = () =>
    run(async () => {
      if (!title.trim() || !typeLabel.trim()) throw new Error("專輯名稱與類別名稱不能是空的。");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("發行日期請用 YYYY-MM-DD，例如 2024-05-01。");
      await adminFetch(adminKey, `/api/admin/albums/${encodeURIComponent(album.id)}`, "PUT", {
        title: title.trim(),
        typeLabel: typeLabel.trim(),
        type,
        releaseDate: date,
        note: note.trim(),
      });
      return "✓ 專輯資料已儲存。公開頁面最多幾分鐘內更新。";
    });

  const addSong = () =>
    run(async () => {
      if (!newTitle.trim()) throw new Error("請填曲名。");
      const sec = parseDuration(newDuration);
      if (sec == null) throw new Error("時長請填「3:25」這種格式，或留空。");
      if (newTrack.trim() && !(Number.isInteger(Number(newTrack)) && Number(newTrack) >= 1)) {
        throw new Error("曲序必須是 1 以上的整數，或留空（自動排在最後）。");
      }
      await adminFetch(adminKey, `/api/admin/albums/${encodeURIComponent(album.id)}/songs`, "POST", {
        title: newTitle.trim(),
        trackNo: newTrack.trim() ? Number(newTrack) : null,
        durationSec: sec,
        titleTrack: newMain,
        featuring: newFeat.trim(),
        note: newNote.trim(),
      });
      setNewTitle("");
      setNewTrack("");
      setNewDuration("");
      setNewMain(false);
      setNewFeat("");
      setNewNote("");
      return "✓ 已新增歌曲，點進那首歌就能補影片與歌詞。";
    });

  return (
    <div className="admin-box">
      <div className="ed-actions">
        <button type="button" className={open === "album" ? "btn is-on" : "btn"} onClick={() => setOpen(open === "album" ? "none" : "album")}>
          編輯專輯資料
        </button>
        <button type="button" className={open === "song" ? "btn is-on" : "btn"} onClick={() => setOpen(open === "song" ? "none" : "song")}>
          ＋ 新增歌曲
        </button>
      </div>

      {open === "album" && (
        <div className="admin-form">
          <label className="ed-edit-field">
            專輯／單曲名稱
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="ed-edit-two">
            <label className="ed-edit-field">
              分類（決定首頁出現在哪個分類）
              <select value={type} onChange={(e) => setType(e.target.value as AlbumType)}>
                {ALBUM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="ed-edit-field">
              類別名稱（顯示用，例如「迷你一輯」）
              <input value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} />
            </label>
          </div>
          <div className="ed-edit-two">
            <label className="ed-edit-field">
              發行日期（YYYY-MM-DD）
              <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2024-05-01" inputMode="numeric" />
            </label>
            <label className="ed-edit-field">
              備註（沒有就留空）
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          <div className="ed-actions">
            <button type="button" className="stamp-btn" onClick={saveAlbum} disabled={busy}>{busy ? "處理中…" : "儲存專輯資料"}</button>
          </div>
        </div>
      )}

      {open === "song" && (
        <div className="admin-form">
          <label className="ed-edit-field">
            曲名
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </label>
          <div className="ed-edit-two">
            <label className="ed-edit-field">
              曲序（留空會排在最後）
              <input type="number" min="1" step="1" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} />
            </label>
            <label className="ed-edit-field">
              時長（3:25，沒有就留空）
              <input value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder="3:25" inputMode="numeric" />
            </label>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={newMain} onChange={(e) => setNewMain(e.target.checked)} />
            標示為「主打」
          </label>
          <div className="ed-edit-two">
            <label className="ed-edit-field">
              Feat. 標註
              <input value={newFeat} onChange={(e) => setNewFeat(e.target.value)} />
            </label>
            <label className="ed-edit-field">
              備註
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            </label>
          </div>
          <div className="ed-actions">
            <button type="button" className="stamp-btn" onClick={addSong} disabled={busy}>{busy ? "處理中…" : "新增這首歌"}</button>
          </div>
        </div>
      )}

      {msg && <p className={msg.ok ? "ed-ok" : "ed-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}
