import { NextResponse, type NextRequest } from "next/server";
import { FINNHUB_NEWS_LINK, fetchPreview, type LinkPreview } from "@/lib/preview";

export const dynamic = "force-dynamic";

/** Articles don't change their share cards; keep a small in-memory copy between requests. */
const MAX_CACHED = 300;
const cache = new Map<string, LinkPreview>();

export async function GET(req: NextRequest) {
  const link = req.nextUrl.searchParams.get("u") ?? "";
  if (!FINNHUB_NEWS_LINK.test(link)) {
    return NextResponse.json({ error: "Only Finnhub news links can be previewed." }, { status: 400 });
  }

  let preview = cache.get(link);
  if (!preview) {
    try {
      preview = await fetchPreview(link);
    } catch (err) {
      console.error("[preview]", link, (err as Error).message);
      return NextResponse.json(
        { error: "No preview available." },
        { status: 502, headers: { "Cache-Control": "public, s-maxage=300" } },
      );
    }
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
    cache.set(link, preview);
  }

  return NextResponse.json(preview, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
