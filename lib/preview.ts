/**
 * Link previews for the news wire: follow a Finnhub news link to the real article
 * and read its share metadata (Open Graph / Twitter card tags).
 */

export interface LinkPreview {
  /** Final article URL after redirects */
  url: string;
  host: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
}

/** Only Finnhub's own news redirect links are accepted, so this can't be pointed at arbitrary URLs. */
export const FINNHUB_NEWS_LINK = /^https:\/\/finnhub\.io\/api\/news\?id=[0-9a-f]{16,128}$/;

const MAX_REDIRECTS = 6;
const MAX_BYTES = 600_000; // <head> is near the top; don't download whole pages
const TIMEOUT_MS = 6000;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Refuse redirects to loopback / private hosts. */
function isPublicHttpUrl(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h.startsWith("[")) return false; // IPv6 literals
  const ip = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
      return false;
  }
  return true;
}

async function readHead(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

const NAMED: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NAMED[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));

function metaTags(html: string) {
  const out = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = attr(tag, "property") ?? attr(tag, "name");
    const val = attr(tag, "content");
    if (!key || !val) continue;
    const k = (key[2] ?? key[3]).toLowerCase();
    if (!out.has(k)) out.set(k, decode(val[2] ?? val[3]));
  }
  return out;
}

/** Strip " | The Motley Fool"-style suffixes that just repeat the outlet name. */
function tidyTitle(title: string | null, site: string | null) {
  if (!title || !site) return title;
  const m = title.match(/^(.*\S)\s+[|\-–—]\s+(.+)$/);
  return m && m[2].toLowerCase().includes(site.toLowerCase()) ? m[1] : title;
}

export async function fetchPreview(link: string): Promise<LinkPreview> {
  let url = new URL(link);
  let res: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isPublicHttpUrl(url)) throw new Error(`Refusing to fetch ${url.host}`);
    res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!next) break;
    res.body?.cancel().catch(() => {});
    url = new URL(next, url);
    res = null;
  }
  if (!res) throw new Error("Too many redirects");
  if (!res.ok) throw new Error(`Article responded ${res.status}`);
  if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("Not an HTML page");

  const html = await readHead(res);
  const meta = metaTags(html);
  const pick = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v) ?? null;

  const siteName = pick("og:site_name", "application-name");
  const docTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const title = tidyTitle(pick("og:title", "twitter:title") ?? (docTitle ? decode(docTitle) : null), siteName);
  const rawImage = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  let image: string | null = null;
  if (rawImage) {
    try {
      const u = new URL(rawImage, url);
      if (u.protocol === "https:" || u.protocol === "http:") image = u.href;
    } catch {
      /* ignore malformed image URLs */
    }
  }

  return {
    url: url.href,
    host: url.hostname.replace(/^www\./, ""),
    siteName,
    title,
    description: pick("og:description", "twitter:description", "description"),
    image,
  };
}
