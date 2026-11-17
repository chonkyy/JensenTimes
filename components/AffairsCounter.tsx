"use client";

import { useEffect, useState } from "react";
import { useIntroPhase } from "@/components/CoverIntro";
import { ADMITTED, ALLEGED } from "@/lib/scandals";

const TOTAL = ADMITTED + ALLEGED;

/** Full revolutions each odometer wheel makes before landing. */
const SPINS = 1;

/** 0…9 repeated SPINS times, then 0…target. */
const strip = (target: number) => [
  ...Array.from({ length: SPINS * 10 }, (_, i) => i % 10),
  ...Array.from({ length: target + 1 }, (_, i) => i),
];

/** An odometer that rolls up to the scandal tally once the intro reaches the headline. */
export default function AffairsCounter() {
  const phase = useIntroPhase();
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (phase !== "text" || rolling) return;
    setRolling(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setLanded(true);
  }, [phase, rolling]);

  // Safety net in case transitionend never fires (e.g. tab hidden).
  useEffect(() => {
    if (!rolling || landed) return;
    const t = setTimeout(() => setLanded(true), 1800);
    return () => clearTimeout(t);
  }, [rolling, landed]);

  const digits = String(TOTAL).split("").map(Number);

  return (
    <h1 className={`headline ${landed ? "is-landed" : ""}`}>
      <span className="sr-only">
        Jensen Huang&rsquo;s scandals: {TOTAL}. {ADMITTED} admitted, {ALLEGED} alleged.
      </span>
      <span aria-hidden="true" className="headline__kicker">
        Official tally of Jensen&rsquo;s scandals:
      </span>
      <span aria-hidden="true" className="headline__row">
        <span
          className={`headline__digit ${landed ? "is-landed" : ""}`}
        >
          {digits.map((d, i) => {
            const rows = strip(d);
            return (
              <span className="odo" key={i}>
                <span
                  className={`odo__strip ${rolling ? "is-rolled" : ""}`}
                  style={{ "--rows": rows.length, transitionDelay: `${60 + i * 40}ms` } as React.CSSProperties}
                  onTransitionEnd={(e) => {
                    if (e.propertyName === "transform" && i === digits.length - 1) setLanded(true);
                  }}
                >
                  {rows.map((n, j) => (
                    <span key={j}>{n}</span>
                  ))}
                </span>
              </span>
            );
          })}
        </span>
        <span className="headline__words">
          Total
          <br />
          Scandals!
        </span>
      </span>
    </h1>
  );
}
