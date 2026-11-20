"use client";

/**
 * Compress a photo on the phone before upload (spec: max 1600 px long edge, JPEG ~80%).
 * Re-encoding through a canvas also drops EXIF metadata, so GPS location never leaves the device.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<{ dataUrl: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    // Fallback for browsers without createImageBitmap support for this type
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  const w0 = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const h0 = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width, height };
}

/** Smaller copy kept in the demo's browser storage (localStorage has a ~5 MB budget). */
export function shrinkDataUrl(dataUrl: string, maxEdge = 960, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
