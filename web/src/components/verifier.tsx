"use client";

/**
 * A receipt verifier that runs entirely in the browser.
 *
 * The tamper buttons are not decoration. The only way to convince someone the
 * check is real is to let them break the receipt themselves and watch it get
 * rejected.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SAMPLE_RECEIPT,
  periksa,
  type Envelope,
  type Hasil,
  type Json,
} from "@/lib/receipt";

type Pengubahan =
  | { jenis: "original" }
  | { jenis: "hide-field" }
  | { jenis: "swap-host" }
  | { jenis: "repair-digest" };

const PILIHAN: Array<{ nilai: Pengubahan["jenis"]; label: string; catatan: string }> = [
  { nilai: "original", label: "Original receipt", catatan: "verbatim output from the contract on testnet" },
  {
    nilai: "hide-field",
    label: "Hide a field",
    catatan: "claim less data than was actually touched",
  },
  {
    nilai: "swap-host",
    label: "Swap the host",
    catatan: "change where the data was sent",
  },
  {
    nilai: "repair-digest",
    label: "Edit, then repair the digest",
    catatan: "the careful attack: make the digest agree again",
  },
];

function terapkan(env: Envelope, p: Pengubahan["jenis"]): Envelope {
  const salinan = JSON.parse(JSON.stringify(env)) as Envelope;
  const core = salinan.core as Record<string, Json>;

  switch (p) {
    case "hide-field":
      core.fields_used = ["first_name"];
      return salinan;
    case "swap-host":
      core.target_host = "api.attacker.com";
      return salinan;
    case "repair-digest":
      core.purpose = "substituted_purpose";
      return salinan;
    default:
      return salinan;
  }
}

export function Verifier() {
  const [pengubahan, setPengubahan] = useState<Pengubahan["jenis"]>("original");
  const [teks, setTeks] = useState(() => JSON.stringify(SAMPLE_RECEIPT, null, 2));
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sedang, setSedang] = useState(false);

  const pilih = useCallback(async (jenis: Pengubahan["jenis"]) => {
    setPengubahan(jenis);
    const diubah = terapkan(SAMPLE_RECEIPT, jenis);

    // For the careful attack, the digest is recomputed so that it agrees with
    // the edited content. What still fails is the receipt identity, which derives
    // from the digest.
    if (jenis === "repair-digest") {
      const { digestOf } = await import("@/lib/receipt");
      diubah.digest_sha256 = await digestOf(diubah.core as Json);
    }
    setTeks(JSON.stringify(diubah, null, 2));
  }, []);

  useEffect(() => {
    let dibatalkan = false;
    setSedang(true);
    const jalan = async () => {
      try {
        const env = JSON.parse(teks) as Envelope;
        const h = await periksa(env);
        if (!dibatalkan) {
          setHasil(h);
          setGalat(null);
        }
      } catch (e) {
        if (!dibatalkan) {
          setHasil(null);
          setGalat((e as Error).message);
        }
      } finally {
        if (!dibatalkan) setSedang(false);
      }
    };
    const t = setTimeout(jalan, 120);
    return () => {
      dibatalkan = true;
      clearTimeout(t);
    };
  }, [teks]);

  const lencana = useMemo(() => {
    if (galat) return { teks: "Cannot parse JSON", warna: "text-pending", titik: "bg-pending" };
    if (!hasil) return { teks: "computing", warna: "text-faint", titik: "bg-faint" };
    return hasil.sah
      ? { teks: "Valid", warna: "text-verified", titik: "bg-verified" }
      : { teks: "Invalid", warna: "text-denied", titik: "bg-denied" };
  }, [hasil, galat]);

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${lencana.titik} ${sedang ? "animate-pulse" : ""}`}
          />
          <span className={`text-[14px] font-medium ${lencana.warna}`}>{lencana.teks}</span>
          <span className="text-[13px] text-faint">
            computed in your browser, with no network request
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
        {PILIHAN.map((p) => (
          <button
            key={p.nilai}
            type="button"
            onClick={() => void pilih(p.nilai)}
            title={p.catatan}
            aria-pressed={pengubahan === p.nilai}
            className={[
              "rounded-md border px-3 py-1.5 text-[13px] transition-all duration-150",
              pengubahan === p.nilai
                ? "border-seal bg-seal-wash text-seal"
                : "border-line text-muted hover:border-faint hover:text-ink",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <label
            htmlFor="receipt-json"
            className="block px-4 pt-3 font-mono text-[11px] uppercase tracking-wider text-faint"
          >
            receipt
          </label>
          <textarea
            id="receipt-json"
            spellCheck={false}
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            className="h-[420px] w-full resize-none bg-transparent px-4 py-3 font-mono text-[12.5px] leading-[1.65] text-ink outline-none"
          />
        </div>

        <div className="p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
            checks
          </p>

          <ul className="mt-3 space-y-2.5">
            {galat && (
              <li className="rounded-md border border-pending/40 bg-pending/5 px-3 py-2 text-[13.5px] text-pending">
                {galat}
              </li>
            )}
            {hasil?.temuan.map((t) => (
              <li key={t.label} className="flex gap-2.5">
                <span
                  aria-hidden
                  className={[
                    "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                    t.lolos ? "bg-verified" : "bg-denied",
                  ].join(" ")}
                />
                <span className="text-[13.5px] leading-relaxed">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-muted"> — {t.keterangan}</span>
                </span>
              </li>
            ))}
          </ul>

          {hasil && (
            <div className="mt-5 space-y-3 border-t border-line pt-4">
              <Baris label="digest computed" nilai={hasil.digestDihitung} />
              <Baris
                label="digest recorded"
                nilai={String((JSON.parse(teks) as Envelope).digest_sha256 ?? "absent")}
              />
            </div>
          )}

          {pengubahan === "repair-digest" && (
            <p className="mt-5 rounded-md border border-line bg-bg px-3 py-2.5 text-[13px] leading-relaxed text-muted">
              The digest has been recomputed to agree with the edited content, so
              the digest check passes. What still fails is the receipt identity,
              because it derives from the digest and cannot be repaired without
              becoming a different identity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 break-all font-mono text-[12px] leading-relaxed text-ink">
        {nilai}
      </p>
    </div>
  );
}
