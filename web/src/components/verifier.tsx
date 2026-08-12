"use client";

/**
 * Verifier receipt yang berjalan sepenuhnya di peramban.
 *
 * Tombol pengubahan disediakan bukan sebagai hiasan, melainkan karena satu-satunya
 * cara meyakinkan orang bahwa pemeriksaan ini nyata adalah membiarkan mereka
 * merusaknya sendiri lalu melihat pemeriksaannya menolak.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RECEIPT_CONTOH,
  periksa,
  type Envelope,
  type Hasil,
  type Json,
} from "@/lib/receipt";

type Pengubahan =
  | { jenis: "asli" }
  | { jenis: "sembunyikan-field" }
  | { jenis: "tukar-host" }
  | { jenis: "perbaiki-digest" };

const PILIHAN: Array<{ nilai: Pengubahan["jenis"]; label: string; catatan: string }> = [
  { nilai: "asli", label: "Receipt asli", catatan: "keluaran apa adanya dari contract" },
  {
    nilai: "sembunyikan-field",
    label: "Sembunyikan satu field",
    catatan: "mengaku memakai lebih sedikit data daripada kenyataannya",
  },
  {
    nilai: "tukar-host",
    label: "Tukar host tujuan",
    catatan: "mengubah ke mana data dikirim",
  },
  {
    nilai: "perbaiki-digest",
    label: "Ubah isi, lalu perbaiki digest",
    catatan: "percobaan paling teliti: digest dibuat konsisten kembali",
  },
];

function terapkan(env: Envelope, p: Pengubahan["jenis"]): Envelope {
  const salinan = JSON.parse(JSON.stringify(env)) as Envelope;
  const core = salinan.core as Record<string, Json>;

  switch (p) {
    case "sembunyikan-field":
      core.fields_used = ["first_name"];
      return salinan;
    case "tukar-host":
      core.target_host = "api.penyerang.com";
      return salinan;
    case "perbaiki-digest":
      core.purpose = "tujuan_yang_diganti";
      return salinan;
    default:
      return salinan;
  }
}

export function Verifier() {
  const [pengubahan, setPengubahan] = useState<Pengubahan["jenis"]>("asli");
  const [teks, setTeks] = useState(() => JSON.stringify(RECEIPT_CONTOH, null, 2));
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sedang, setSedang] = useState(false);

  const pilih = useCallback(async (jenis: Pengubahan["jenis"]) => {
    setPengubahan(jenis);
    const diubah = terapkan(RECEIPT_CONTOH, jenis);

    // Untuk percobaan yang paling teliti, digest ikut dihitung ulang supaya
    // konsisten dengan isi yang sudah diganti. Yang menggagalkannya adalah
    // identitas receipt, yang diturunkan dari digest.
    if (jenis === "perbaiki-digest") {
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
    if (galat) return { teks: "JSON tidak terbaca", warna: "text-pending", titik: "bg-pending" };
    if (!hasil) return { teks: "menghitung", warna: "text-faint", titik: "bg-faint" };
    return hasil.sah
      ? { teks: "Sah", warna: "text-verified", titik: "bg-verified" }
      : { teks: "Tidak sah", warna: "text-denied", titik: "bg-denied" };
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
            dihitung di peramban, tanpa permintaan jaringan
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
            pemeriksaan
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
              <Baris label="digest dihitung" nilai={hasil.digestDihitung} />
              <Baris
                label="digest tercatat"
                nilai={String((JSON.parse(teks) as Envelope).digest_sha256 ?? "tidak ada")}
              />
            </div>
          )}

          {pengubahan === "perbaiki-digest" && (
            <p className="mt-5 rounded-md border border-line bg-bg px-3 py-2.5 text-[13px] leading-relaxed text-muted">
              Digest sudah dibuat konsisten dengan isi yang diganti, jadi
              pemeriksaan digest lolos. Yang menggagalkannya adalah identitas
              receipt, sebab identitas itu diturunkan dari digest dan tidak bisa
              ikut diperbaiki tanpa mengubah dirinya sendiri.
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
