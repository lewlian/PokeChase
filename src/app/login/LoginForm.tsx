"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** OAuth providers offered on the login page. Adding Apple later is this
 *  array plus enabling the provider in the Supabase dashboard — no other
 *  code changes. */
const OAUTH_PROVIDERS = [{ id: "google", label: "Continue with Google" }] as const;

type Mode = "signin" | "signup";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (!data.session) {
          // Email confirmation is enabled on the Supabase project
          setNotice("Check your inbox — confirm your email to finish signing up.");
          return;
        }
      }
      // Full navigation so server components pick up the new session cookie
      window.location.assign(next);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: (typeof OAUTH_PROVIDERS)[number]["id"]) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(error.message);
  }

  const tabClass = (m: Mode) =>
    `flex-1 rounded-full px-4 py-1.5 text-sm font-semibold ${
      mode === m ? "bg-pokeblue text-white" : "text-mut hover:text-ink"
    }`;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <div className="flex rounded-full bg-surface2 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={tabClass("signin")} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={tabClass("signup")} onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none focus:border-pokeblue"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none focus:border-pokeblue"
          />
        </label>

        {error ? <p className="text-sm font-medium text-loss">{error}</p> : null}
        {notice ? <p className="text-sm font-medium text-gain">{notice}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-pokeblue px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-mut">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      {OAUTH_PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => oauth(p.id)}
          className="w-full rounded-full border border-line bg-bg px-4 py-2 font-semibold hover:bg-surface2"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
