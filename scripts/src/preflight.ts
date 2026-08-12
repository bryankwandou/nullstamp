/**
 * Pemeriksaan pendahuluan.
 *
 * Semua yang bisa diperiksa tanpa kunci pengembang diperiksa di sini: versi
 * perkakas, keberadaan berkas WASM, keterjangkauan node, dan keabsahan manifest
 * operator. Menjalankan ini lebih dulu memisahkan kegagalan lingkungan dari
 * kegagalan yang benar-benar berasal dari layanan.
 */
import { existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_ENVIRONMENT,
  NODE_URLS,
  fetchTrustedManifest,
  getNodeUrl,
  loadWasmComponent,
  setEnvironment,
} from "@terminal3/t3n-sdk";

import { ENV, TARGET_URL, UPSTREAM_HOST, WASM_PATH } from "./config.js";

const HERE = dirname(fileURLToPath(import.meta.url));
let gagal = 0;

function lolos(label: string, catatan: string) {
  console.log(`  [ok]    ${label} — ${catatan}`);
}
function tidak(label: string, catatan: string) {
  gagal += 1;
  console.log(`  [gagal] ${label} — ${catatan}`);
}

console.log("\nPEMERIKSAAN PENDAHULUAN NULLSTAMP\n");

console.log("Perkakas");
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) lolos("Node.js", `versi ${process.versions.node}`);
else tidak("Node.js", `versi ${process.versions.node}, butuh 20 atau lebih baru`);

console.log("\nBerkas contract");
const wasmFile = resolve(HERE, "..", WASM_PATH);
if (existsSync(wasmFile)) {
  const ukuran = statSync(wasmFile).size;
  lolos("WASM component", `${ukuran} bita di ${wasmFile}`);
} else {
  tidak(
    "WASM component",
    `belum ada di ${wasmFile}. Bangun dulu: cargo build --target wasm32-wasip2 --release`,
  );
}

console.log("\nLingkungan SDK");
lolos("lingkungan bawaan SDK", DEFAULT_ENVIRONMENT);
lolos("lingkungan terpilih", ENV);
setEnvironment(ENV);
const nodeUrl = getNodeUrl();
lolos("alamat node", nodeUrl);
if (NODE_URLS[ENV] !== nodeUrl) {
  tidak("kecocokan alamat", `NODE_URLS menyebut ${NODE_URLS[ENV]}`);
}

console.log("\nKeterjangkauan node");
try {
  const r = await fetch(nodeUrl + "/api/trust-manifest", {
    signal: AbortSignal.timeout(20_000),
  });
  if (r.ok) lolos("endpoint manifest", `HTTP ${r.status}`);
  else tidak("endpoint manifest", `HTTP ${r.status}`);
} catch (e) {
  tidak("endpoint manifest", (e as Error).message);
}

console.log("\nAttestation");
try {
  const anchor = await fetchTrustedManifest(ENV);
  const peers = anchor.expected_peer_ids?.length ?? 0;
  const rtmr = anchor.rtmr3_allowlist?.length ?? 0;
  if (peers > 0 && rtmr > 0) {
    lolos(
      "manifest operator",
      `tanda tangan sah, ${peers} peer, ${rtmr} pengukuran RTMR3`,
    );
    const src = anchor.source as Record<string, unknown> | undefined;
    if (src?.signed_at) lolos("waktu penandatanganan", String(src.signed_at));
  } else {
    tidak("manifest operator", "anchor kosong");
  }
} catch (e) {
  tidak("manifest operator", (e as Error).message);
}

console.log("\nKomponen kriptografi SDK");
try {
  await loadWasmComponent();
  lolos("loadWasmComponent", "komponen termuat");
} catch (e) {
  tidak("loadWasmComponent", (e as Error).message);
}

console.log("\nTujuan peragaan");
lolos("alamat tujuan", TARGET_URL);
lolos("host untuk grant", UPSTREAM_HOST);

console.log("\nKunci pengembang");
if (process.env.T3N_API_KEY) {
  lolos("T3N_API_KEY", "tersedia di lingkungan");
} else {
  console.log(
    "  [tunda] T3N_API_KEY — belum ada. Klaim di https://go.terminal3.io/adk-community",
  );
  console.log(
    "          Kunci hanya ditampilkan satu kali dan tidak bisa diambil ulang.",
  );
}

console.log(
  gagal === 0
    ? "\nSemua pemeriksaan yang tidak butuh kunci sudah lolos.\n"
    : `\n${gagal} pemeriksaan gagal. Perbaiki dulu sebelum menjalankan langkah berikutnya.\n`,
);
process.exit(gagal === 0 ? 0 : 1);
