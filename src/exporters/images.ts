import type { ImageAsset } from "./docx";

export function parseDataImage(src: string): { data: Uint8Array; mime: string } | undefined {
  const match = /^data:(image\/[\w.+-]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i.exec(src);
  if (!match) return;
  try {
    return { mime: match[1], data: new Uint8Array(match[2]
      ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]), "utf8")) };
  } catch { return; }
}

/** Read dimensions from file headers without requiring a browser image decoder. */
export function rasterImage(data: Uint8Array): ImageAsset | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let type: ImageAsset["type"], width = 0, height = 0;
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    type = "png"; width = view.getUint32(16); height = view.getUint32(20);
  } else if (data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    type = "gif"; width = view.getUint16(6, true); height = view.getUint16(8, true);
  } else if (data.length >= 26 && data[0] === 0x42 && data[1] === 0x4d) {
    type = "bmp"; width = Math.abs(view.getInt32(18, true)); height = Math.abs(view.getInt32(22, true));
  } else if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    type = "jpg";
    let offset = 2;
    while (offset + 4 < data.length) {
      if (data[offset] !== 0xff) { offset++; continue; }
      const marker = data[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && offset + 9 < data.length) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      if (length < 2) break;
      offset += length + 2;
    }
  } else return;
  return width > 0 && height > 0 ? { data, type, width, height } : undefined;
}

export async function decodeBrowserImage(src: string): Promise<ImageAsset | undefined> {
  const embedded = parseDataImage(src);
  if (embedded) {
    const asset = rasterImage(embedded.data);
    if (asset) return asset;
  }
  if (!src || typeof Image === "undefined") return;
  // Convert SVG/WebP/canvas images to PNG for Word.
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ""; resolve(undefined); }, 5000);
    image.onload = () => {
      clearTimeout(timer);
      try {
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height) { resolve(undefined); return; }
        const ratio = Math.min(1, 2400 / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = parseDataImage(canvas.toDataURL("image/png"));
        resolve(png ? rasterImage(png.data) : undefined);
      } catch { resolve(undefined); }
    };
    image.onerror = () => { clearTimeout(timer); resolve(undefined); };
    image.src = src;
  });
}
