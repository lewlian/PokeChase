/** Set logo image with a styled fallback (era accent + name initial). */
export function SetLogo({
  logoUrl,
  name,
  accent,
  className = "h-16",
}: {
  logoUrl: string | null;
  name: string;
  accent?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        loading="lazy"
        className={`${className} w-auto max-w-full object-contain`}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center rounded-lg px-3 font-display text-lg font-bold text-white`}
      style={{ background: accent ?? "var(--poke-blue)" }}
      aria-hidden="true"
    >
      {name.replace(/^[A-Z]+\d*:\s*/i, "").slice(0, 22)}
    </div>
  );
}
