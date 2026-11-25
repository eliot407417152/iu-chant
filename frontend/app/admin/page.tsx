import type { Metadata } from "next";
import AdminHome from "@/components/AdminHome";
import { getAlbums } from "@/lib/api";

export const metadata: Metadata = { title: "管理員模式", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const albums = await getAlbums({ fresh: true });
  return <AdminHome albums={albums} />;
}
