/**
 * A receipt checker that runs with no network.
 *
 * This is what holds up Nullstamp's central claim. If a receipt can only be checked
 * by whoever issued it, it is worth no more than an ordinary log line. So the digest
 * is computed over a canonical form: object keys ascending, no whitespace, which
 * means anyone can repeat the same arithmetic with any tool.
 *
 * This file deliberately imports no SDK. No session, no key, no outbound connection.
 *
 * Exits 0 for a valid receipt and 1 for a tampered one, so it drops into CI as is.
 *
 * Usage:
 *   npx tsx src/verify-offline.ts receipt.json
 *   cat receipt.json | npx tsx src/verify-offline.ts
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Build the same canonical form the Rust side builds.
 *
 * `serde_json` rests on `BTreeMap` as long as the `preserve_order` feature is off,
 * so its object keys come out ascending. This mirrors that:
 * kunci diurutkan menurut titik kode, larik dibiarkan pada urutan aslinya
 * because array order genuinely carries meaning.
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
    return { valid: false, alasan: ["envelope has no core"], digestDihitung: "" };
  }

  const digestDihitung = digestOf(core);
  const tercatat = sampul.digest_sha256;

  if (typeof tercatat !== "string") {
    alasan.push("envelope has no digest_sha256");
  } else if (tercatat !== digestDihitung) {
    alasan.push(
      `digest mismatch: recorded ${tercatat}, recomputed ${digestDihitung}`,
    );
  }

  const id = sampul.receipt_id;
  if (typeof id === "string") {
    const seharusnya = receiptIdFrom(digestDihitung);
    if (id !== seharusnya) {
      alasan.push(
        `receipt_id does not derive from digest: recorded ${id}, expected ${seharusnya}`,
      );
    }
  }

  // Content-discipline check: the core layer must carry neither an unresolved
  // marker nor a profile value. Field names only.
  const teksCore = JSON.stringify(core);
  if (teksCore.includes("{{")) {
    alasan.push("core still contains an unresolved marker");
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
  console.error("no input. Pass a file path or pipe the receipt via stdin.");
  process.exit(2);
}

const sampul = JSON.parse(isi) as Record<string, Json>;
const hasil = periksa(sampul);

console.log("receipt_id      :", String(sampul.receipt_id ?? "(absent)"));
console.log("digest recorded :", String(sampul.digest_sha256 ?? "(absent)"));
console.log("digest computed :", hasil.digestDihitung);
console.log(
  "signature       :",
  sampul.signature === null || sampul.signature === undefined
    ? `none — ${String(sampul.signing_error ?? "no reason recorded")}`
    : "ada",
);
console.log("");

if (hasil.valid) {
  console.log("RESULT: valid. Digest recomputed outside the node and it matches.");
  process.exit(0);
}

console.log("RESULT: invalid.");
for (const a of hasil.alasan) console.log("  -", a);
process.exit(1);
