"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "./logo";

const TAUTAN = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/verify", label: "Verify" },
  { href: "/findings", label: "Findings" },
];

export function SiteHeader() {
  const [berpindah, setBerpindah] = useState(false);

  useEffect(() => {
    const onScroll = () => setBerpindah(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-200",
        berpindah
          ? "border-b border-line bg-bg/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-seal">
          <Wordmark />
        </Link>

        <nav className="flex items-center gap-1">
          {TAUTAN.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-md px-3 py-2 text-[14px] text-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
            >
              {t.label}
            </Link>
          ))}
          <a
            href="https://github.com/bryankwandou/nullstamp"
            className="ml-2 rounded-md border border-line px-3 py-2 text-[14px] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
          >
            Code
          </a>
        </nav>
      </div>
    </header>
  );
}
