/**
 * Shared visual language for the walkthrough.
 *
 * Same palette as the site, so the video and the landing page read as one thing.
 * Values are duplicated rather than imported because the video is a separate
 * package with its own build, and a shared dependency for six colours would cost
 * more than it saves.
 */

export const C = {
  bg: '#0b0f14',
  surface: '#131922',
  line: '#212b38',
  ink: '#f2f4f7',
  muted: '#98a3b3',
  faint: '#5f6b7c',
  seal: '#d6452c',
  verified: '#3fb950',
  denied: '#f85149',
  pending: '#d29922',
} as const;

export const FONT = {
  sans: '"Inter Tight", Inter, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
} as const;

/** One place to change the pace of the whole piece. */
export const FPS = 30;

/**
 * Scene boundaries in frames. Kept as one table so the timing of the piece can be
 * read at a glance instead of hunted through components.
 */
export const SCENES = {
  title: { from: 0, dur: 90 },
  problem: { from: 90, dur: 165 },
  mechanism: { from: 255, dur: 195 },
  receipt: { from: 450, dur: 210 },
  offline: { from: 660, dur: 195 },
  tamper: { from: 855, dur: 165 },
  findings: { from: 1020, dur: 195 },
  close: { from: 1215, dur: 105 },
} as const;

export const TOTAL = SCENES.close.from + SCENES.close.dur;