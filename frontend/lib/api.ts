import type { Album, Song } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:8080";
// 開發時不快取，改資料後重新整理就能看到；正式環境快取 5 分鐘
const revalidate = process.env.NODE_ENV === "development" ? 0 : 300;

/** fresh：管理員頁面用，一律拿最新資料（不經過 5 分鐘快取），改完才看得到結果 */
export async function getAlbums(opts: { fresh?: boolean } = {}): Promise<Album[]> {
  const res = await fetch(`${API_URL}/api/albums`, opts.fresh ? { cache: "no-store" } : { next: { revalidate } });
  if (!res.ok) throw new Error("無法取得專輯列表，請確認後端已啟動");
  return res.json();
}

export async function getSong(id: string, opts: { fresh?: boolean } = {}): Promise<Song | null> {
  const res = await fetch(
    `${API_URL}/api/songs/${encodeURIComponent(id)}`,
    opts.fresh ? { cache: "no-store" } : { next: { revalidate } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("無法取得歌曲，請確認後端已啟動");
  return res.json();
}

/** 瀏覽器端讀單首歌（歌曲頁切換上下首時用，不需要重新載入整個頁面） */
export async function fetchSongClient(id: string, apiUrl: string): Promise<Song> {
  const res = await fetch(`${apiUrl}/api/songs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`song ${res.status}`);
  return res.json();
}
