/**
 * 網站的正式網址（SEO 用：sitemap、canonical、社群分享預覽）。
 *
 * 優先順序：
 *   1. SITE_URL（自訂網域請在 Vercel 的 Environment Variables 設定，例如 https://iu-chant.com）
 *   2. VERCEL_PROJECT_PRODUCTION_URL（Vercel 自動提供，不含 https://）
 *   3. RENDER_EXTERNAL_URL（若前端放在 Render，Render 自動提供）
 *   4. 本機開發 http://localhost:3000
 */
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;

export const SITE_URL = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  vercelUrl ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

export const SITE_NAME = "IU 應援";
export const SITE_DESCRIPTION = "IU 歌曲的空耳與應援法，邊看影片邊跟著唱。收錄專輯、單曲與 OST，逐首整理歌詞、空耳與應援方式。";
