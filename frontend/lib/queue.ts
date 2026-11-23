import type { Album } from "./types";

export type ListKey = "chant" | "album";

export interface QueueItem {
  id: string;
  title: string;
  hasVideo: boolean;
}

/** 播放佇列：應援歌單依 chantOrder 排序；否則是同一張專輯的曲序 */
export function buildQueue(albums: Album[], list: ListKey, albumId: string): QueueItem[] {
  if (list === "chant") {
    return albums
      .flatMap((a) => a.songs.filter((s) => s.chantOrder != null))
      .sort((x, y) => (x.chantOrder ?? 0) - (y.chantOrder ?? 0))
      .map((s) => ({ id: s.id, title: s.title, hasVideo: s.hasVideo }));
  }
  const album = albums.find((a) => a.id === albumId);
  return (album?.songs ?? []).map((s) => ({ id: s.id, title: s.title, hasVideo: s.hasVideo }));
}

/** 找上一首／下一首（跳過沒有影片的歌）；loop 為 true 時頭尾相接 */
export function neighbors(queue: QueueItem[], currentId: string, loop: boolean) {
  const n = queue.length;
  const i = queue.findIndex((q) => q.id === currentId);

  const find = (dir: 1 | -1): QueueItem | null => {
    if (i < 0) return null;
    for (let step = 1; step < n; step++) {
      let j = i + dir * step;
      if (loop) j = ((j % n) + n) % n;
      else if (j < 0 || j >= n) return null;
      if (queue[j].hasVideo) return queue[j];
    }
    return null;
  };

  return { prev: find(-1), next: find(1), position: i + 1, total: n };
}
