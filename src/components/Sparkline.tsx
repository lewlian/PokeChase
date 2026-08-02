import { SPARK_H, SPARK_W, sparklinePoints, trendOf } from "@/lib/sparkline";

const STROKE: Record<ReturnType<typeof trendOf>, string> = {
  up: "var(--gain)",
  down: "var(--loss)",
  flat: "var(--muted)",
};

/** Tiny 30-day trend line for table rows. Server-renderable — plain SVG. */
export function Sparkline({ series, className = "" }: { series: number[]; className?: string }) {
  const points = sparklinePoints(series);
  if (!points) return <span className="text-xs text-mut">—</span>;
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={`h-6 w-20 ${className}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={STROKE[trendOf(series)]}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
