"use client";

import { useEffect, useState } from "react";
import { CornerPrice } from "./LiveQuote";

function TodayDate() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);
  return <span>{today ?? " "}</span>;
}

export default function Masthead() {
  return (
    <header className="masthead">
      <CornerPrice />
      <div className="masthead__row">
        <p className="masthead__the">The Jensen</p>
        <hr className="masthead__rule masthead__rule--short" />
      </div>
      <p className="masthead__title">TIMES!</p>
      <hr className="masthead__rule" />
      <p className="masthead__meta">
        <span>&ldquo;All the News That&rsquo;s Fit to Overclock&rdquo;</span>
        <TodayDate />
      </p>
    </header>
  );
}
