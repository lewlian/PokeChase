import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/auth-redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

interface Props {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  const user = await getUser();
  if (user) redirect(next);

  if (!supabaseEnv()) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold">Sign in</h1>
        <p className="mt-4 rounded-xl border border-line bg-surface p-6 text-mut">
          Accounts aren&apos;t configured on this deployment yet — the
          NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment
          variables are missing.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Welcome, trainer</h1>
        <p className="mt-1 text-mut">
          Sign in to track your collection, build watchlists, and follow your
          portfolio&apos;s value.
        </p>
      </header>
      {sp.error === "auth" ? (
        <div className="rounded-xl border border-loss/40 bg-surface p-4 text-sm text-loss">
          <p>Sign-in didn&apos;t complete — please try again.</p>
          {sp.reason ? <p className="mt-1 text-xs text-mut">{sp.reason}</p> : null}
        </div>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
