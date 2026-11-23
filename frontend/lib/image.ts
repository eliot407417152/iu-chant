/**
 * 把使用者選的圖片縮小成 JPEG（長邊最多 maxSide 像素），確保檔案夠小、後端收得下。
 * 透明背景會填白色。大小超過 maxBytes 時會逐步降低品質。
 */
export async function resizeToJpeg(file: File, maxSide = 800, maxBytes = 900_000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("瀏覽器不支援圖片處理");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  for (let q = 0.88; q >= 0.4; q -= 0.12) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("圖片太大，請換一張小一點的");
}
