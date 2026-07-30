/** TCGplayer CDN images ship as ..._200w.jpg — swap the size suffix. */
export type ImgSize = "200w" | "400w" | "in_1000x1000";

export function imageAt(url: string | null | undefined, size: ImgSize): string {
  if (!url) return "";
  return url.replace(/_200w\.jpg$/, `_${size}.jpg`);
}
