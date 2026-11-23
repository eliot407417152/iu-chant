export function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** 2008-09-23 → 2008.09.23 */
export function formatDate(iso: string): string {
  return iso.replaceAll("-", ".");
}

/** 83.4 → 1:23.4（打點工具顯示目前播放位置用） */
export function formatClock(sec: number): string {
  const t = Math.max(0, Math.round(sec * 10) / 10);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
