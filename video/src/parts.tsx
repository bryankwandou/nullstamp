/**
 * Small building blocks the scenes are assembled from.
 *
 * Everything animates off the frame number rather than CSS transitions, because
 * Remotion renders each frame independently — a CSS animation would render at its
 * starting state on every single frame.
 */

import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';

/** Fade and lift, driven by a spring so the motion has weight rather than being linear. */
export const Rise: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({delay = 0, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const t = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, mass: 0.6},
  });

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [18, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** The Nullstamp mark: a ring with a slash through it. Drawn, not imported. */
export const Mark: React.FC<{size?: number}> = ({size = 64}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const draw = spring({frame, fps, config: {damping: 200, mass: 1.1}});
  const circumference = 2 * Math.PI * 26;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{display: 'block'}}>
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke={C.ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - draw)}
        transform="rotate(-90 32 32)"
      />
      <line
        x1="20"
        y1="44"
        x2="44"
        y2="20"
        stroke={C.seal}
        strokeWidth="5"
        strokeLinecap="round"
        opacity={interpolate(draw, [0.55, 1], [0, 1], {extrapolateLeft: 'clamp'})}
      />
    </svg>
  );
};

/** Section label above a heading. */
export const Kicker: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: 20,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: C.seal,
    }}
  >
    {children}
  </div>
);

export const Title: React.FC<{children: React.ReactNode; size?: number}> = ({
  children,
  size = 62,
}) => (
  <h1
    style={{
      fontFamily: FONT.sans,
      fontSize: size,
      fontWeight: 600,
      lineHeight: 1.08,
      letterSpacing: '-0.03em',
      color: C.ink,
      margin: 0,
    }}
  >
    {children}
  </h1>
);

export const Body: React.FC<{children: React.ReactNode; width?: number}> = ({
  children,
  width = 820,
}) => (
  <p
    style={{
      fontFamily: FONT.sans,
      fontSize: 27,
      lineHeight: 1.55,
      color: C.muted,
      margin: 0,
      maxWidth: width,
    }}
  >
    {children}
  </p>
);

/** A bordered panel, used wherever real output is shown. */
export const Panel: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}> = ({children, accent = C.line, style}) => (
  <div
    style={{
      background: C.surface,
      border: `2px solid ${accent}`,
      borderRadius: 12,
      padding: '26px 30px',
      fontFamily: FONT.mono,
      fontSize: 22,
      lineHeight: 1.6,
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Reveal a string character by character.
 *
 * Used for the digests. Watching a 64-character hash arrive is what makes the
 * match at the end feel earned rather than asserted.
 */
export const Typed: React.FC<{
  text: string;
  delay?: number;
  perChar?: number;
  color?: string;
  size?: number;
}> = ({text, delay = 0, perChar = 0.7, color = C.ink, size = 22}) => {
  const frame = useCurrentFrame();
  const shown = Math.max(
    0,
    Math.min(text.length, Math.floor((frame - delay) / perChar)),
  );

  return (
    <span style={{fontFamily: FONT.mono, fontSize: size, color, letterSpacing: '0.01em'}}>
      {text.slice(0, shown)}
      <span style={{opacity: shown < text.length ? 1 : 0, color: C.seal}}>▋</span>
    </span>
  );
};

/** A pass or fail row, as the browser verifier shows them. */
export const Check: React.FC<{
  label: string;
  detail: string;
  ok: boolean;
  delay?: number;
}> = ({label, detail, ok, delay = 0}) => (
  <Rise delay={delay} style={{display: 'flex', gap: 14, alignItems: 'baseline'}}>
    <span
      style={{
        color: ok ? C.verified : C.denied,
        fontSize: 26,
        lineHeight: 1,
        transform: 'translateY(2px)',
      }}
    >
      {ok ? '●' : '●'}
    </span>
    <span style={{fontFamily: FONT.sans, fontSize: 25, color: C.ink, fontWeight: 500}}>
      {label}
    </span>
    <span style={{fontFamily: FONT.sans, fontSize: 24, color: C.muted}}>{detail}</span>
  </Rise>
);

/** Full-bleed scene frame with consistent padding. */
export const Stage: React.FC<{children: React.ReactNode; gap?: number}> = ({
  children,
  gap = 30,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: C.bg,
      padding: '84px 96px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap,
    }}
  >
    {children}
  </div>
);
