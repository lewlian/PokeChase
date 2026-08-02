import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");

  const provider = user.app_metadata?.provider ?? "email";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-3xl font-bold">Account</h1>

      <dl className="space-y-3 rounded-2xl border border-line bg-surface p-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-mut">Email</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mut">Sign-in method</dt>
          <dd className="font-medium capitalize">{provider}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mut">Member since</dt>
          <dd className="font-medium">{shortDate(user.created_at?.slice(0, 10))}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/portfolio"
          className="rounded-full bg-surface2 px-4 py-1.5 font-semibold text-mut hover:text-ink"
        >
          My portfolio
        </Link>
        <Link
          href="/watchlists"
          className="rounded-full bg-surface2 px-4 py-1.5 font-semibold text-mut hover:text-ink"
        >
          My watchlists
        </Link>
        <form action="/auth/signout" method="post" className="ml-auto">
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-1.5 font-semibold text-loss hover:bg-surface2"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
