/** Jagged black burst: "A JENSEN TIMES EXCLUSIVE!" */
export function Starburst() {
  const spikes = 18;
  const outer = 50;
  const inner = 41;
  const pts = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a) * 0.62).toFixed(2)}`;
  }).join(" ");

  return (
    <div className="starburst" aria-hidden="true">
      <svg viewBox="0 0 100 62" preserveAspectRatio="none">
        <polygon points={pts} transform="translate(0,-19)" />
      </svg>
      <span>
        A Jensen Times
        <br />
        Exclusive!
      </span>
    </div>
  );
}

export function SubheadBox() {
  return (
    <p className="subhead">
      Leather-Clad CEO Exits Stage Left:
      <br />
      <strong>TURNS OUT HE WASN&rsquo;T ONLY DEVOTED TO HIS GPUs!</strong>
    </p>
  );
}

/** Decorative barcode. Digits nod to NVIDIA's founding date, April 5, 1993. */
export function Barcode() {
  // Deterministic bar widths so server and client render identically.
  const widths = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 1, 3, 1, 2, 2, 1];
  let x = 0;
  const bars = widths.map((w, i) => {
    const bar = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={60} /> : null;
    x += w;
    return bar;
  });

  return (
    <div className="barcode" aria-hidden="true">
      <span className="barcode__digits">0 &nbsp;19930405&nbsp; NVDA</span>
      <svg viewBox={`0 0 ${x} 60`} preserveAspectRatio="none">
        {bars}
      </svg>
    </div>
  );
}
