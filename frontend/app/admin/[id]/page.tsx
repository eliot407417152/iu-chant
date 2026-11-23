import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Editor from "@/components/Editor";
import { getSong } from "@/lib/api";

export const metadata: Metadata = { title: "編輯歌曲", robots: { index: false, follow: false } };

export default async function AdminSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await getSong(id);
  if (!song) notFound();
  return <Editor song={song} />;
}
