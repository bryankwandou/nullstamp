/**
 * Settings shared by every step.
 *
 * The developer key is read only from the environment, never from a command-line
 * argument, so it cannot be left behind in shell history.
 */
import "dotenv/config";
import type { Environment } from "@terminal3/t3n-sdk";

export const ENV: Environment =
  (process.env.T3N_ENV as Environment | undefined) ?? "testnet";

/** The contract's short name. Its canonical name becomes `z:<tid>:nullstamp`. */
export const CONTRACT_TAIL = process.env.NULLSTAMP_TAIL ?? "nullstamp";

/**
 * Versi ini harus naik setiap kali WASM didaftarkan ulang. Node menolak
 * a registration whose version is not higher than the one on record.
 */
export const CONTRACT_VERSION = process.env.NULLSTAMP_VERSION ?? "0.1.0";

export const WASM_PATH =
  process.env.NULLSTAMP_WASM ??
  "../contract/z-tenant-nullstamp/target/wasm32-wasip2/release/z_tenant_nullstamp.wasm";

/** Nama map yang dipakai contract. Cukup bagian ekornya; SDK menambahkan prefiks. */
export const MAP_SECRETS = "secrets";
export const MAP_RECEIPTS = "receipts";

/**
 * Destination of the demo outbound call.
 *
 * The default is an echo service, and that is deliberate: because an echo returns
 * badan permintaan apa adanya, hasilnya memperlihatkan langsung bahwa marker
 * `{{profile.<field>}}` benar-benar diselesaikan di sisi host, bukan dikirim
 * raw. Without an echo the claim could only be believed, not seen.
 *
 * Perlu diingat bahwa peragaan ini mengirim isi profil uji ke pihak ketiga.
 * What testnet uses is a test profile, not a real person's data. For a demo
 * closer to real use, point this at a booking API
 * seperti `https://api.duffel.com/air/orders` beserta kredensialnya.
 */
export const TARGET_URL =
  process.env.NULLSTAMP_TARGET_URL ?? "https://postman-echo.com/post";

/**
 * The host that must appear on the user grant. Derived from the target URL
 * so the two can never disagree. A host that is not named makes the
 * call stop with `host/http.egress_denied`.
 */
export const UPSTREAM_HOST =
  process.env.NULLSTAMP_UPSTREAM_HOST ?? new URL(TARGET_URL).hostname;

/** Field profil yang dirujuk peragaan. Harus sama dengan isi badan permintaan. */
export const DEMO_FIELDS = (
  process.env.NULLSTAMP_FIELDS ?? "first_name,last_name"
)
  .split(",")
  .map((f) => f.trim())
  .filter((f) => f.length > 0);

export function requireApiKey(): string {
  const key = process.env.T3N_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      [
        "T3N_API_KEY is not set.",
        "",
        "The key comes from the claim page and is shown only once:",
        "  https://go.terminal3.io/adk-community",
        "",
        "Once you have it, copy it into scripts/.env:",
        "  T3N_API_KEY=0x...",
      ].join("\n"),
    );
  }
  return key.trim();
}

/**
 * Marks attestation verification as deliberately skipped. Only for use when
 * the operator manifest genuinely is not yet available for the target environment.
 * Made explicit so the choice is findable by text search.
 */
export const ALLOW_UNSAFE_TRUST =
  process.env.T3N_UNSAFE_TRUST_SERVER === "1";
