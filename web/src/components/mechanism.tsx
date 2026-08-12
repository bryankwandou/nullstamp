"use client";

/**
 * The flow of a single receipt issuance.
 *
 * There is one thing a reader has to take away: the enclave boundary sits between
 * the contract and the third party, and marker substitution happens at that
 * boundary. So the boundary is drawn as a box that genuinely encloses, rather
 * than as a label.
 */

import { useEffect, useRef, useState } from "react";

const LANGKAH = [
  {
    no: "1",
    judul: "The contract assembles the request",
    isi: "The request body carries only markers such as {{profile.first_name}}. The contract never asks for the values, so it never receives them.",
  },
  {
    no: "2",
    judul: "The host substitutes inside the enclave",
    isi: "Substitution happens after the contract has finished and before the request leaves. A contract that re-reads its own request body finds only the markers.",
  },
  {
    no: "3",
    judul: "The data owner's grant decides the destination",
    isi: "The destination host must appear on the grant. Anything else is refused with egress_denied, and the contract cannot authorise itself.",
  },
  {
    no: "4",
    judul: "The receipt is issued and anchored",
    isi: "Field names, destination host, body digest, and status code are bound by one SHA-256 digest, planted in the transaction Merkle leaf via set-claims-digest.",
  },
];

export function Mechanism() {
  const ref = useRef<SVGSVGElement>(null);
  const [jalan, setJalan] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setJalan(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setJalan(true);
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface p-5">
        <svg
          ref={ref}
          viewBox="0 0 460 300"
          className="w-full min-w-[420px]"
          role="img"
          aria-label="Receipt issuance flow: the contract assembles markers, the host substitutes them inside the enclave, then the request leaves for the third party"
        >
          {/* Batas enclave */}
          <rect
            x="12"
            y="34"
            width="266"
            height="182"
            rx="10"
            fill="none"
            stroke="var(--ns-seal)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            opacity="0.65"
          />
          <text
            x="24"
            y="26"
            fontSize="11"
            fill="var(--ns-seal)"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            TEE enclave boundary
          </text>

          {/* Kotak contract */}
          <Kotak x={32} y={58} w={110} h={54} label="contract" sub="z:…:nullstamp" />

          {/* Kotak penyelesai marker */}
          <Kotak
            x={32}
            y={146}
            w={226}
            h={52}
            label="marker substitution"
            sub="http-with-placeholders"
            aksen
          />

          {/* KV store */}
          <Kotak x={168} y={58} w={90} h={54} label="KV" sub="secrets" />

          {/* Pihak ketiga di luar batas */}
          <Kotak x={318} y={146} w={126} h={52} label="third party" sub="host on grant" />

          {/* Merkle leaf */}
          <Kotak x={318} y={58} w={126} h={54} label="Merkle leaf" sub="claims digest" />

          {/* Panah: contract -> penyelesai */}
          <Garis d="M 87 112 L 87 146" jalan={jalan} tunda={0} />
          <Label x={93} y={134} teks="marker" />
          {/* KV -> contract */}
          <Garis d="M 168 85 L 142 85" jalan={jalan} tunda={260} />
          {/* penyelesai -> pihak ketiga */}
          <Garis d="M 258 172 L 318 172" jalan={jalan} tunda={520} />
          <Label x={262} y={166} teks="values filled in" aksen />
          {/* contract -> merkle */}
          <Garis d="M 142 72 L 318 72" jalan={jalan} tunda={780} />
          <Label x={196} y={66} teks="digest" />

          <text
            x="330"
            y="222"
            fontSize="10.5"
            fill="var(--ns-muted)"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            outside the enclave
          </text>

          <text
            x="24"
            y="246"
            fontSize="11.5"
            fill="var(--ns-muted)"
            fontFamily="var(--font-inter-tight), sans-serif"
          >
            Profile values exist only on the lower-right arrow.
          </text>
          <text
            x="24"
            y="264"
            fontSize="11.5"
            fill="var(--ns-muted)"
            fontFamily="var(--font-inter-tight), sans-serif"
          >
            That arrow starts outside the contract, not within it.
          </text>
        </svg>
      </div>

      <ol className="space-y-7">
        {LANGKAH.map((l) => (
          <li key={l.no} className="flex gap-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[12px] text-seal">
              {l.no}
            </span>
            <div>
              <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{l.judul}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{l.isi}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Kotak({
  x,
  y,
  w,
  h,
  label,
  sub,
  aksen = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  aksen?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="7"
        fill="var(--ns-bg)"
        stroke={aksen ? "var(--ns-seal)" : "var(--ns-line)"}
        strokeWidth={aksen ? 1.6 : 1.2}
      />
      <text
        x={x + 12}
        y={y + 22}
        fontSize="12.5"
        fill="var(--ns-text)"
        fontFamily="var(--font-inter-tight), sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
      <text
        x={x + 12}
        y={y + 39}
        fontSize="10.5"
        fill="var(--ns-faint)"
        fontFamily="var(--font-jetbrains-mono), monospace"
      >
        {sub}
      </text>
    </g>
  );
}

function Label({
  x,
  y,
  teks,
  aksen = false,
}: {
  x: number;
  y: number;
  teks: string;
  aksen?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize="9.5"
      fill={aksen ? "var(--ns-seal)" : "var(--ns-faint)"}
      fontFamily="var(--font-jetbrains-mono), monospace"
    >
      {teks}
    </text>
  );
}

function Garis({
  d,
  jalan,
  tunda,
}: {
  d: string;
  jalan: boolean;
  tunda: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  const [panjang, setPanjang] = useState(240);

  useEffect(() => {
    if (ref.current) setPanjang(ref.current.getTotalLength());
  }, []);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke="var(--ns-muted)"
      strokeWidth="1.4"
      strokeLinecap="round"
      style={{
        strokeDasharray: panjang,
        strokeDashoffset: jalan ? 0 : panjang,
        transition: `stroke-dashoffset 620ms cubic-bezier(0.22,1,0.36,1) ${tunda}ms`,
      }}
    />
  );
}
