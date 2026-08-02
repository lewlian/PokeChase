"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface HeaderUser {
  email: string;
  avatarUrl: string | null;
}

/** Header account control: "Sign in" link when signed out, avatar menu when
 *  signed in. The user comes from the server layout — no client fetch. */
export function AuthButton({ user }: { user: HeaderUser | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 whitespace-nowrap rounded-full bg-pokeblue px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Sign in
      </Link>
    );
  }

  const initial = user.email[0]?.toUpperCase() ?? "?";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-surface2 text-sm font-bold text-ink hover:border-pokeblue"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          <p className="truncate border-b border-line px-4 py-2.5 text-xs text-mut">{user.email}</p>
          {(
            [
              ["/portfolio", "Portfolio"],
              ["/watchlists", "Watchlists"],
              ["/account", "Account"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              role="menuitem"
              href={href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-medium hover:bg-surface2"
            >
              {label}
            </Link>
          ))}
          <form action="/auth/signout" method="post" className="border-t border-line">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm font-medium text-loss hover:bg-surface2"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
