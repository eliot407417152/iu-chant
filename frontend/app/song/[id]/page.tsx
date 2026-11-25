import { notFound } from "next/navigation";
import SongView from "@/components/SongView";
import { getAlbums, getSong } from "@/lib/api";
import type { ListKey, QueueAlbum } from "@/lib/queue";

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

  return <SongView initialSong={song} albums={queueAlbums} initialList={initialList} initialAutoplay={autoplay === "1"} />;
}
