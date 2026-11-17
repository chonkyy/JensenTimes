import { NextResponse } from "next/server";
import { fetchIntraday } from "@/lib/intraday";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const intraday = await fetchIntraday();
    return NextResponse.json(intraday, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("[intraday]", err);
    return NextResponse.json({ error: "The chart wire is down." }, { status: 502 });
  }
}
