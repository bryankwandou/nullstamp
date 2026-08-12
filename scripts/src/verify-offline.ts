/**
 * Pemeriksa receipt yang berjalan tanpa jaringan.
 *
 * Ini yang menopang klaim utama Nullstamp. Kalau sebuah bukti hanya bisa
 * diperiksa oleh pihak yang menerbitkannya, nilainya tidak lebih dari catatan
 * biasa. Karena itu digest dihitung atas bentuk kanonik: kunci objek tertata
 * menaik, tidak ada spasi, sehingga perhitungan yang sama bisa diulang siapa pun
 * dengan alat apa pun.
 *
 * Berkas ini sengaja tidak mengimpor SDK. Tidak ada sesi, tidak ada kunci, tidak
 * ada sambungan keluar.
 *
 * Pemakaian:
 *   npx tsx src/verify-offline.ts receipt.json
 *   cat receipt.json | npx tsx src/verify-offline.ts
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Susun bentuk kanonik yang sama dengan sisi Rust.
 *
 * `serde_json` memakai `BTreeMap` selama fitur `preserve_order` tidak
 * dinyalakan, jadi kunci objeknya keluar urut menaik. Fungsi ini menirunya:
 * kunci diurutkan menurut titik kode, larik dibiarkan pada urutan aslinya
 * karena urutan larik memang bermakna.
 */
export function canonical(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const kunci = Object.keys(value).sort();
  return (
    "{" +
    kunci
      .map((k) => JSON.stringify(k) + ":" + canonical(value[k] as Json))
      .join(",") +
    "}"
  );
}

export function digestOf(core: Json): string {
  return createHash("sha256").update(canonical(core), "utf8").digest("hex");
}

/** Identitas receipt diturunkan dari dua belas bita pertama digest-nya. */
export function receiptIdFrom(digestHex: string): string {
  return "rcpt_" + digestHex.slice(0, 24);
}

export interface Hasil {
  valid: boolean;
  alasan: string[];
  digestDihitung: string;
}

export function periksa(sampul: Record<string, Json>): Hasil {
  const alasan: string[] = [];

  const core = sampul.core;
  if (core === undefined || core === null) {
    return { valid: false, alasan: ["sampul tidak memuat core"], digestDihitung: "" };
  }

  const digestDihitung = digestOf(core);
  const tercatat = sampul.digest_sha256;

  if (typeof tercatat !== "string") {
    alasan.push("sampul tidak memuat digest_sha256");
  } else if (tercatat !== digestDihitung) {
    alasan.push(
      `digest tidak cocok: tercatat ${tercatat}, dihitung ulang ${digestDihitung}`,
    );
  }

  const id = sampul.receipt_id;
  if (typeof id === "string") {
    const seharusnya = receiptIdFrom(digestDihitung);
    if (id !== seharusnya) {
      alasan.push(
        `receipt_id tidak sesuai digest: tercatat ${id}, seharusnya ${seharusnya}`,
      );
    }
  }

  // Pemeriksaan disiplin isi: lapis core tidak boleh memuat marker yang belum
  // terselesaikan maupun nilai profil. Yang sah hanya nama field.
  const teksCore = JSON.stringify(core);
  if (teksCore.includes("{{")) {
    alasan.push("core memuat marker yang belum terselesaikan");
  }

  return { valid: alasan.length === 0, alasan, digestDihitung };
}

function bacaMasukan(): string {
  const berkas = process.argv[2];
  if (berkas) return readFileSync(berkas, "utf8");
  return readFileSync(0, "utf8");
}

const isi = bacaMasukan().trim();
if (isi.length === 0) {
  console.error("tidak ada masukan. Berikan nama berkas atau salurkan lewat stdin.");
  process.exit(2);
}

const sampul = JSON.parse(isi) as Record<string, Json>;
const hasil = periksa(sampul);

console.log("receipt_id      :", String(sampul.receipt_id ?? "(tidak ada)"));
console.log("digest tercatat :", String(sampul.digest_sha256 ?? "(tidak ada)"));
console.log("digest dihitung :", hasil.digestDihitung);
console.log(
  "tanda tangan    :",
  sampul.signature === null || sampul.signature === undefined
    ? `tidak ada — ${String(sampul.signing_error ?? "alasan tidak dicatat")}`
    : "ada",
);
console.log("");

if (hasil.valid) {
  console.log("HASIL: sah. Digest dihitung ulang di luar node dan cocok.");
  process.exit(0);
}

console.log("HASIL: tidak sah.");
for (const a of hasil.alasan) console.log("  -", a);
process.exit(1);
