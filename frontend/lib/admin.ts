import { PUBLIC_API_URL } from "./config";

export class AdminAuthError extends Error {}

/** 呼叫管理 API。金鑰失效丟 AdminAuthError；其他錯誤丟帶訊息的 Error */
export async function adminFetch<T = unknown>(
  adminKey: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PUBLIC_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("無法連線到後端，請確認後端已啟動。");
  }
  if (res.status === 401) throw new AdminAuthError("管理金鑰已失效，請重新登入。");
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {}
    throw new Error(`操作失敗（${res.status}）${detail ? `：${detail}` : ""}`);
  }
  return (res.headers.get("content-type") ?? "").includes("json") ? ((await res.json()) as T) : (undefined as T);
}
