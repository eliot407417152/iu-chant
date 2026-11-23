"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PUBLIC_API_URL } from "@/lib/config";

const STORAGE_KEY = "adminKey";

export type LoginResult = "ok" | "denied" | "error";

interface AdminContext {
  /** 已登入時的管理金鑰 */
  adminKey: string | null;
  /** 已讀完瀏覽器裡儲存的登入狀態 */
  ready: boolean;
  login: (key: string) => Promise<LoginResult>;
  logout: () => void;
}

const Ctx = createContext<AdminContext>({
  adminKey: null,
  ready: false,
  login: async () => "error",
  logout: () => {},
});

export const useAdmin = () => useContext(Ctx);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAdminKey(saved);
    } catch {}
    setReady(true);
  }, []);

  const login = useCallback(async (key: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/admin/ping`, { headers: { "X-Admin-Key": key } });
      if (res.status === 401) return "denied";
      if (!res.ok) return "error";
      try {
        localStorage.setItem(STORAGE_KEY, key);
      } catch {}
      setAdminKey(key);
      return "ok";
    } catch {
      return "error";
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setAdminKey(null);
  }, []);

  return <Ctx.Provider value={{ adminKey, ready, login, logout }}>{children}</Ctx.Provider>;
}
