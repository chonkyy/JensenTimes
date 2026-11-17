/**
 * The one disclaimer for the whole paper: a red news crawl across the very top of the page.
 * Screen readers get a single readable copy; the moving track is decorative.
 */
const DISCLAIMER =
  "Satire. Relationships are listed as reported by the outlets cited; apart from Jensen Huang’s own " +
  "admission of infidelity, they are allegations the people named have not confirmed, and the espionage " +
  "claims are unproven. Chart pins mark when stories were reported, not what moved the stock. Prices from " +
  "Finnhub and Yahoo Finance may be delayed. Headlines are from third-party outlets via Finnhub; The Jensen " +
  "Times didn’t write them. Not investment advice. Not affiliated with NVIDIA.";

export default function DisclaimerCrawl() {
  return (
    <aside className="crawl" aria-label="Disclaimer">
      <p className="sr-only">{DISCLAIMER}</p>
      <div className="crawl__track" aria-hidden="true">
        <span className="crawl__text">
          <span className="crawl__label">Disclaimer</span>
          {DISCLAIMER}
          <span className="crawl__sep">&#9733;</span>
        </span>
        <span className="crawl__text crawl__text--dup">
          <span className="crawl__label">Disclaimer</span>
          {DISCLAIMER}
          <span className="crawl__sep">&#9733;</span>
        </span>
      </div>
    </aside>
  );
}
