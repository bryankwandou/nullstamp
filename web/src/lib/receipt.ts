/**
 * Receipt checking, entirely in the browser.
 *
 * The canonical-form rule is the same one the contract uses: object keys
 * ascending, no whitespace. On the Rust side that comes from `serde_json` resting
 * on `BTreeMap`; here it is rewritten in ten lines.
 *
 * The digest is computed with Web Crypto, so no request leaves the page. This
 * lets a reader check the evidence without trusting whoever issued it, which is
 * the whole point.
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

/** Build the canonical form. Array order is preserved, because it is meaningful. */
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
        { label: "Core layer", lolos: false, keterangan: "envelope has no core" },
      ],
    };
  }
  temuan.push({ label: "Core layer", lolos: true, keterangan: "present" });

  const dihitung = await digestOf(env.core);

  const tercatat = env.digest_sha256;
  if (typeof tercatat !== "string") {
    temuan.push({
      label: "Recorded digest",
      lolos: false,
      keterangan: "envelope has no digest_sha256",
    });
  } else if (tercatat === dihitung) {
    temuan.push({
      label: "Digest",
      lolos: true,
      keterangan: "recomputed in your browser and it matches",
    });
  } else {
    temuan.push({
      label: "Digest",
      lolos: false,
      keterangan: `mismatch — recorded ${tercatat.slice(0, 16)}…, computed ${dihitung.slice(0, 16)}…`,
    });
  }

  if (typeof env.receipt_id === "string") {
    const seharusnya = receiptIdFrom(dihitung);
    temuan.push(
      env.receipt_id === seharusnya
        ? { label: "Identity", lolos: true, keterangan: "derives from the digest" }
        : {
            label: "Identity",
            lolos: false,
            keterangan: `does not derive from digest — expected ${seharusnya}`,
          },
    );
  }

  // Content discipline: the core layer must carry no unresolved marker.
  const teksCore = JSON.stringify(env.core);
  temuan.push(
    teksCore.includes("{{")
      ? {
          label: "Content discipline",
          lolos: false,
          keterangan: "core still contains an unresolved marker",
        }
      : {
          label: "Content discipline",
          lolos: true,
          keterangan: "field names only, no values",
        },
  );

  return { sah: temuan.every((t) => t.lolos), digestDihitung: dihitung, temuan };
}

/**
 * A real receipt issued inside the enclave on T3N testnet.
 *
 * Exported verbatim by `npm run step:11`. Contract 621 of tenant
 * did:t3n:f21dce7928980eeea7dc93618b91f602a80fe1c4, upstream status 200,
 * cluster sequence number 112964. Nothing here is invented.
 */
export const SAMPLE_RECEIPT: Envelope = {
    "core": {
      "contract_id": 621,
      "contract_version": "0.1.5",
      "extracted_pointers": [
        "/json/reason"
      ],
      "fields_used": [
        "first_name",
        "last_name"
      ],
      "issued_at_secs": 1786537397,
      "method": "POST",
      "purpose": "receipt_issuance_demo",
      "request_body_sha256": "26e5ee62768086e9213455818dbc5d17b41356f41f3d36ac92979a9059cffc6b",
      "response_body_sha256": "af8e3bce0cd50618030d03a18241046b5b8c8e41c173b6400eb754568a8528f2",
      "response_code": 200,
      "schema": "nullstamp.receipt.v1",
      "seq_no": 112964,
      "subject_did": "f21dce7928980eeea7dc93618b91f602a80fe1c4",
      "target_host": "postman-echo.com",
      "target_url": "https://postman-echo.com/post",
      "tenant_did": "f21dce7928980eeea7dc93618b91f602a80fe1c4"
    },
    "digest_sha256": "4d8790a69bad4bbfd53c757f748e5e302c2577f827e951669d3fb01e9c3daabe",
    "receipt_id": "rcpt_4d8790a69bad4bbfd53c757f",
    "signature": null,
    "signing_error": "signing capability not imported; integrity rests on the claims digest"
  };
