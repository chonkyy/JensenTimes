"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Silhouette from "@/components/Silhouette";
import { ADMITTED, ADMITTED_PEOPLE, ALLEGED, ALLEGED_PEOPLE, PEOPLE, type Person } from "@/lib/scandals";

const TICKER = "ALLEGED · UNPROVEN · NO COMMENT · SOURCES SAY · ";
const HOVER_GRACE_MS = 160;

/** Person numbers run across both groups: No. 1, No. 2, No. 3 … */
const numberOf = (p: Person) => PEOPLE.indexOf(p) + 1;
const cardId = (p: Person) => `dossier-${p.id}`;

/**
 * Page 2: a tilted tape ribbon with the admitted / alleged counts. Each person is a
 * numbered stamp; hovering (mouse), focusing (keyboard) or tapping (touch) it opens
 * their dossier card below the ribbon.
 */
export default function ScandalRibbon() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState({ left: 0, arrow: 0 });
  const [inView, setInView] = useState<boolean | null>(null);

  const active = hovered ?? pinned;

  // Reveal the ribbon when it scrolls into view. Starts visible (SSR / no JS); only
  // hides itself first if it is actually below the fold.
  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    setInView(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Line the floating card (desktop) up under its token, kept inside the panel.
  const place = useCallback((id: string | null) => {
    const token = id ? tokenRefs.current[id] : null;
    const panel = panelRef.current;
    if (!token || !panel) return;
    const card = document.getElementById(`dossier-${id}`);
    const t = token.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const w = card?.offsetWidth ?? 0;
    const center = t.left + t.width / 2 - p.left;
    const left = Math.max(0, Math.min(center - w / 2, p.width - w));
    const arrow = Math.max(24, Math.min(center - left, w - 24));
    setCardPos({ left, arrow });
  }, []);

  useLayoutEffect(() => {
    place(active);
    if (!active) return;
    const onResize = () => place(active);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, place]);

  // Escape closes; a tap/click outside the ribbon unpins.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (active) tokenRefs.current[active]?.focus();
      setHovered(null);
      setPinned(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) {
        setPinned(null);
        setHovered(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [active]);

  // On phones the card opens below the ribbon; bring it on screen after a tap.
  useEffect(() => {
    if (!pinned || window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`dossier-${pinned}`)?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [pinned]);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const enter = (id: string) => {
    clearTimeout(leaveTimer.current);
    setHovered(id);
  };
  // Small grace period so the mouse can travel from the stamp down onto the card.
  const leave = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(null), HOVER_GRACE_MS);
  };

  const token = (p: Person) => {
    const n = numberOf(p);
    const isActive = active === p.id;
    return (
      <li key={p.id} className="ribbon__item">
        <button
          type="button"
          ref={(el) => {
            tokenRefs.current[p.id] = el;
          }}
          className={`ribbon__token ribbon__token--${p.status} ${isActive ? "is-active" : ""}`}
          aria-expanded={isActive}
          aria-controls={cardId(p)}
          aria-label={`No. ${n}: ${p.name ?? "unnamed person"}, ${p.status}`}
          onPointerEnter={(e) => e.pointerType === "mouse" && enter(p.id)}
          onPointerLeave={(e) => e.pointerType === "mouse" && leave()}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && enter(p.id)}
          onBlur={() => leave()}
          onClick={() => setPinned((cur) => (cur === p.id ? null : p.id))}
        >
          <span className="ribbon__token-no" aria-hidden="true">
            No.
          </span>
          <span className="ribbon__token-n" aria-hidden="true">
            {n}
          </span>
        </button>
      </li>
    );
  };

  return (
    <section
      ref={sectionRef}
      className="ribbon"
      aria-labelledby="ribbon-title"
      data-inview={inView === null ? undefined : String(inView)}
    >
      <header className="ribbon__head">
        <h2 id="ribbon-title" className="ribbon__title">
          Who Are The <span>Affairs</span>?
        </h2>
      </header>

      <div className="ribbon__stage" ref={stageRef}>
        <div className="ribbon__band">
          <div className="ribbon__ticker" aria-hidden="true">
            <span>{TICKER.repeat(8)}</span>
            <span>{TICKER.repeat(8)}</span>
          </div>

          <div className="ribbon__counts">
            <div className="ribbon__group ribbon__group--admitted">
              <span className="ribbon__count" aria-hidden="true">
                {ADMITTED}
              </span>
              <div className="ribbon__group-body">
                <h3 className="ribbon__label">
                  <span className="sr-only">{ADMITTED} </span>Admitted
                  <br />
                  Affair{ADMITTED === 1 ? "" : "s"}
                </h3>
                <ul className="ribbon__tokens">{ADMITTED_PEOPLE.map(token)}</ul>
              </div>
            </div>

            <span className="ribbon__divider" aria-hidden="true">
              &#10038;
            </span>

            <div className="ribbon__group ribbon__group--alleged">
              <span className="ribbon__count" aria-hidden="true">
                {ALLEGED}
              </span>
              <div className="ribbon__group-body">
                <h3 className="ribbon__label">
                  <span className="sr-only">{ALLEGED} </span>Alleged
                  <br />
                  Affair{ALLEGED === 1 ? "" : "s"}
                </h3>
                <ul className="ribbon__tokens">{ALLEGED_PEOPLE.map(token)}</ul>
              </div>
            </div>
          </div>
        </div>

        <div
          className="ribbon__panel"
          ref={panelRef}
          data-active={active ?? undefined}
          style={{ "--card-left": `${cardPos.left}px`, "--arrow-x": `${cardPos.arrow}px` } as React.CSSProperties}
        >
          {PEOPLE.map((p) => (
            <Dossier
              key={p.id}
              person={p}
              active={active === p.id}
              onEnter={() => enter(p.id)}
              onLeave={leave}
            />
          ))}
        </div>
      </div>

    </section>
  );
}

function Dossier({
  person: p,
  active,
  onEnter,
  onLeave,
}: {
  person: Person;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <article
      id={cardId(p)}
      className={`dossier dossier--${p.status} ${active ? "is-active" : ""}`}
      aria-label={`No. ${numberOf(p)}: ${p.name ?? "Name withheld"}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && onEnter()}
      onPointerLeave={(e) => e.pointerType === "mouse" && onLeave()}
    >
      <div className="dossier__photo">
        {p.photo ? (
          <>
            <Image
              src={p.photo.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 200px, 190px"
              className="dossier__img"
              style={p.photo.focus ? ({ "--focus": p.photo.focus } as React.CSSProperties) : undefined}
            />
            <span className="dossier__credit">
              {p.photo.credit}, {p.photo.license}
            </span>
          </>
        ) : (
          <Silhouette withheld={!p.name} />
        )}
        <span className="dossier__no">No. {numberOf(p)}</span>
      </div>

      <div className="dossier__body">
        <span className="dossier__stamp">{p.status}</span>
        <h4 className="dossier__name">{p.name ?? "Name withheld"}</h4>
        <p className="dossier__role">{p.role}</p>
        <p className="dossier__summary">{p.summary}</p>
        <p className="dossier__response">{p.response}</p>
        <p className="dossier__sources">
          Source:{" "}
          {p.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ", "}
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.outlet}
              </a>{" "}
              ({s.date})
            </span>
          ))}
          {!p.photo && <span className="dossier__nophoto"> &middot; No licensed photo available</span>}
        </p>
      </div>
    </article>
  );
}
