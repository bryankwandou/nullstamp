"use client";

/**
 * Penyingkapan saat bagian masuk pandangan.
 *
 * The final state is the CSS default, so the content stays visible with JavaScript
 * off. The observer detaches after firing once, because a section already shown
 * does not need watching.
 */

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setTampil(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTampil(true);
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={["ns-reveal", className].filter(Boolean).join(" ")}
      data-shown={tampil ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
