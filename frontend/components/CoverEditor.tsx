"use client";

import { useRef, useState } from "react";
import { coverSrc, PUBLIC_API_URL } from "@/lib/config";
import { resizeToJpeg } from "@/lib/image";

interface Props {
  slug: string;
  title: string;
  /** 目前的封面網址（可能是相對路徑） */
  coverUrl?: string;
  adminKey: string;
  onAuthFail: () => void;
  /** 上傳或移除成功後，通知上層新的封面網址 */
  onChange: (url: string | undefined) => void;
}

/** 管理員頁面裡每張專輯的封面縮圖，以及更換／移除按鈕 */
export default function CoverEditor({ slug, title, coverUrl, adminKey, onAuthFail, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const endpoint = `${PUBLIC_API_URL}/api/admin/albums/${encodeURIComponent(slug)}/cover`;

  const fail = async (res: Response) => {
    if (res.status === 401) {
      setMsg({ ok: false, text: "管理金鑰已失效，請重新登入。" });
      onAuthFail();
    } else {
      setMsg({ ok: false, text: `失敗（${res.status}）：${(await res.text()).slice(0, 120)}` });
    }
  };

  const upload = async (file: File) => {
    setMsg(null);
    if (!file.type.startsWith("image/")) return setMsg({ ok: false, text: "請選擇圖片檔。" });
    setBusy(true);
    try {
      const blob = await resizeToJpeg(file);
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg", "X-Admin-Key": adminKey },
        body: blob,
      });
      if (!res.ok) return await fail(res);
      const r: { coverUrl?: string } = await res.json();
      onChange(r.coverUrl);
      setMsg({ ok: true, text: "✓ 封面已更新" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "無法處理這張圖片，或無法連線到後端。" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`確定要移除「${title}」上傳的封面嗎？`)) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE", headers: { "X-Admin-Key": adminKey } });
      if (!res.ok) return await fail(res);
      const r: { coverUrl?: string } = await res.json();
      onChange(r.coverUrl);
      setMsg({ ok: true, text: "✓ 已移除封面" });
    } catch {
      setMsg({ ok: false, text: "無法連線到後端，請確認後端已啟動。" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cover-editor">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cover-thumb" src={coverSrc(coverUrl)} alt={`${title} 封面`} />
      ) : (
        <div className="cover-thumb cover-thumb-empty" aria-hidden="true">無封面</div>
      )}
      <div className="cover-editor-actions">
        <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "處理中…" : coverUrl ? "更換封面" : "上傳封面"}
        </button>
        {coverUrl && (
          <button type="button" className="btn" disabled={busy} onClick={remove}>移除封面</button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        {msg && <span role="status" className={msg.ok ? "ed-ok" : "ed-err"}>{msg.text}</span>}
      </div>
    </div>
  );
}
