"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import LineText from "./LineText";
import {
  CHANT_LABEL,
  VIDEO_KINDS,
  VIDEO_LABEL,
  type ChantType,
  NO_PLAIN,
  type LyricLine,
  type Lyrics,
  type PlainFlags,
  type VideoKind,
  type Videos,
} from "@/lib/types";

/** 二分搜尋：找出 startSec <= t 的最後一行，還沒開始則回傳 -1 */
function findActive(lines: LyricLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startSec <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

interface Neighbor {
  id: string;
  href: string;
  title: string;
}

interface Props {
  /** 目前的歌曲 id；換歌時播放器會沿用，只重設這首歌的狀態 */
  songKey: string;
  videos: Videos;
  lyrics: Lyrics;
  /** 「只有歌詞、不打點」的版本 */
  plain?: PlainFlags;
  /** 這次載入是否要自動播放（從上一首連播過來，或按了「播放全部」） */
  autoplay: boolean;
  prev?: Neighbor;
  next?: Neighbor;
  /** 切換到另一首歌（不重新載入頁面，播放器才能沿用，手機才不會被擋自動播放） */
  onNavigate: (id: string) => void;
  queueLabel: string;
}

/**
 * 公開頁能顯示的歌詞：
 * - 還有沒打點的行（startSec < 0，編輯到一半的草稿）的版本，先當作「整理中」，不顯示
 * - 但「只有歌詞」的版本本來就不打點，照樣顯示
 */
function publicLyrics(all: Lyrics, plain: PlainFlags): Lyrics {
  const ok = (k: VideoKind) => (!plain[k] && all[k].some((l) => l.startSec < 0) ? [] : all[k]);
  return { chant: ok("chant"), mv: ok("mv"), inst: ok("inst"), live: ok("live") };
}

export default function LyricsPlayer({
  songKey,
  videos,
  lyrics: rawLyrics,
  plain: plainProp,
  autoplay,
  prev,
  next,
  onNavigate,
  queueLabel,
}: Props) {
  const plain = plainProp ?? NO_PLAIN;
  const lyrics = useMemo(() => publicLyrics(rawLyrics, plain), [rawLyrics, plain]);
  const kinds = VIDEO_KINDS.filter((k) => videos[k]);
  const [kind, setKind] = useState<VideoKind>(kinds[0]);
  const source = videos[kind] ?? videos[kinds[0]]!;

  // 每個版本有自己的歌詞；這個版本還沒整理歌詞時，先借用其他版本的（時間可能不準）
  const ownLines = lyrics[kind];
  const borrowFrom = ownLines.length === 0 ? VIDEO_KINDS.find((k) => lyrics[k].length > 0) : undefined;
  const lines: LyricLine[] = borrowFrom ? lyrics[borrowFrom] : ownLines;
  /** 目前顯示的歌詞是不是「只有歌詞」：是的話不跟著影片、不能點歌詞跳轉 */
  const isPlain = plain[borrowFrom ?? kind];

  const [wantAutoplay, setWantAutoplay] = useState(autoplay);
  const [needTap, setNeedTap] = useState(false);
  const [active, setActive] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [shownSong, setShownSong] = useState(songKey);
  // 換歌：播放器沿用，只重設這首歌自己的狀態（在 render 中重設，避免閃一下舊歌的歌詞）
  if (shownSong !== songKey) {
    setShownSong(songKey);
    setKind(kinds[0]);
    setActive(-1);
    setFollow(true);
    setWantAutoplay(autoplay);
    setNeedTap(false);
  }
  const [autoNext, setAutoNext] = useState(true);
  const [repeatOne, setRepeatOne] = useState(false);
  const [showSub, setShowSub] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const seekRef = useRef<(sec: number) => void>(() => {});

  useEffect(() => {
    try {
      setAutoNext(localStorage.getItem("autoNext") !== "0");
      setRepeatOne(localStorage.getItem("repeatOne") === "1");
    } catch {}
  }, []);

  const { containerRef, ready, playing, error, getTime, seekTo, play } = useYouTubePlayer(source.id, {
    autoplay: wantAutoplay,
    onEnded: () => {
      if (repeatOne) seekRef.current(0);
      else if (autoNext && next) onNavigate(next.id);
    },
  });
  seekRef.current = seekTo;

  // 手機瀏覽器常常擋掉第一次的自動播放：要求自動播放卻沒有開始播時，顯示「點一下開始播放」
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    setNeedTap(false);
    if (!wantAutoplay || !ready) return;
    const id = setTimeout(() => {
      if (!playingRef.current) setNeedTap(true);
    }, 1800);
    return () => clearTimeout(id);
  }, [wantAutoplay, ready, source.id]);
  useEffect(() => {
    if (playing) setNeedTap(false);
  }, [playing]);

  // 每 200ms 讀一次播放秒數（加上這支影片的偏移）；index 沒變時 React 不會重新渲染
  useEffect(() => {
    if (!ready || isPlain) return;
    const id = setInterval(() => setActive(findActive(lines, getTime() + source.offsetSec)), 200);
    return () => clearInterval(id);
  }, [ready, isPlain, lines, getTime, source.offsetSec]);

  // 自動捲動：只捲歌詞容器，不會把整個頁面往上拉
  useEffect(() => {
    if (isPlain || !follow || active < 0) return;
    const list = listRef.current;
    const el = list?.children[active] as HTMLElement | undefined;
    if (!list || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active, follow, isPlain]);

  const nextChant = useMemo(
    () => (isPlain ? null : (lines.find((l, i) => i > active && l.chant) ?? null)),
    [lines, active, isPlain],
  );
  const usedTypes = useMemo(
    () => [...new Set(lines.map((l) => l.chant).filter((c): c is ChantType => !!c))],
    [lines],
  );

  const toggle = (key: string, value: boolean, set: (v: boolean) => void) => {
    set(value);
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {}
  };

  const switchKind = (k: VideoKind) => {
    if (k === kind) return;
    setWantAutoplay(true);
    setActive(-1);
    setKind(k);
  };

  /** 一般點擊（沒按 Ctrl/Cmd/Shift、不是中鍵）時，不重新載入頁面，直接切換歌曲 */
  const go = (e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(id);
  };

  const handleSeek = (sec: number) => {
    setFollow(true);
    seekTo(Math.max(0, sec - source.offsetSec));
  };

  return (
    <div className="song-grid">
      <section className="stage" aria-label="影片播放器">
        {kinds.length > 1 && (
          <div className="kind-tabs" role="tablist" aria-label="影片版本">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === kind}
                className={k === kind ? "kind-tab is-on" : "kind-tab"}
                onClick={() => switchKind(k)}
              >
                {VIDEO_LABEL[k]}
              </button>
            ))}
          </div>
        )}

        {/* 手機上只有「影片＋下一個應援提示」會置頂，其餘（切換版本、上下首、選項）跟著頁面捲走，讓出空間給歌詞 */}
        <div className="stage-pin">
        <div className="video">
          <div ref={containerRef} className="video-inner" />
          {error && <p className="video-error" role="alert">{error}</p>}
          {needTap && !error && (
            <button
              type="button"
              className="tap-play"
              onClick={() => {
                play();
                setNeedTap(false);
              }}
            >
              ▶ 點一下開始播放
              <span>手機瀏覽器會擋自動播放，點過一次後，下一首就會自動接著播</span>
            </button>
          )}
        </div>

        <div className="cue" aria-live="polite">
          {nextChant && nextChant.chant ? (
            <>
              <span className={`cue-tag c-${nextChant.chant}`}>{CHANT_LABEL[nextChant.chant]}</span>
              <span className="cue-text">接下來：{nextChant.text}</span>
            </>
          ) : (
            <span className="cue-text muted">
              {isPlain ? "這個版本只有歌詞（沒有對時間）" : playing ? "後面沒有應援了" : "按下播放，開始跟著唱"}
            </span>
          )}
        </div>
        </div>

        <div className="player-nav">
          {prev ? (
            <Link href={prev.href} className="pill nav-pill" onClick={(e) => go(e, prev.id)}>‹ {prev.title}</Link>
          ) : (
            <span />
          )}
          <span className="muted nav-label">{queueLabel}</span>
          {next ? (
            <Link href={next.href} className="pill nav-pill" onClick={(e) => go(e, next.id)}>{next.title} ›</Link>
          ) : (
            <span />
          )}
        </div>

        <div className="player-opts">
          <label className="toggle">
            <input type="checkbox" checked={autoNext} onChange={(e) => toggle("autoNext", e.target.checked, setAutoNext)} />
            播完自動播下一首
          </label>
          <label className="toggle">
            <input type="checkbox" checked={repeatOne} onChange={(e) => toggle("repeatOne", e.target.checked, setRepeatOne)} />
            單曲循環
          </label>
        </div>
      </section>

      <section className="lyrics-pane" aria-label="歌詞與應援法">
        <div className="toolbar">
          <label className="toggle">
            <input type="checkbox" checked={showSub} onChange={(e) => setShowSub(e.target.checked)} />
            顯示翻譯
          </label>
          {!isPlain && !follow && (
            <button type="button" className="btn" onClick={() => setFollow(true)}>
              回到目前這句
            </button>
          )}
        </div>

        {borrowFrom && (
          <p className="borrow-note" role="note">
            「{VIDEO_LABEL[kind]}」的歌詞還在整理中，目前先顯示「{VIDEO_LABEL[borrowFrom]}」的歌詞
            {isPlain ? "。" : "，時間可能對不上。"}
          </p>
        )}

        {usedTypes.length > 0 && (
          <p className="legend">
            {usedTypes.map((t) => (
              <span key={t} className={`legend-item c-${t}`}>{CHANT_LABEL[t]}</span>
            ))}
          </p>
        )}

        {lines.length === 0 ? (
          <p className="empty">這首歌的歌詞與應援法還在整理中。</p>
        ) : (
          <ol
            ref={listRef}
            className={isPlain ? "lyrics lyrics-plain" : "lyrics"}
            onWheel={() => setFollow(false)}
            onTouchMove={() => setFollow(false)}
          >
            {lines.map((line, i) => (
              <li
                key={i}
                className={["line", !isPlain && i === active ? "is-active" : "", line.chant ? `has-chant c-${line.chant}` : ""]
                  .join(" ")
                  .trim()}
              >
                {isPlain ? (
                  <div className="line-btn line-static">
                    {line.chant && <span className="line-tag">{CHANT_LABEL[line.chant]}</span>}
                    {line.roman && <span className="line-roman">{line.roman}</span>}
                    <LineText text={line.text} segs={line.segs} />
                    {showSub && line.sub && <span className="line-sub">{line.sub}</span>}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="line-btn"
                    aria-current={i === active ? "true" : undefined}
                    onClick={() => handleSeek(line.startSec)}
                  >
                    {line.chant && <span className="line-tag">{CHANT_LABEL[line.chant]}</span>}
                    {line.roman && <span className="line-roman">{line.roman}</span>}
                    <LineText text={line.text} segs={line.segs} />
                    {showSub && line.sub && <span className="line-sub">{line.sub}</span>}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
