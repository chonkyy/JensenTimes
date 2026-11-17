import RevealSection from "@/components/RevealSection";
import WirePreview from "@/components/WirePreview";
import { fetchScandalNews, type NewsItem } from "@/lib/news";

const stamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

async function loadNews(): Promise<NewsItem[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    return await fetchScandalNews(apiKey);
  } catch (err) {
    console.error("[news]", err);
    return null;
  }
}

/** Page 4: the latest real headlines about the scandal, Jensen Huang and NVIDIA, off Finnhub's news wire. */
export default async function Headlines() {
  const news = await loadNews();
  const [lead, ...rest] = news ?? [];

  return (
    <RevealSection className="wire" aria-labelledby="wire-title">
      <header className="wire__head">
        <h2 id="wire-title" className="wire__title">
          Read All <span>About It!</span>
        </h2>
      </header>

      {lead ? (
        <div className="wire__grid">
          <article className="wire__lead">
            <span className="wire__flag">Latest</span>
            <p className="wire__meta">
              {lead.source} &middot; <time dateTime={new Date(lead.publishedAt).toISOString()}>{stamp.format(lead.publishedAt)} ET</time>
            </p>
            <h3 className="wire__lead-headline">
              <a href={lead.url} target="_blank" rel="noopener noreferrer" data-preview>
                {lead.headline}
              </a>
            </h3>
            {lead.summary && <p className="wire__lead-summary">{lead.summary}</p>}
          </article>

          <ol className="wire__list">
            {rest.map((n) => (
              <li key={n.id} className="wire__item">
                <p className="wire__meta">
                  {n.source} &middot; <time dateTime={new Date(n.publishedAt).toISOString()}>{stamp.format(n.publishedAt)} ET</time>
                </p>
                <h3 className="wire__headline">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" data-preview>
                    {n.headline}
                  </a>
                </h3>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="wire__down">The news wire is down. Our reporters are hiding in the bushes; check back shortly.</p>
      )}

      <WirePreview />

      <p className="poweredby">Powered by Finnhub</p>
    </RevealSection>
  );
}
