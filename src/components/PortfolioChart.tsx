"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValuePoint } from "@/lib/portfolio";

const RANGES = [
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

/** Portfolio value-over-time area chart (PriceChart's recipe, one series). */
export function PortfolioChart({ series }: { series: ValuePoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("90");

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days;
    if (!days) return series;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const c = cutoff.toISOString().slice(0, 10);
    return series.filter((p) => p.date >= c);
  }, [series, range]);

  return (
    <div>
      <div className="mb-3 flex gap-1" role="group" aria-label="Chart range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              range === r.key ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <p className="rounded-lg border border-line bg-surface2 p-4 text-sm text-mut">
          Not enough history in this range yet — the chart fills in as daily prices accrue.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--poke-blue)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--poke-blue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={40}
                stroke="var(--line)"
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                width={56}
                stroke="var(--line)"
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Value"]}
                labelStyle={{ color: "var(--ink)" }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--poke-blue)"
                strokeWidth={2}
                fill="url(#portfolio-fill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-right text-[11px] text-mut">
        Value of your current holdings over time — additions apply retroactively.
      </p>
    </div>
  );
}
