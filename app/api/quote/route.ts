import { NextResponse } from "next/server";
import { fetchQuote } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  try {
    const quote = await fetchQuote(apiKey);
    return NextResponse.json(quote, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    });
  } catch (err) {
    console.error("[quote]", err);
    return NextResponse.json({ error: "The price wire is down." }, { status: 502 });
  }
}
