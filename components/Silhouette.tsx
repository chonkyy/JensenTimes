import { useId } from "react";

/** A "photo unavailable" mugshot placeholder: halftone backdrop, head-and-shoulders silhouette. */
export default function Silhouette({
  withheld = false,
}: {
  withheld?: boolean;
}) {
  // useId() contains characters like ":" or "«" that break url(#…) references
  const id = "sil" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const dots = `${id}-dots`;
  const bg = `${id}-bg`;
  return (
    <>
      <svg
        className="silhouette"
        viewBox="0 0 120 140"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id={dots} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill="#8f8c86" />
          </pattern>
          <radialGradient id={bg} cx="50%" cy="35%" r="75%">
            <stop offset="0" stopColor="#d9d7d0" />
            <stop offset="1" stopColor="#a9a69f" />
          </radialGradient>
        </defs>
        <rect width="120" height="140" fill={`url(#${bg})`} />
        <rect width="120" height="140" fill={`url(#${dots})`} opacity="0.55" />
        <g fill="#1c1b1a">
          <ellipse cx="60" cy="56" rx="23" ry="27" />
          <path d="M14 140c2-30 20-46 46-46s44 16 46 46z" />
        </g>
        <text x="60" y="22" textAnchor="middle" className="silhouette__qm">
          ?
        </text>
      </svg>
      {/* An HTML bar, so it spans the column at any width instead of being cropped with the SVG */}
      {withheld && (
        <span className="silhouette__bar" aria-hidden="true">
          Name withheld
        </span>
      )}
    </>
  );
}
