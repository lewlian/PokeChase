import { NextResponse } from "next/server";
import { priceHistory } from "@/lib/queries";

/** Public JSON API: full price time series for any product (card or sealed). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }
  const history = priceHistory(productId);
  return NextResponse.json(
    { productId, points: history },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
