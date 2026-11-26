import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Noto_Sans_TC } from "next/font/google";
import { AdminProvider } from "@/components/AdminProvider";
import TopBar from "@/components/TopBar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const lyric = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-lyric",
});
const ui = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-ui",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}｜IU 歌曲空耳與應援法`, template: `%s｜${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["IU", "아이유", "IU 應援", "IU 應援法", "IU 空耳", "IU 歌詞", "IU 演唱會", "應援歌單"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_TW",
    title: `${SITE_NAME}｜IU 歌曲空耳與應援法`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
  // Google Search Console 用「HTML 標籤」驗證時，把 content 值設在環境變數 GOOGLE_SITE_VERIFICATION
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 手機瀏覽器網址列的顏色，跟著淺色／深色
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14122a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${lyric.variable} ${ui.variable}`} suppressHydrationWarning>
      <head>
        {/* 在畫面繪製前套用已儲存的外觀，避免閃一下 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AdminProvider>
          <TopBar />
          {children}
        </AdminProvider>
      </body>
    </html>
  );
}
