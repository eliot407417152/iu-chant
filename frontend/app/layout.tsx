import type { Metadata } from "next";
import { Gowun_Batang, Noto_Sans_TC } from "next/font/google";
import { AdminProvider } from "@/components/AdminProvider";
import TopBar from "@/components/TopBar";
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
  title: "IU 應援歌單",
  description: "IU 歌曲的空耳與應援法，邊看影片邊跟著唱。",
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
