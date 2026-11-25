"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSongClient } from "@/lib/api";
import { PUBLIC_API_URL } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { buildQueue, neighbors, type ListKey, type QueueAlbum } from "@/lib/queue";
import { VIDEO_KINDS, type Song } from "@/lib/types";
import AdminEditLink from "./AdminEditLink";
import LyricsPlayer from "./LyricsPlayer";

interface Props {
  initialSong: Song;
  /** 建立播放佇列用的精簡專輯資料 */
  albums: QueueAlbum[];
  initialList: ListKey;
  initialAutoplay: boolean;
}

/**
 * 歌曲頁。上一首／下一首／自動連播都在這裡切換歌曲，不會重新載入頁面：
 * 播放器沿用同一個，手機瀏覽器才不會擋掉後面歌曲的自動播放。
 * 切換時用 replaceState 改網址（不新增瀏覽紀錄），所以按瀏覽器「上一頁」會直接回到你進來的清單。
 */
export default function SongView({ initialSong, albums, initialList, initialAutoplay }: Props) {
  const router = useRouter();
  const [song, setSong] = useState(initialSong);
  const [listKey, setListKey] = useState<ListKey>(initialList);
  const [autoplay, setAutoplay] = useState(initialAutoplay);
  const cache = useRef(new Map<string, Song>([[initialSong.id, initialSong]]));

  // 播放佇列：應援歌單，或同一張專輯；這首歌不在應援歌單裡就改用專輯
  let effectiveList: ListKey = listKey;
  let queue = buildQueue(albums, effectiveList, song.albumId);
  if (!queue.some((q) => q.id === song.id)) {
    effectiveList = "album";
    queue = buildQueue(albums, "album", song.albumId);
  }
  const { prev, next, position, total } = neighbors(queue, song.id, effectiveList === "chant");
  const hrefOf = useCallback((id: string) => `/song/${id}?list=${effectiveList}`, [effectiveList]);
  const queueLabel = `${effectiveList === "chant" ? "應援歌單" : song.albumTitle} ${position} / ${total}`;

  // 先把下一首抓好，切換時就不用等
  useEffect(() => {
    if (!next || cache.current.has(next.id)) return;
    fetchSongClient(next.id, PUBLIC_API_URL)
      .then((s) => cache.current.set(s.id, s))
      .catch(() => {});
  }, [next]);

  useEffect(() => {
    document.title = `${song.title}・IU 應援歌單`;
  }, [song.title]);

  const navigate = useCallback(
    async (id: string) => {
      try {
        const target = cache.current.get(id) ?? (await fetchSongClient(id, PUBLIC_API_URL));
        cache.current.set(id, target);
        setSong(target);
        setListKey(effectiveList);
        setAutoplay(true);
        // replace：不新增瀏覽紀錄，「上一頁」會回到清單，而不是上一首歌
        window.history.replaceState(window.history.state, "", hrefOf(id));
        window.scrollTo({ top: 0 });
      } catch {
        // 抓不到資料就用一般換頁當備案
        router.replace(`${hrefOf(id)}&autoplay=1`);
      }
    },
    [effectiveList, hrefOf, router],
  );

  const hasVideo = VIDEO_KINDS.some((k) => song.videos[k]);
  // 從應援歌單進來就回到應援歌單；從專輯進來就回到那張專輯
  const backHref = effectiveList === "chant" ? "/?cat=chant" : `/#album-${song.albumId}`;
  const backLabel = effectiveList === "chant" ? "應援歌單" : song.albumTitle;

  return (
    <main className="shell">
      <nav className="song-nav">
        <Link href={backHref} className="back">‹ {backLabel}</Link>
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
          songKey={song.id}
          videos={song.videos}
          lyrics={song.lyrics}
          plain={song.plain}
          autoplay={autoplay}
          prev={prev ? { id: prev.id, href: hrefOf(prev.id), title: prev.title } : undefined}
          next={next ? { id: next.id, href: hrefOf(next.id), title: next.title } : undefined}
          onNavigate={navigate}
          queueLabel={queueLabel}
        />
      ) : (
        <p className="empty">這首歌的影片與應援法還在整理中。</p>
      )}
    </main>
  );
}
