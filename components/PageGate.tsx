"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuoteReady } from "./LiveQuote";
import { preloadPreviews } from "./WirePreview";

/**
 * Site-wide loading gate. Nothing is shown (just the gray cover backdrop, with scrolling
 * locked) until everything is in: the price and chart, web fonts, every <img> on the page,
 * and every headline's link preview including its share image. Then data-ready is set and
 * the cover intro starts.
 *
 * Without JavaScript the gate CSS doesn't apply (it's inside @media (scripting: enabled)).
 */

/** Never leave the page blank forever if some outlet's image hangs. */
const MAX_WAIT_MS = 12_000;

const ReadyContext = createContext(true);
export const usePageReady = () => useContext(ReadyContext);

const windowLoaded = () =>
  new Promise<void>((res) => {
    if (document.readyState === "complete") res();
    else window.addEventListener("load", () => res(), { once: true });
  });

/** Every <img> in the document, lazy ones included, downloaded and decoded. */
const imagesLoaded = () =>
  Promise.all(
    Array.from(document.images, (img) => {
      if (img.loading === "lazy") img.loading = "eager";
      return img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined);
    }),
  );

export default function PageGate({ children }: { children: ReactNode }) {
  const quoteReady = useQuoteReady();
  const [assetsReady, setAssetsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const ready = (quoteReady && assetsReady) || timedOut;

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-preview]"), (a) => a.href);
    Promise.all([windowLoaded(), document.fonts.ready, imagesLoaded(), preloadPreviews(links)]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ReadyContext.Provider value={ready}>
      <div className="site" data-ready={ready ? "" : undefined}>
        {children}
      </div>
    </ReadyContext.Provider>
  );
}
