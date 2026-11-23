import Link from "next/link";
import { notFound } from "next/navigation";
import AdminEditLink from "@/components/AdminEditLink";
import LyricsPlayer from "@/components/LyricsPlayer";
import { getAlbums, getSong } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { buildQueue, neighbors, type ListKey } from "@/lib/queue";
import { VIDEO_KINDS } from "@/lib/types";

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

  // 播放佇列：應援歌單，或同一張專輯
  let listKey: ListKey = list === "chant" ? "chant" : "album";
  let queue = buildQueue(albums, listKey, song.albumId);
  if (!queue.some((q) => q.id === song.id)) {
    listKey = "album";
    queue = buildQueue(albums, "album", song.albumId);
  }
  const { prev, next, position, total } = neighbors(queue, song.id, listKey === "chant");
  const hrefOf = (songId: string) => `/song/${songId}?list=${listKey}&autoplay=1`;
  const queueLabel = `${listKey === "chant" ? "應援歌單" : song.albumTitle} ${position} / ${total}`;

  const hasVideo = VIDEO_KINDS.some((k) => song.videos[k]);

  return (
    <main className="shell">
      <nav className="song-nav">
        <Link href={`/#album-${song.albumId}`} className="back">‹ {song.albumTitle}</Link>
        <AdminEditLink songId={song.id} />
      </nav>
      <header className="song-head">
        <h1>{song.title}</h1>
        <p className="muted">
          {song.albumTitle}・{formatDate(song.releaseDate)}
          {song.featuring && `・${song.featuring}`}
        </p>
      </header>

      {hasVideo ? (
        <LyricsPlayer
          key={song.id}
          videos={song.videos}
          lyrics={song.lyrics}
          autoplay={autoplay === "1"}
          prev={prev ? { href: hrefOf(prev.id), title: prev.title } : undefined}
          next={next ? { href: hrefOf(next.id), title: next.title } : undefined}
          queueLabel={queueLabel}
        />
      ) : (
        <p className="empty">這首歌的影片與應援法還在整理中。</p>
      )}
    </main>
  );
}
