/** 瀏覽器端（管理員模式、打點工具）呼叫後端用的網址 */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** 後端回傳的封面可能是相對路徑（/api/albums/.../cover），瀏覽器要加上後端網址才載得到 */
export function coverSrc(url: string): string {
  return url.startsWith("/") ? `${PUBLIC_API_URL}${url}` : url;
}
