import { useId, type CSSProperties } from "react";
import type { Point } from "@/lib/intraday";

export type { Point };

const W = 200;
const H = 44;
const PAD = 3;

interface Props {
  points: Point[];
  /** Previous close, drawn as a dotted reference line. */
  baseline?: number | null;
  up: boolean;
  /** Plays the left-to-right draw-in once this turns true. */
  animate: boolean;
}

export default function Sparkline({ points, baseline, up, animate }: Props) {
  // useId() contains characters (":" or "«»") that break url(#…) references.
  const id = `spark${useId().replace(/[^\w-]/g, "")}`;

  if (points.length < 2) {
    return (
      <div className="sparkline" aria-hidden="true">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <line
            x1={PAD}
            x2={W - PAD}
            y1={H / 2}
            y2={H / 2}
            stroke="currentColor"
            strokeDasharray="4 4"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const base = typeof baseline === "number" ? baseline : null;
  const range = base === null ? prices : [...prices, base];
  const min = Math.min(...range);
  const max = Math.max(...range);
  const span = max - min || 1;
  const t0 = points[0].t;
  const tSpan = points[points.length - 1].t - t0 || 1;

  const x = (t: number) => PAD + ((t - t0) / tSpan) * (W - PAD * 2);
  const y = (price: number) => H - PAD - ((price - min) / span) * (H - PAD * 2);

  const coords = points.map((p) => [x(p.t), y(p.price)] as const);
  const line = coords
    .map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`)
    .join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const area = `${line} L${lastX.toFixed(1)},${H} L${coords[0][0].toFixed(1)},${H} Z`;

  const color = up ? "var(--up)" : "var(--down)";
  const clipId = `${id}-clip`;
  const fillId = `${id}-fill`;
  const dotStyle = {
    left: `${(lastX / W) * 100}%`,
    top: `${(lastY / H) * 100}%`,
    "--spark-color": color,
  } as CSSProperties;

  return (
    <div
      className="sparkline"
      data-animate={animate ? "" : undefined}
      role="img"
      aria-label="NVIDIA price chart for the latest session"
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <clipPath id={clipId}>
            <rect className="sparkline__reveal" x={0} y={0} width={W} height={H} />
          </clipPath>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {base !== null && (
          <line
            x1={0}
            x2={W}
            y1={y(base)}
            y2={y(base)}
            stroke="currentColor"
            strokeDasharray="2 4"
            opacity={0.45}
            vectorEffect="non-scaling-stroke"
          />
        )}

        <g clipPath={`url(#${clipId})`}>
          <path d={area} fill={`url(#${fillId})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      <span className="sparkline__dot" style={dotStyle} />
    </div>
  );
}
