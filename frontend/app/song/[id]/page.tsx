import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SongView from "@/components/SongView";
import { getAlbums, getSong } from "@/lib/api";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { VIDEO_KINDS } from "@/lib/types";
import type { ListKey, QueueAlbum } from "@/lib/queue";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const song = await getSong(id);
  if (!song) return { title: "找不到歌曲", robots: { index: false, follow: false } };

  const hasLyrics = VIDEO_KINDS.some((k) => (song.lyrics?.[k]?.length ?? 0) > 0);
  const hasVideo = VIDEO_KINDS.some((k) => !!song.videos?.[k]);
  const year = song.releaseDate?.slice(0, 4);

  const title = `${song.title} 應援法・歌詞空耳`;
  const description = hasLyrics
    ? `IU〈${song.title}〉（${song.albumTitle}${year ? `，${year}` : ""}）的歌詞、空耳與應援法，邊看影片邊跟著唱。`
    : `IU〈${song.title}〉（${song.albumTitle}${year ? `，${year}` : ""}），收錄於 ${SITE_NAME}。`;
  const path = `/song/${encodeURIComponent(song.id)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    // 內容太少的頁面（沒影片也沒歌詞）先不要讓 Google 收錄，補上內容後自動恢復
    robots: hasLyrics || hasVideo ? undefined : { index: false, follow: true },
    openGraph: { type: "article", url: path, title: `${song.title}｜${SITE_NAME}`, description, locale: "zh_TW" },
  };
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ list?: string; autoplay?: string }>;
}) {
  const { id } = await params;
  const { list, autoplay } = await searchParams;

  const [song, albums] = await Promise.all([getSong(id), getAlbums()]);
  if (!song) notFound();

  // 只把建立播放佇列需要的欄位交給瀏覽器
  const queueAlbums: QueueAlbum[] = albums.map((a) => ({
    id: a.id,
    title: a.title,
    songs: a.songs.map((s) => ({ id: s.id, title: s.title, hasVideo: s.hasVideo, chantOrder: s.chantOrder })),
  }));
  const initialList: ListKey = list === "chant" ? "chant" : "album";

  // 結構化資料：幫助 Google 理解這是 IU 的哪一首歌、收錄在哪張專輯
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    url: `${SITE_URL}/song/${encodeURIComponent(song.id)}`,
    byArtist: { "@type": "MusicGroup", name: "IU" },
    inAlbum: { "@type": "MusicAlbum", name: song.albumTitle },
    ...(song.releaseDate ? { datePublished: song.releaseDate } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // 把 < 跳脫掉，避免歌名裡有特殊字元時破壞 HTML
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SongView initialSong={song} albums={queueAlbums} initialList={initialList} initialAutoplay={autoplay === "1"} />
    </>
  );
}
