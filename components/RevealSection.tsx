"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

/**
 * A <section> that sets data-inview="false" until it scrolls into view, then "true".
 * Starts unset (SSR / no JS) and only hides itself if it's actually below the fold,
 * so CSS should key hidden states off [data-inview="false"] only.
 */
export default function RevealSection(props: ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <section {...props} ref={ref} data-inview={inView === null ? undefined : String(inView)} />;
}
