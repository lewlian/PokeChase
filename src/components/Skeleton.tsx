/** Loading placeholder block. Pulse is gated behind motion-safe to respect
 *  prefers-reduced-motion, matching the CSS-side gating in globals.css. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-surface2 motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}
