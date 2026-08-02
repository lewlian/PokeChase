/** Sanitize a ?next= redirect target: same-origin relative paths only.
 *  Anything absolute, protocol-relative, or malformed falls back to "/". */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
