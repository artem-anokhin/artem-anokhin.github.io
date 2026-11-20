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
  return `<svg x="190" y="560" width="700" height="770" viewBox="0 0 200 220">${inner}</svg>`;
}

export function shareCardSvg({ treeSvg, stageName, activeDays, url }: ShareCardInput): string {
  const days = Math.max(0, Math.min(7, Math.round(activeDays)));
  const font = "Montserrat, Arial, sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<rect width="100%" height="100%" fill="#F4F7FE"/>
<rect x="60" y="60" width="960" height="1800" rx="56" fill="#FBFCFF" stroke="#DCE5FA" stroke-width="3"/>
<text x="540" y="230" text-anchor="middle" font-family="${font}" font-weight="900" font-size="88" fill="#0A2A9E">МОЯ НЕДЕЛЯ</text>
<text x="540" y="330" text-anchor="middle" font-family="${font}" font-weight="900" font-size="88" fill="#1E5BFF">ФОКУСА</text>
<text x="540" y="440" text-anchor="middle" font-family="${font}" font-weight="600" font-size="44" fill="#55658A">Стадия дерева: ${esc(stageName)}</text>
${placeTree(treeSvg)}
<text x="540" y="1490" text-anchor="middle" font-family="${font}" font-weight="900" font-size="150" fill="#0A2A9E">${days} из 7</text>
<text x="540" y="1570" text-anchor="middle" font-family="${font}" font-weight="600" font-size="46" fill="#0B1533">${plural(days, ["день", "дня", "дней"])} с чек-ином</text>
<text x="540" y="1720" text-anchor="middle" font-family="${font}" font-weight="800" font-size="40" fill="#0A2A9E">FocusAI — 1 минута в день</text>
<text x="540" y="1780" text-anchor="middle" font-family="${font}" font-weight="500" font-size="34" fill="#55658A">${esc(url)}</text>
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
