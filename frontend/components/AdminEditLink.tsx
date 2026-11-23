"use client";

import Link from "next/link";
import { useAdmin } from "./AdminProvider";

/** 只有登入管理員模式時才會出現 */
export default function AdminEditLink({ songId }: { songId: string }) {
  const { adminKey } = useAdmin();
  if (!adminKey) return null;
  return (
    <Link href={`/admin/${songId}`} className="pill pill-accent">編輯這首歌</Link>
  );
}
