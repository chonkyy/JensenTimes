"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LinkPreview } from "@/lib/preview";

/** Wait this long on a link before showing its card, so sweeping the mouse across the page doesn't flash cards. */
const SHOW_DELAY_MS = 220;
const GAP = 12;
const MARGIN = 16;

type Entry = LinkPreview | "loading" | "error";

/** One shared cache per page load; the server caches too. */
const previews = new Map<string, Entry>();
const listeners = new Set<() => void>();

const inflight = new Map<string, Promise<void>>();
/** Keep preloaded images referenced so the browser keeps them decoded for the card. */
const warmImages: HTMLImageElement[] = [];

/** Resolves once the image is downloaded and decoded; false if it failed. */
function preloadImage(src: string): Promise<boolean> {
  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.src = src;
  warmImages.push(img);
  return img.decode().then(
    () => true,
    () => false,
  );
}

/** Fetch a link's preview and its share image. Resolves when both are in (or failed). */
function load(link: string): Promise<void> {
  const existing = inflight.get(link);
  if (existing) return existing;
  previews.set(link, "loading");
  const p = fetch(`/api/preview?u=${encodeURIComponent(link)}`)
    .then((r) => (r.ok ? (r.json() as Promise<LinkPreview>) : Promise.reject()))
    .then(async (pv) => {
      // A broken share image shouldn't leave a gray box in the card.
      if (pv.image && !(await preloadImage(pv.image))) pv = { ...pv, image: null };
      previews.set(link, pv);
    })
    .catch(() => {
      previews.set(link, "error");
    })
    .finally(() => listeners.forEach((l) => l()));
  inflight.set(link, p);
  return p;
}

/** Load every preview (data + image) up front; used by PageGate so hover cards are instant. */
export function preloadPreviews(links: string[]): Promise<void> {
  return Promise.all([...new Set(links)].map(load)).then(() => undefined);
}

/**
 * Hovering (mouse) or keyboard-focusing a headline link in the news wire shows a small
 * preview card of the article: its share image, outlet, title and blurb. Links opt in
 * with data-preview. Touch devices skip it; a tap just opens the article.
 */
export default function WirePreview() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState<HTMLAnchorElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const [, rerender] = useState(0);

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  useEffect(() => {
    const root = anchorRef.current?.closest<HTMLElement>(".wire");
    if (!root || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const target = (e: Event) => (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[data-preview]") ?? null;

    const show = (a: HTMLAnchorElement) => {
      clearTimeout(timer);
      load(a.href);
      timer = setTimeout(() => {
        setLink(a);
        setVisible(true);
      }, SHOW_DELAY_MS);
    };
    const hide = () => {
      clearTimeout(timer);
      setVisible(false);
    };

    const onOver = (e: PointerEvent) => {
      const a = target(e);
      if (a && e.pointerType === "mouse") show(a);
    };
    const onOut = (e: PointerEvent) => {
      const a = target(e);
      if (a && !a.contains(e.relatedTarget as Node | null)) hide();
    };
    const onFocus = (e: FocusEvent) => {
      const a = target(e);
      if (a?.matches(":focus-visible")) show(a);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerout", onOut);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", hide);
    root.addEventListener("pointerdown", hide);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerout", onOut);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", hide);
      root.removeEventListener("pointerdown", hide);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, []);

  const entry = link ? previews.get(link.href) : undefined;

  // Place the card below the headline if it fits, otherwise above; keep it on screen.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!visible || !link || !card) return;
    const r = link.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const left = Math.max(MARGIN, Math.min(r.left, vw - w - MARGIN));
    const above = r.bottom + GAP + h > window.innerHeight - MARGIN && r.top - GAP - h > MARGIN;
    setPos({ left, top: above ? r.top - GAP - h : r.bottom + GAP, above });
  }, [visible, link, entry]);

  return (
    <span ref={anchorRef} className="wire-preview__anchor">
      {link && (
        <div
          ref={cardRef}
          className={`wire-preview ${visible && pos ? "is-visible" : ""} ${pos?.above ? "is-above" : ""}`}
          style={pos ? { left: pos.left, top: pos.top } : undefined}
          aria-hidden="true"
        >
          <PreviewBody entry={entry} fallbackHost={new URL(link.href).hostname} />
        </div>
      )}
    </span>
  );
}

function PreviewBody({ entry, fallbackHost }: { entry: Entry | undefined; fallbackHost: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const p = typeof entry === "object" ? entry : null;

  useEffect(() => setImgFailed(false), [p?.image]);

  if (!p) {
    return (
      <div className="wire-preview__status">
        {entry === "error" ? (
          <>
            <strong>No preview</strong>
            <span>The page wouldn&rsquo;t talk to us. Click through to read it.</span>
          </>
        ) : (
          <>
            <strong>Fetching the scoop&hellip;</strong>
            <span>{fallbackHost.replace(/^www\./, "")}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {p.image && !imgFailed && (
        <div className="wire-preview__img">
          {/* External share images from arbitrary outlets, so not next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
        </div>
      )}
      <div className="wire-preview__body">
        <p className="wire-preview__site">
          {p.siteName ?? p.host}
          {p.siteName && <span> &middot; {p.host}</span>}
        </p>
        {p.title && <p className="wire-preview__title">{p.title}</p>}
        {p.description && <p className="wire-preview__desc">{p.description}</p>}
      </div>
    </>
  );
}
