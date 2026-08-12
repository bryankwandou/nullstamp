/**
 * Pemeriksaan receipt di sisi peramban.
 *
 * Aturan bentuk kanoniknya sama dengan sisi contract: kunci objek urut menaik,
 * tanpa spasi. Di Rust sifat itu datang dari `serde_json` yang bersandar pada
 * `BTreeMap`; di sini ditulis ulang.
 *
 * Perhitungan dilakukan memakai Web Crypto, jadi tidak ada permintaan jaringan.
 * Halaman ini memeriksa bukti tanpa perlu mempercayai penerbitnya, dan itu
 * memang inti gagasannya.
 */

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export interface Envelope {
  receipt_id?: string;
  digest_sha256?: string;
  core?: Json;
  signature?: Json;
  signing_error?: string | null;
  extracted?: Json;
}

/** Susun bentuk kanonik. Urutan larik dibiarkan, karena urutan larik bermakna. */
export function canonical(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(value[k] as Json))
      .join(",") +
    "}"
  );
}

export async function sha256Hex(teks: string): Promise<string> {
  const bytes = new TextEncoder().encode(teks);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function digestOf(core: Json): Promise<string> {
  return sha256Hex(canonical(core));
}

/** Identitas receipt diturunkan dari dua belas bita pertama digest-nya. */
export function receiptIdFrom(digestHex: string): string {
  return "rcpt_" + digestHex.slice(0, 24);
}

export interface Temuan {
  label: string;
  lolos: boolean;
  keterangan: string;
}

export interface Hasil {
  sah: boolean;
  digestDihitung: string;
  temuan: Temuan[];
}

export async function periksa(env: Envelope): Promise<Hasil> {
  const temuan: Temuan[] = [];

  if (env.core === undefined || env.core === null) {
    return {
      sah: false,
      digestDihitung: "",
      temuan: [
        { label: "Lapis core", lolos: false, keterangan: "sampul tidak memuat core" },
      ],
    };
  }
  temuan.push({ label: "Lapis core", lolos: true, keterangan: "ada" });

  const dihitung = await digestOf(env.core);

  const tercatat = env.digest_sha256;
  if (typeof tercatat !== "string") {
    temuan.push({
      label: "Digest tercatat",
      lolos: false,
      keterangan: "sampul tidak memuat digest_sha256",
    });
  } else if (tercatat === dihitung) {
    temuan.push({
      label: "Digest",
      lolos: true,
      keterangan: "dihitung ulang di peramban dan cocok",
    });
  } else {
    temuan.push({
      label: "Digest",
      lolos: false,
      keterangan: `tidak cocok — tercatat ${tercatat.slice(0, 16)}…, dihitung ${dihitung.slice(0, 16)}…`,
    });
  }

  if (typeof env.receipt_id === "string") {
    const seharusnya = receiptIdFrom(dihitung);
    temuan.push(
      env.receipt_id === seharusnya
        ? { label: "Identitas", lolos: true, keterangan: "turun dari digest" }
        : {
            label: "Identitas",
            lolos: false,
            keterangan: `tidak sesuai digest — seharusnya ${seharusnya}`,
          },
    );
  }

  // Disiplin isi: lapis core tidak boleh memuat marker yang belum terselesaikan.
  const teksCore = JSON.stringify(env.core);
  temuan.push(
    teksCore.includes("{{")
      ? {
          label: "Disiplin isi",
          lolos: false,
          keterangan: "core memuat marker yang belum terselesaikan",
        }
      : {
          label: "Disiplin isi",
          lolos: true,
          keterangan: "hanya nama field, tanpa nilai",
        },
  );

  return { sah: temuan.every((t) => t.lolos), digestDihitung: dihitung, temuan };
}

/** Receipt contoh, keluaran nyata dari `cargo run --example sample_receipt`. */
export const RECEIPT_CONTOH: Envelope = {
  core: {
    contract_id: 41,
    contract_version: "0.1.0",
    extracted_pointers: ["/json/keperluan"],
    fields_used: ["first_name", "last_name"],
    issued_at_secs: 1786457685,
    method: "POST",
    purpose: "peragaan_penerbitan_bukti",
    request_body_sha256:
      "7d3a1f0c9b8e6d5a4c3b2a1908f7e6d5c4b3a2910f8e7d6c5b4a39281706f5e4d",
    response_body_sha256:
      "1a2b3c4d5e6f70819293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f7081",
    response_code: 200,
    schema: "nullstamp.receipt.v1",
    seq_no: 10482,
    subject_did: "3c5d7e9f001122334455667788990aabbccddeef",
    target_host: "postman-echo.com",
    target_url: "https://postman-echo.com/post",
    tenant_did: "9f2a4c7b1e5d8a3f6b0c2d4e6f8a1b3c5d7e9f00",
  },
  digest_sha256: "c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945",
  receipt_id: "rcpt_c212bc7936f8120043cdc617",
  signature: null,
  signing_error: "capability signing tidak diberikan pada contract ini",
};
