/**
 * 網站的正式網址（SEO 用：sitemap、canonical、社群分享預覽）。
 *
 * 優先順序：
 *   1. SITE_URL（自訂網域請在 Render 的 Environment 設定，例如 https://iu-chant.com）
 *   2. RENDER_EXTERNAL_URL（Render 自動提供，例如 https://xxx.onrender.com）
 *   3. 本機開發 http://localhost:3000
 */
export const SITE_URL = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

export const SITE_NAME = "IU 應援歌單";
export const SITE_DESCRIPTION = "IU 歌曲的空耳與應援法，邊看影片邊跟著唱。收錄專輯、單曲與 OST，逐首整理歌詞、空耳與應援方式。";
