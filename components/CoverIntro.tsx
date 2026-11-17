"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { usePageReady } from "./PageGate";

/**
 * Landing sequence:
 *   pending (gray page until PageGate says the whole site is loaded) → shell (masthead + price box drop in)
 *           → stamp (Jensen is slapped onto the page like a sticker, straight into place)
 *           → text  (headline, odometer and the rest of the story snap in)
 */
export type IntroPhase = "pending" | "shell" | "stamp" | "text";

const IntroContext = createContext<IntroPhase>("text");
export const useIntroPhase = () => useContext(IntroContext);

const SHELL_MS = 350;
const STAMP_MS = 420;
/** Fraction of the stamp where the sticker hits the page. */
const IMPACT = 0.8;

const FALL = "cubic-bezier(.55,0,.85,.35)";
const SETTLE = "cubic-bezier(.2,1.6,.4,1)";

export default function CoverIntro({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<IntroPhase>("pending");
  // Everything on the site is loaded (see PageGate), so the intro can play.
  const go = usePageReady();

  useLayoutEffect(() => {
    if (!go) return;
    const frame = ref.current?.querySelector<HTMLElement>(".hero__frame");
    const photo = ref.current?.querySelector<HTMLElement>(".cover__photo");
    if (!frame || !photo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("text");
      return;
    }

    setPhase("shell");
    let cancelled = false;
    const anims: Animation[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stamp = () => {
      if (cancelled) return;

      const drop = frame.animate(
        [
          // transform only, so the browser can run it on the GPU without repainting the photo
          { transform: "scale(2.1) rotate(-9deg)", easing: FALL },
          { offset: IMPACT, transform: "scale(.95) rotate(1deg)", easing: SETTLE },
          { transform: "none" },
        ],
        { duration: STAMP_MS, fill: "backwards" },
      );
      const fadeIn = frame.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        fill: "backwards",
      });
      const shake = photo.animate(
        [
          { transform: "none" },
          { transform: "translate(-6px, 4px) rotate(-0.4deg)" },
          { transform: "translate(5px, -3px) rotate(0.3deg)" },
          { transform: "translate(-3px, 2px) rotate(-0.15deg)" },
          { transform: "translate(1px, -1px)" },
          { transform: "none" },
        ],
        { duration: 260, delay: STAMP_MS * IMPACT, easing: "ease-out" },
      );
      anims.push(drop, fadeIn, shake);
      setPhase("stamp");

      drop.finished
        .then(() => {
          if (!cancelled) setPhase("text");
        })
        .catch(() => {
          /* cancelled on unmount */
        });
    };

    // Wait (briefly) for the photo so we don't stamp an empty frame, and give the masthead a beat.
    const img = frame.querySelector("img");
    const ready = img && !img.complete ? img.decode().catch(() => undefined) : Promise.resolve();
    const fallback = new Promise((res) => setTimeout(res, 1500));
    const beat = new Promise((res) => setTimeout(res, SHELL_MS));
    Promise.all([Promise.race([ready, fallback]), beat]).then(() => {
      timer = setTimeout(stamp, 0);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      anims.forEach((a) => a.cancel());
    };
  }, [go]);

  return (
    <IntroContext.Provider value={phase}>
      <main ref={ref} className="cover" data-intro={phase}>
        {children}
      </main>
    </IntroContext.Provider>
  );
}
