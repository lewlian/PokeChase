import { NextResponse } from "next/server";
import { siteStats } from "@/lib/queries";

/** Public JSON API: dataset freshness & coverage. */
export async function GET() {
  return NextResponse.json(siteStats(), {
    headers: { "cache-control": "public, max-age=600" },
  });
}
