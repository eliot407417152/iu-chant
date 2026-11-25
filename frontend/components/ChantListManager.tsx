"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminAuthError, adminFetch } from "@/lib/admin";
import type { Album } from "@/lib/types";

interface Props {
  albums: Album[];
  adminKey: string;
  onAuthFail: () => void;
}

interface Entry {
  id: string;
  title: string;
  albumTitle: string;
}

/** 管理應援歌單：加入／移除歌曲、上下調整順序，一次儲存 */
export default function ChantListManager({ albums, adminKey, onAuthFail }: Props) {
  const router = useRouter();
  const all = useMemo(() => {
    const map = new Map<string, Entry & { chantOrder?: number }>();
    for (const a of albums) {
      for (const s of a.songs) map.set(s.id, { id: s.id, title: s.title, albumTitle: a.title, chantOrder: s.chantOrder });
    }
    return map;
  }, [albums]);

  const savedIds = useMemo(
    () =>
      [...all.values()]
        .filter((s) => s.chantOrder != null)
        .sort((x, y) => (x.chantOrder ?? 0) - (y.chantOrder ?? 0))
        .map((s) => s.id),
    [all],
  );

  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>(savedIds);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = ids.join("|") !== savedIds.join("|");
  const inList = new Set(ids);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = ids.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch(adminKey, "/api/admin/songs/chant-list", "PUT", { songs: ids });
      setMsg({ ok: true, text: `✓ 應援歌單已儲存（${ids.length} 首）。公開頁面最多幾分鐘內更新。` });
      router.refresh();
    } catch (e) {
      if (e instanceof AdminAuthError) onAuthFail();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "儲存失敗" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="backup-card" aria-label="應援歌單管理">
      <div className="chant-mgr-head">
        <h2>應援歌單（{savedIds.length} 首）</h2>
        <button type="button" className={open ? "btn is-on" : "btn"} onClick={() => setOpen((v) => !v)}>
          {open ? "收合" : "管理歌單內容與順序"}
        </button>
      </div>

      {open && (
        <>
          <p className="muted ed-hint">用 ↑ ↓ 調整順序，按 ✕ 移出歌單，下方可以加入其他歌曲。調整完按「儲存歌單」才會生效。</p>
          <ol className="chant-mgr-list">
            {ids.map((id, i) => {
              const e = all.get(id);
              return (
                <li key={id} className="chant-mgr-row">
                  <span className="track-no">{i + 1}</span>
                  <span className="chant-mgr-title">
                    {e?.title ?? id}
                    <span className="muted">　{e?.albumTitle}</span>
                  </span>
                  <span className="ed-row-btns">
                    <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`把「${e?.title}」往上移`}>↑</button>
                    <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`把「${e?.title}」往下移`}>↓</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label={`把「${e?.title}」移出歌單`}>✕</button>
                  </span>
                </li>
              );
            })}
            {ids.length === 0 && <li className="muted chant-mgr-row">歌單目前是空的。</li>}
          </ol>

          <div className="ed-actions">
            <select
              className="ed-copy"
              aria-label="加入歌曲到應援歌單"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
            >
              <option value="">加入歌曲…</option>
              {[...albums].reverse().map((a) => {
                const rest = a.songs.filter((s) => !inList.has(s.id));
                if (rest.length === 0) return null;
                return (
                  <optgroup key={a.id} label={a.title}>
                    {rest.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!picked}
              onClick={() => {
                setIds([...ids, picked]);
                setPicked("");
              }}
            >
              加到最後
            </button>
            <button type="button" className="stamp-btn" onClick={save} disabled={busy || !dirty}>
              {busy ? "儲存中…" : "儲存歌單"}
            </button>
            {dirty && (
              <button type="button" className="btn" onClick={() => setIds(savedIds)} disabled={busy}>還原</button>
            )}
          </div>
        </>
      )}
      {msg && <p className={msg.ok ? "ed-ok" : "ed-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </section>
  );
}
