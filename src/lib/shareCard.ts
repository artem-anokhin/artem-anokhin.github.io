import { plural } from "./plural";

/**
 * «Карточка недели»: a story-sized image (1080×1920) built on the device.
 * Privacy: it shows only the tree stage and how many of the last 7 days had a
 * check-in — no notes, sleep, mood, stress, caffeine or scores. Nothing is uploaded.
 */

export const CARD_W = 1080;
export const CARD_H = 1920;

export interface ShareCardInput {
  /** Serialized tree <svg> element (outerHTML) from the Tree screen. */
  treeSvg: string;
  stageName: string;
  /** Days with a check-in among the last 7 (0–7). */
  activeDays: number;
  /** Public app address shown at the bottom. */
  url: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Strips <title> and sizing from the tree SVG and places it inside the card. */
function placeTree(svg: string): string {
  const inner = svg
    .replace(/<title[^>]*>[\s\S]*?<\/title>/, "")
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `<svg x="240" y="440" width="600" height="660" viewBox="0 0 200 220">${inner}</svg>`;
}

export function shareCardSvg({ treeSvg, stageName, activeDays, url }: ShareCardInput): string {
  const days = Math.max(0, Math.min(7, Math.round(activeDays)));
  // System UI font: SF on iPhone, Roboto on Android (web fonts can't load inside an SVG image).
  const font = "-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const dots = Array.from({ length: 7 }, (_, i) => {
    const cx = 540 - 3 * 92 + i * 92;
    return `<circle cx="${cx}" cy="1540" r="30" fill="${i < days ? "#1E5BFF" : "#E5E5EA"}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<rect width="100%" height="100%" fill="#F2F2F7"/>
<text x="96" y="210" font-family="${font}" font-weight="600" font-size="40" fill="#6C6C70">FOCUSAI · НЕДЕЛЯ</text>
<text x="96" y="300" font-family="${font}" font-weight="700" font-size="92" letter-spacing="-2" fill="#1C1C1E">Моя неделя фокуса</text>
<rect x="72" y="380" width="936" height="900" rx="56" fill="#FFFFFF"/>
<defs><linearGradient id="focusai-card-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF6EC"/></linearGradient></defs>
<rect x="72" y="380" width="936" height="900" rx="56" fill="url(#focusai-card-bg)"/>
${placeTree(treeSvg)}
<text x="540" y="1250" text-anchor="middle" font-family="${font}" font-weight="600" font-size="44" fill="#1C1C1E">Стадия дерева: ${esc(stageName)}</text>
<text x="540" y="1440" text-anchor="middle" font-family="${font}" font-weight="700" font-size="120" letter-spacing="-3" fill="#1C1C1E">${days} из 7</text>
${dots}
<text x="540" y="1650" text-anchor="middle" font-family="${font}" font-weight="500" font-size="44" fill="#6C6C70">${plural(days, ["день", "дня", "дней"])} с чек-ином</text>
<text x="540" y="1790" text-anchor="middle" font-family="${font}" font-weight="600" font-size="40" fill="#1E5BFF">FocusAI — 1 минута в день</text>
<text x="540" y="1846" text-anchor="middle" font-family="${font}" font-weight="500" font-size="32" fill="#6C6C70">${esc(url)}</text>
</svg>`;
}

/** Renders the card SVG to a PNG blob via canvas. */
export async function renderPng(svg: string): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Opens the system share sheet when files can be shared; otherwise downloads the PNG. */
export async function shareOrDownload(blob: Blob, fileName = "focusai-week.png"): Promise<"shared" | "downloaded"> {
  const file = new File([blob], fileName, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Моя неделя фокуса" });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded";
}
