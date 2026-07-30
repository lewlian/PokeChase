import { pct } from "@/lib/format";

export function Delta({ value, label }: { value: number | null | undefined; label?: string }) {
  if (value === null || value === undefined) return null;
  const flat = Math.abs(value) < 0.05;
  const cls = flat ? "text-mut" : value > 0 ? "text-gain" : "text-loss";
  const arrow = flat ? "·" : value > 0 ? "▲" : "▼";
  return (
    <span className={`${cls} text-xs font-semibold tabular-nums`} title={label}>
      {arrow} {pct(Math.abs(value)).replace("+", "")}
      {label ? <span className="ml-1 font-normal text-mut">{label}</span> : null}
    </span>
  );
}
