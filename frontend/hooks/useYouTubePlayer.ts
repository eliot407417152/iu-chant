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

/**
 * YouTube 播放器。播放器只建立一次，換影片時用 loadVideoById 沿用同一個 iframe。
 * 手機瀏覽器只允許「使用者點過的播放器」自動播放，如果每首歌都重建播放器，
 * 第二首起就會被擋下來，所以換歌一定要沿用同一個播放器。
 */
export function useYouTubePlayer(videoId: string, options: Options = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const optsRef = useRef(options);
  const wantedRef = useRef(videoId);
  const readyRef = useRef(false);
  const creatingRef = useRef(false);
  const unmountedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 永遠使用最新的 options，但不會因為它改變而重建播放器
  useEffect(() => {
    optsRef.current = options;
  });

  const destroy = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {}
    playerRef.current = null;
    readyRef.current = false;
    if (containerRef.current) containerRef.current.innerHTML = "";
    setReady(false);
    setPlaying(false);
  }, []);

  // 真正離開頁面（元件卸載）才銷毀播放器
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      destroy();
    };
  }, [destroy]);

  useEffect(() => {
    wantedRef.current = videoId;
    setError(null);

    if (!videoId) {
      destroy();
      return;
    }

    const load = (id: string) => {
      try {
        if (optsRef.current.autoplay) playerRef.current?.loadVideoById(id);
        else playerRef.current?.cueVideoById(id);
      } catch {}
    };

    // 播放器已經好了：直接換影片
    if (playerRef.current && readyRef.current) {
      setPlaying(false);
      load(videoId);
      return;
    }
    // 播放器還在建立中：建好時會讀 wantedRef
    if (playerRef.current || creatingRef.current) return;

    creatingRef.current = true;
    loadYouTubeApi().then(() => {
      creatingRef.current = false;
      const container = containerRef.current;
      const initial = wantedRef.current;
      if (unmountedRef.current || !container || !initial) return;

      // YT.Player 會取代傳入的元素，所以放一個臨時子元素給它，避免 React 找不到節點
      const mount = document.createElement("div");
      container.appendChild(mount);

      playerRef.current = new window.YT.Player(mount, {
        videoId: initial,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: optsRef.current.autoplay ? 1 : 0 },
        events: {
          onReady: () => {
            if (unmountedRef.current) return;
            readyRef.current = true;
            setReady(true);
            if (wantedRef.current && wantedRef.current !== initial) load(wantedRef.current);
          },
          onStateChange: (e: any) => {
            if (unmountedRef.current) return;
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.ENDED) optsRef.current.onEnded?.();
          },
          onError: (e: any) => !unmountedRef.current && setError(ERROR_MESSAGES[e.data] ?? "影片載入失敗。"),
        },
      });
    });
  }, [videoId, destroy]);

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

  /** 直接播放。要在使用者點擊時呼叫，手機瀏覽器才會允許 */
  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo();
    } catch {}
  }, []);

  return { containerRef, ready, playing, error, getTime, seekTo, play };
}
