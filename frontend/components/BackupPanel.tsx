"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PUBLIC_API_URL } from "@/lib/config";

interface Props {
  adminKey: string;
  onAuthFail: () => void;
}

interface BackupShape {
  version: number;
  albums: { songs: { lyrics?: Record<string, unknown[]> }[] }[];
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 匯出／匯入備份：包含專輯、歌曲、所有影片版本、應援歌單順序與各版本歌詞 */
export default function BackupPanel({ adminKey, onAuthFail }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleAuth = (status: number) => {
    if (status !== 401) return false;
    setMsg({ ok: false, text: "管理金鑰已失效，請重新登入。" });
    onAuthFail();
    return true;
  };

  const doExport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/admin/backup`, { headers: { "X-Admin-Key": adminKey } });
      if (handleAuth(res.status)) return;
      if (!res.ok) return setMsg({ ok: false, text: `匯出失敗（${res.status}）。` });
      const text = await res.text();
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `iu-chant-backup-${stamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: "已匯出備份檔，請把下載的 JSON 檔收好。" });
    } catch {
      setMsg({ ok: false, text: "無法連線到後端，請確認後端已啟動。" });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setMsg(null);
    let data: BackupShape;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return setMsg({ ok: false, text: "這個檔案不是有效的 JSON。" });
    }
    if (!data || data.version !== 1 || !Array.isArray(data.albums)) {
      return setMsg({ ok: false, text: "這不是本網站匯出的備份檔（格式或版本不符）。" });
    }
    const songs = data.albums.reduce((n, a) => n + (a.songs?.length ?? 0), 0);
    const ok = window.confirm(
      `備份檔內有 ${data.albums.length} 張專輯、${songs} 首歌。\n\n` +
        "匯入會依 slug 覆蓋這些歌曲的影片、應援歌單順序與歌詞；備份檔裡沒有的歌曲不受影響。\n" +
        "建議先按「匯出備份」留一份目前的資料。確定要匯入嗎？",
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/admin/backup/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(data),
      });
      if (handleAuth(res.status)) return;
      if (!res.ok) {
        return setMsg({ ok: false, text: `匯入失敗（${res.status}）：${(await res.text()).slice(0, 200)}` });
      }
      const r: { albums: number; songs: number; lyricLines: number } = await res.json();
      setMsg({
        ok: true,
        text: `匯入完成：${r.albums} 張專輯、${r.songs} 首歌、${r.lyricLines} 行歌詞。前台頁面最多幾分鐘內更新。`,
      });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "無法連線到後端，請確認後端已啟動。" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="backup-card" aria-label="備份與還原">
      <h2>備份與還原</h2>
      <p className="muted">
        匯出會把所有影片（含LIVE版）、應援歌單順序、各版本歌詞存成一個 JSON 檔；匯入會依歌曲代稱覆蓋回去。
      </p>
      <div className="backup-actions">
        <button type="button" className="stamp-btn" onClick={doExport} disabled={busy}>匯出備份</button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>匯入備份…</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = ""; // 之後可以再選同一個檔案
            if (f) void doImport(f);
          }}
        />
      </div>
      {msg && <p role="status" className={msg.ok ? "ed-ok" : "ed-err"} style={{ marginTop: 10 }}>{msg.text}</p>}
    </section>
  );
}
