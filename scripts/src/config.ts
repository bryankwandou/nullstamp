/**
 * Pengaturan bersama untuk seluruh langkah.
 *
 * Kunci pengembang hanya dibaca dari lingkungan, tidak pernah dari argumen
 * baris perintah, supaya tidak tertinggal di riwayat shell.
 */
import "dotenv/config";
import type { Environment } from "@terminal3/t3n-sdk";

export const ENV: Environment =
  (process.env.T3N_ENV as Environment | undefined) ?? "testnet";

/** Nama pendek contract. Nama kanoniknya nanti `z:<tid>:nullstamp`. */
export const CONTRACT_TAIL = process.env.NULLSTAMP_TAIL ?? "nullstamp";

/**
 * Versi ini harus naik setiap kali WASM didaftarkan ulang. Node menolak
 * pendaftaran dengan versi yang tidak lebih tinggi dari yang tercatat.
 */
export const CONTRACT_VERSION = process.env.NULLSTAMP_VERSION ?? "0.1.0";

export const WASM_PATH =
  process.env.NULLSTAMP_WASM ??
  "../contract/z-tenant-nullstamp/target/wasm32-wasip2/release/z_tenant_nullstamp.wasm";

/** Nama map yang dipakai contract. Cukup bagian ekornya; SDK menambahkan prefiks. */
export const MAP_SECRETS = "secrets";
export const MAP_RECEIPTS = "receipts";

/**
 * Tujuan panggilan keluar untuk peragaan.
 *
 * Bawaannya sebuah layanan gema. Pilihan itu disengaja: karena gema memulangkan
 * badan permintaan apa adanya, hasilnya memperlihatkan langsung bahwa marker
 * `{{profile.<field>}}` benar-benar diselesaikan di sisi host, bukan dikirim
 * mentah. Tanpa gema, klaim itu hanya bisa dipercaya, tidak bisa dilihat.
 *
 * Perlu diingat bahwa peragaan ini mengirim isi profil uji ke pihak ketiga.
 * Yang dipakai di testnet adalah profil uji, bukan data orang sungguhan. Untuk
 * peragaan yang lebih dekat ke pemakaian nyata, arahkan ke API pemesanan
 * seperti `https://api.duffel.com/air/orders` beserta kredensialnya.
 */
export const TARGET_URL =
  process.env.NULLSTAMP_TARGET_URL ?? "https://postman-echo.com/post";

/**
 * Host yang harus disebut di grant pengguna. Diturunkan dari alamat tujuan
 * supaya keduanya tidak pernah berbeda. Host yang tidak disebut membuat
 * panggilan berhenti dengan `host/http.egress_denied`.
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
        "T3N_API_KEY belum diisi.",
        "",
        "Kunci ini didapat dari halaman klaim dan hanya ditampilkan satu kali:",
        "  https://go.terminal3.io/adk-community",
        "",
        "Setelah dapat, salin ke berkas .env pada folder scripts:",
        "  T3N_API_KEY=0x...",
      ].join("\n"),
    );
  }
  return key.trim();
}

/**
 * Menandai bahwa verifikasi attestation sengaja dilewati. Hanya dipakai bila
 * manifest operator memang belum tersedia untuk lingkungan yang dituju.
 * Dibuat eksplisit supaya pilihan itu bisa ditemukan lewat pencarian teks.
 */
export const ALLOW_UNSAFE_TRUST =
  process.env.T3N_UNSAFE_TRUST_SERVER === "1";
