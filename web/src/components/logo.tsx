/**
 * Tanda Nullstamp.
 *
 * The ring uses `currentColor` so it follows its parent's text colour, and
 * palang diagonalnya tetap vermilion di kedua mode. Identitas mask dibuat unik
 * per instance, because two masks sharing an id on one page would
 * menimpa.
 */
"use client";

import { useId } from "react";

export function Logo({
  size = 28,
  className,
  animate = false,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const maskId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Nullstamp"
      className={[className, animate ? "ns-stamp-in" : ""].filter(Boolean).join(" ")}
    >
      <mask id={maskId}>
        <rect width="32" height="32" fill="#fff" />
        <line
          x1="7"
          y1="25"
          x2="25"
          y2="7"
          stroke="#000"
          strokeWidth="7.6"
          strokeLinecap="round"
        />
      </mask>
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.25"
        mask={`url(#${maskId})`}
      />
      <line
        x1="7.6"
        y1="24.4"
        x2="24.4"
        y2="7.6"
        stroke="var(--ns-seal)"
        strokeWidth="3.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <Logo size={26} />
      <span className="text-[19px] font-semibold tracking-[-0.02em]">nullstamp</span>
    </span>
  );
}
