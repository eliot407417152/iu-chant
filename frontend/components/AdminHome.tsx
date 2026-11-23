"use client";

import Link from "next/link";
import { useState } from "react";
import type { Album } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useAdmin } from "./AdminProvider";
import BackupPanel from "./BackupPanel";
import CoverEditor from "./CoverEditor";

export default function AdminHome({ albums }: { albums: Album[] }) {
  const { adminKey, ready, login, logout } = useAdmin();
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // 剛上傳或移除的封面先記在這裡，不用等頁面快取更新就能看到結果
  const [covers, setCovers] = useState<Record<string, string | null>>({});

  if (!ready) return null;

  if (!adminKey) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setMsg("");
      const r = await login(input.trim());
      setBusy(false);
      if (r === "denied") setMsg("管理金鑰錯誤。");
      else if (r === "error") setMsg("無法連線到後端，請確認後端已啟動。");
    };
    return (
      <main className="shell">
        <nav><Link href="/" className="back">‹ 回首頁</Link></nav>
        <header className="song-head">
          <h1>管理員登入</h1>
          <p className="muted">輸入管理金鑰後，就能直接編輯每一首歌的影片、歌詞與應援法。</p>
        </header>
        <form className="login-card" onSubmit={submit}>
          <label className="ed-field">
            管理金鑰
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" autoFocus />
          </label>
          <button type="submit" className="stamp-btn" disabled={busy || !input.trim()}>登入</button>
          {msg && <p role="alert" className="ed-err">{msg}</p>}
        </form>
      </main>
    );
  }

  const all = albums.flatMap((a) => a.songs);
  const withVideo = all.filter((s) => s.hasVideo).length;
  const withChant = all.filter((s) => s.hasChant).length;
  const inList = all.filter((s) => s.chantOrder != null).length;
  const newestFirst = [...albums].reverse();

  return (
    <main className="shell">
      <nav><Link href="/" className="back">‹ 回首頁</Link></nav>
      <header className="song-head">
        <h1>管理員模式</h1>
        <p className="muted">
          共 {all.length} 首・已有影片 {withVideo} 首・已整理應援法 {withChant} 首・應援歌單 {inList} 首。點任何一首進入編輯。
        </p>
      </header>

      <BackupPanel adminKey={adminKey} onAuthFail={logout} />

      {newestFirst.map((album) => (
        <section key={album.id} className="album">
          <h2 className="admin-album-title">
            {album.title}
            <span className="muted">　{album.typeLabel}・{formatDate(album.releaseDate)}</span>
          </h2>
          <CoverEditor
            slug={album.id}
            title={album.title}
            coverUrl={(album.id in covers ? covers[album.id] : album.coverUrl) ?? undefined}
            adminKey={adminKey}
            onAuthFail={logout}
            onChange={(url) => setCovers((c) => ({ ...c, [album.id]: url ?? null }))}
          />
          <ol className="tracks">
            {album.songs.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/${s.id}`} className="track admin-track">
                  <span className="track-no">{s.trackNo}</span>
                  <span className="track-main">
                    <span className="track-title">{s.title}</span>
                  </span>
                  <span className="track-tags">
                    {s.chantOrder != null && <span className="tag">應援歌單 #{s.chantOrder}</span>}
                    {s.hasChant && <span className="chip chip-all">應援法</span>}
                    {s.hasVideo ? <span className="tag">有影片</span> : <span className="muted">尚無影片</span>}
                  </span>
                  <span className="track-time">編輯 ›</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
