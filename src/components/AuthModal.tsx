"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "@/app/login/LoginForm";
import { safeNextPath } from "@/lib/auth-redirect";

/** Open the sign-in modal from anywhere:
 *  window.dispatchEvent(new CustomEvent("pokechase:signin", {detail:{next}})) */
export const SIGNIN_EVENT = "pokechase:signin";

export function openSignIn(next?: string) {
  window.dispatchEvent(new CustomEvent(SIGNIN_EVENT, { detail: { next } }));
}

function SleepyPikachu() {
  // Simple original mark — a pokéball moon with a dozing silhouette
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-28" aria-hidden="true">
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--poke-blue)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--poke-blue)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="72" fill="url(#auth-sky)" rx="12" />
      <circle cx="92" cy="22" r="12" fill="var(--poke-yellow)" opacity="0.9" />
      <circle cx="88" cy="19" r="12" fill="var(--surface)" />
      {/* pokéball */}
      <circle cx="34" cy="40" r="18" fill="var(--poke-red)" />
      <path d="M16 40a18 18 0 0 0 36 0H16Z" fill="#fff" />
      <path d="M16 40h36" stroke="#1c2033" strokeWidth="3" />
      <circle cx="34" cy="40" r="6" fill="#fff" stroke="#1c2033" strokeWidth="3" />
      {/* zzz */}
      <text x="58" y="34" fontSize="11" fill="var(--muted)" fontWeight="700">
        z
      </text>
      <text x="66" y="26" fontSize="9" fill="var(--muted)" fontWeight="700">
        z
      </text>
      <text x="73" y="19" fontSize="7" fill="var(--muted)" fontWeight="700">
        z
      </text>
    </svg>
  );
}

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("/");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onSignIn = (e: Event) => {
      const detail = (e as CustomEvent<{ next?: string }>).detail;
      setNext(safeNextPath(detail?.next ?? window.location.pathname + window.location.search));
      setOpen(true);
    };
    window.addEventListener(SIGNIN_EVENT, onSignIn);
    return () => window.removeEventListener(SIGNIN_EVENT, onSignIn);
  }, []);

  // Gated routes redirect to /?signin=1&next=… — open the modal on arrival.
  // Deferred a tick so the state update isn't synchronous inside the effect.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("signin") !== "1") return;
      setNext(safeNextPath(params.get("next")));
      setOpen(true);
      params.delete("signin");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to PokéChase"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0f1acc] p-4 backdrop-blur-md motion-safe:animate-[fadeIn_150ms_ease-out]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl motion-safe:animate-[popIn_180ms_ease-out]">
        <div className="relative flex flex-col items-center gap-1 border-b border-line bg-surface2 px-6 pb-4 pt-5 text-center">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full px-2 py-1 text-mut hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
          <SleepyPikachu />
          <h2 className="font-display text-2xl font-bold">Welcome, trainer</h2>
          <p className="text-sm text-mut">
            Track your collection, build watchlists, and follow your portfolio.
          </p>
        </div>
        <div className="p-5">
          <LoginForm next={next} onDone={close} />
        </div>
      </div>
    </div>
  );
}
