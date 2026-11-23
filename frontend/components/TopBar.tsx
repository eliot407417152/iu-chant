"use client";

import Link from "next/link";
import { useAdmin } from "./AdminProvider";
import ThemeToggle from "./ThemeToggle";

/** 一般訪客只會看到外觀選項；管理員模式要自己輸入網址 /admin 進入，登入後才會出現管理按鈕 */
export default function TopBar() {
  const { adminKey, ready, logout } = useAdmin();
  return (
    <div className="topbar">
      {ready && adminKey && (
        <>
          <Link href="/admin" className="pill pill-accent">管理員模式</Link>
          <button type="button" className="pill" onClick={logout}>登出</button>
        </>
      )}
      <ThemeToggle />
    </div>
  );
}
