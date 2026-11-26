import type { MetadataRoute } from "next";
import { getAlbums } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

// 每次被請求時才產生（不在建置時產生），避免 Render 建置時後端還沒啟動而失敗
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home: MetadataRoute.Sitemap = [{ url: SITE_URL, changeFrequency: "weekly", priority: 1 }];

  try {
    const albums = await getAlbums();
    const seen = new Set<string>();
    const songs: MetadataRoute.Sitemap = [];
    for (const album of albums) {
      for (const s of album.songs) {
        // 沒有影片也沒有應援法的歌頁面內容太少，先不放進 sitemap，等補上內容後會自動加入
        if (!s.hasVideo && !s.hasChant) continue;
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        songs.push({
          url: `${SITE_URL}/song/${encodeURIComponent(s.id)}`,
          lastModified: album.releaseDate ? new Date(album.releaseDate) : undefined,
          changeFrequency: "monthly",
          priority: s.chantOrder != null ? 0.9 : 0.6,
        });
      }
    }
    return [...home, ...songs];
  } catch {
    // 後端暫時連不上時，至少回傳首頁
    return home;
  }
}
