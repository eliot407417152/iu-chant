"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import {
  CHANT_LABEL,
  VIDEO_KINDS,
  VIDEO_LABEL,
  type ChantType,
  type LyricLine,
  type Lyrics,
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
  href: string;
  title: string;
}

interface Props {
  videos: Videos;
  lyrics: Lyrics;
  /** 進入頁面時是否自動播放（從上一首連播過來，或按了「播放全部」） */
  autoplay: boolean;
  prev?: Neighbor;
  next?: Neighbor;
  queueLabel: string;
}

export default function LyricsPlayer({ videos, lyrics, autoplay, prev, next, queueLabel }: Props) {
  const router = useRouter();
  const kinds = VIDEO_KINDS.filter((k) => videos[k]);
  const [kind, setKind] = useState<VideoKind>(kinds[0]);
  const source = videos[kind] ?? videos[kinds[0]]!;

  // 每個版本有自己的歌詞；這個版本還沒整理歌詞時，先借用其他版本的（時間可能不準）
  const ownLines = lyrics[kind];
  const borrowFrom = ownLines.length === 0 ? VIDEO_KINDS.find((k) => lyrics[k].length > 0) : undefined;
  const lines: LyricLine[] = borrowFrom ? lyrics[borrowFrom] : ownLines;

  const [wantAutoplay, setWantAutoplay] = useState(autoplay);
  const [autoNext, setAutoNext] = useState(true);
  const [repeatOne, setRepeatOne] = useState(false);
  const [active, setActive] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [showSub, setShowSub] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const seekRef = useRef<(sec: number) => void>(() => {});

  useEffect(() => {
    try {
      setAutoNext(localStorage.getItem("autoNext") !== "0");
      setRepeatOne(localStorage.getItem("repeatOne") === "1");
    } catch {}
  }, []);

  const { containerRef, ready, playing, error, getTime, seekTo } = useYouTubePlayer(source.id, {
    autoplay: wantAutoplay,
    onEnded: () => {
      if (repeatOne) seekRef.current(0);
      else if (autoNext && next) router.push(next.href);
    },
  });
  seekRef.current = seekTo;

  // 每 200ms 讀一次播放秒數（加上這支影片的偏移）；index 沒變時 React 不會重新渲染
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setActive(findActive(lines, getTime() + source.offsetSec)), 200);
    return () => clearInterval(id);
  }, [ready, lines, getTime, source.offsetSec]);

  // 自動捲動：只捲歌詞容器，不會把整個頁面往上拉
  useEffect(() => {
    if (!follow || active < 0) return;
    const list = listRef.current;
    const el = list?.children[active] as HTMLElement | undefined;
    if (!list || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active, follow]);

  const nextChant = useMemo(() => lines.find((l, i) => i > active && l.chant) ?? null, [lines, active]);
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

        <div className="video">
          <div ref={containerRef} className="video-inner" />
          {error && <p className="video-error" role="alert">{error}</p>}
        </div>

        <div className="cue" aria-live="polite">
          {nextChant && nextChant.chant ? (
            <>
              <span className={`cue-tag c-${nextChant.chant}`}>{CHANT_LABEL[nextChant.chant]}</span>
              <span className="cue-text">接下來：{nextChant.text}</span>
            </>
          ) : (
            <span className="cue-text muted">{playing ? "後面沒有應援了" : "按下播放，開始跟著唱"}</span>
          )}
        </div>

        <div className="player-nav">
          {prev ? <Link href={prev.href} className="pill nav-pill">‹ {prev.title}</Link> : <span />}
          <span className="muted nav-label">{queueLabel}</span>
          {next ? <Link href={next.href} className="pill nav-pill">{next.title} ›</Link> : <span />}
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
          {!follow && (
            <button type="button" className="btn" onClick={() => setFollow(true)}>
              回到目前這句
            </button>
          )}
        </div>

        {borrowFrom && (
          <p className="borrow-note" role="note">
            「{VIDEO_LABEL[kind]}」的歌詞還在整理中，目前先顯示「{VIDEO_LABEL[borrowFrom]}」的歌詞，時間可能對不上。
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
            className="lyrics"
            onWheel={() => setFollow(false)}
            onTouchMove={() => setFollow(false)}
          >
            {lines.map((line, i) => (
              <li
                key={i}
                className={["line", i === active ? "is-active" : "", line.chant ? `has-chant c-${line.chant}` : ""]
                  .join(" ")
                  .trim()}
              >
                <button
                  type="button"
                  className="line-btn"
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => handleSeek(line.startSec)}
                >
                  {line.chant && <span className="line-tag">{CHANT_LABEL[line.chant]}</span>}
                  {line.roman && <span className="line-roman">{line.roman}</span>}
                  <span className="line-text">{line.text}</span>
                  {showSub && line.sub && <span className="line-sub">{line.sub}</span>}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
