"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coverSrc } from "@/lib/config";
import type { Album, SongSummary } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/format";

import { FILTERS, type Filter } from "@/lib/filter";

function matches(a: Album, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "studio") return a.type === "studio" || a.type === "repackage";
  return a.type === f;
}

/** 沒有封面圖時，依專輯 id 產生固定的柔和色塊 */
function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function Cover({ album }: { album: Album }) {
  if (album.coverUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cover" src={coverSrc(album.coverUrl)} alt={`${album.title} 封面`} />;
  }
  const h = hue(album.id);
  return (
    <div
      className="cover cover-fallback"
      aria-hidden="true"
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 82%), hsl(${(h + 45) % 360} 65% 72%))` }}
    >
      {album.releaseDate.slice(0, 4)}
    </div>
  );
}

function TrackRow({ s, href, sub, hideChantTag }: { s: SongSummary; href: string; sub?: string; hideChantTag?: boolean }) {
  const extra = [s.featuring, s.note].filter(Boolean).join("・");
  return (
    <li>
      <Link href={href} className="track">
        <span className="track-no">{s.trackNo}</span>
        <span className="track-main">
          <span className="track-title">{s.title}</span>
          {(sub || extra) && <span className="track-sub">{[sub, extra].filter(Boolean).join("・")}</span>}
        </span>
        <span className="track-tags">
          {s.isTitleTrack && <span className="tag">主打</span>}
          {!hideChantTag && s.chantOrder != null && <span className="tag tag-chant">應援歌</span>}
          {s.hasChant && <span className="chip chip-all">應援法</span>}
          {!s.hasVideo && <span className="track-sub">尚無影片</span>}
        </span>
        <span className="track-time">{s.durationSec > 0 ? formatDuration(s.durationSec) : ""}</span>
      </Link>
    </li>
  );
}

export default function AlbumBrowser({ albums, initialFilter = "all" }: { albums: Album[]; initialFilter?: Filter }) {
  const [filter, setFilterState] = useState<Filter>(initialFilter);
  const [newestFirst, setNewestFirst] = useState(true);

  // 目前的分類記在網址（?cat=chant）。從歌曲頁按返回，或按瀏覽器上一頁，才會回到同一個分類，
  // 例如從應援歌單點進去的歌，返回就是應援歌單，不會跑去專輯
  const setFilter = (f: Filter) => {
    setFilterState(f);
    const url = f === "all" ? window.location.pathname : `${window.location.pathname}?cat=${f}`;
    window.history.replaceState(window.history.state, "", url);
  };

  const chantSongs = useMemo(
    () =>
      albums
        .flatMap((a) => a.songs.filter((s) => s.chantOrder != null).map((song) => ({ song, album: a })))
        .sort((x, y) => (x.song.chantOrder ?? 0) - (y.song.chantOrder ?? 0)),
    [albums],
  );
  const firstPlayable = chantSongs.find((c) => c.song.hasVideo);
  const playAllHref = firstPlayable ? `/song/${firstPlayable.song.id}?list=chant&autoplay=1` : null;

  const visible = useMemo(() => {
    const list = albums.filter((a) => matches(a, filter));
    return newestFirst ? [...list].reverse() : list;
  }, [albums, filter, newestFirst]);

  const showAlbums = filter !== "chant";

  return (
    <>
      <div className="browse-bar">
        <div className="filters-row">
          <div className="filters" role="group" aria-label="分類">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={filter === f.key ? "filter is-on" : "filter"}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}（{f.key === "chant" ? `${chantSongs.length} 首` : albums.filter((a) => matches(a, f.key)).length}）
              </button>
            ))}
          </div>
        </div>

        {/* 一律保留這一區的位置：切到「應援歌單」時只是隱藏，不會讓整列版面跳動 */}
        <div className={showAlbums ? "browse-actions" : "browse-actions is-hidden"} aria-hidden={!showAlbums}>
          <select
            className="jump"
            aria-label="跳到專輯"
            value=""
            onChange={(e) => document.getElementById(`album-${e.target.value}`)?.scrollIntoView({ block: "start" })}
          >
            <option value="" disabled>跳到專輯…</option>
            {visible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}（{a.songs.length}）
              </option>
            ))}
          </select>
          <button type="button" className="btn sort-btn" onClick={() => setNewestFirst((v) => !v)}>
            排序：{newestFirst ? "由新到舊" : "由舊到新"}
          </button>
        </div>
      </div>

      {filter === "all" && chantSongs.length > 0 && (
        <section className="playlist-card">
          <div>
            <h2>應援歌單</h2>
            <p>{chantSongs.length} 首應援歌曲，連續播放，播完會自動從頭循環。</p>
          </div>
          <div className="playlist-actions">
            {playAllHref ? (
              <Link href={playAllHref} className="play-all">▶ 播放全部</Link>
            ) : (
              <span className="playlist-note">還沒有可播放的影片</span>
            )}
            <button type="button" className="play-ghost" onClick={() => setFilter("chant")}>查看清單</button>
          </div>
        </section>
      )}

      {filter === "chant" && (
        <section className="album">
          <div className="album-head">
            <div className="cover cover-fallback playlist-cover" aria-hidden="true">應援</div>
            <div>
              <h2>應援歌單</h2>
              <p className="muted album-meta">{chantSongs.length} 首・連續播放並自動循環</p>
              {playAllHref ? (
                <Link href={playAllHref} className="play-all play-all-sm">▶ 播放全部</Link>
              ) : (
                <p className="muted album-note">還沒有可播放的影片</p>
              )}
            </div>
          </div>
          <ol className="tracks">
            {chantSongs.map(({ song, album }, i) => (
              <TrackRow
                key={song.id}
                s={{ ...song, trackNo: i + 1 }}
                href={`/song/${song.id}?list=chant`}
                sub={album.title}
                hideChantTag
              />
            ))}
          </ol>
        </section>
      )}

      {showAlbums &&
        visible.map((album) => (
          <section key={album.id} id={`album-${album.id}`} className="album">
            <div className="album-head">
              <Cover album={album} />
              <div>
                <h2>{album.title}</h2>
                <p className="muted album-meta">
                  {album.typeLabel}・{formatDate(album.releaseDate)}・{album.songs.length} 首
                </p>
                {album.note && <p className="muted album-note">{album.note}</p>}
              </div>
            </div>
            <ol className="tracks">
              {album.songs.map((s) => (
                <TrackRow key={s.id} s={s} href={`/song/${s.id}`} />
              ))}
            </ol>
          </section>
        ))}

      {showAlbums && visible.length === 0 && <p className="muted">這個分類目前沒有內容。</p>}
    </>
  );
}
