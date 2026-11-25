import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Editor from "@/components/Editor";
import { getAlbums, getSong } from "@/lib/api";

export const metadata: Metadata = { title: "編輯歌曲", robots: { index: false, follow: false } };

export default async function AdminSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [song, albums] = await Promise.all([getSong(id, { fresh: true }), getAlbums({ fresh: true })]);
  if (!song) notFound();

  // 清單上的資料（曲序、時長、主打、備註）在專輯列表裡
  const summary = albums.flatMap((a) => a.songs).find((s) => s.id === id);
  const meta = {
    title: song.title,
    albumId: song.albumId,
    trackNo: summary?.trackNo ?? 1,
    durationSec: summary?.durationSec ?? 0,
    titleTrack: summary?.isTitleTrack ?? false,
    featuring: summary?.featuring,
    note: summary?.note,
  };
  return <Editor song={song} meta={meta} albums={albums.map((a) => ({ id: a.id, title: a.title }))} />;
}
