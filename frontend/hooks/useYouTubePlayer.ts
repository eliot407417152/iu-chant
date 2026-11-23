"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

const ERROR_MESSAGES: Record<number, string> = {
  2: "影片 ID 不正確。",
  5: "這部影片無法在此播放器播放。",
  100: "找不到這部影片，可能已被刪除或設為私人。",
  101: "影片擁有者不允許嵌入播放。",
  150: "影片擁有者不允許嵌入播放。",
};

interface Options {
  /** 載入後自動播放（瀏覽器可能會擋，使用者互動過就沒問題） */
  autoplay?: boolean;
  /** 影片播完時呼叫 */
  onEnded?: () => void;
}

export function useYouTubePlayer(videoId: string, options: Options = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const optsRef = useRef(options);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 永遠使用最新的 options，但不會因為它改變而重建播放器
  useEffect(() => {
    optsRef.current = options;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videoId) return;

    let cancelled = false;
    setReady(false);
    setError(null);

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      // YT.Player 會取代傳入的元素，所以放一個臨時子元素給它，避免 React 找不到節點
      const mount = document.createElement("div");
      container.appendChild(mount);

      playerRef.current = new window.YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: optsRef.current.autoplay ? 1 : 0 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e: any) => {
            if (cancelled) return;
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.ENDED) optsRef.current.onEnded?.();
          },
          onError: (e: any) => !cancelled && setError(ERROR_MESSAGES[e.data] ?? "影片載入失敗。"),
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      container.innerHTML = "";
    };
  }, [videoId]);

  const getTime = useCallback((): number => {
    try {
      return playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const seekTo = useCallback((sec: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(sec, true);
    p.playVideo();
  }, []);

  return { containerRef, ready, playing, error, getTime, seekTo };
}
