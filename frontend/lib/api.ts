import type { Album, Song } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:8080";
// 開發時不快取，改資料後重新整理就能看到；正式環境快取 5 分鐘
const revalidate = process.env.NODE_ENV === "development" ? 0 : 300;

export async function getAlbums(): Promise<Album[]> {
  const res = await fetch(`${API_URL}/api/albums`, { next: { revalidate } });
  if (!res.ok) throw new Error("無法取得專輯列表，請確認後端已啟動");
  return res.json();
}

export async function getSong(id: string): Promise<Song | null> {
  const res = await fetch(`${API_URL}/api/songs/${encodeURIComponent(id)}`, { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("無法取得歌曲，請確認後端已啟動");
  return res.json();
}
