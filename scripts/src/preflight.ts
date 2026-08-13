/**
 * Preflight checks.
 *
 * Everything checkable without a developer key is checked here: tool versions, the
 * WASM file, node reachability, and the operator manifest signature. Running this
 * first separates environment failures from failures that genuinely come from the
 * service.
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

console.log("\nContract artefact");
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

console.log("\nSDK environment");
lolos("SDK default environment", DEFAULT_ENVIRONMENT);
lolos("selected environment", ENV);
setEnvironment(ENV);
const nodeUrl = getNodeUrl();
lolos("node address", nodeUrl);
if (NODE_URLS[ENV] !== nodeUrl) {
  tidak("address agreement", `NODE_URLS menyebut ${NODE_URLS[ENV]}`);
}

console.log("\nNode reachability");
try {
  const r = await fetch(nodeUrl + "/api/trust-manifest", {
    signal: AbortSignal.timeout(20_000),
  });
  if (r.ok) lolos("manifest endpoint", `HTTP ${r.status}`);
  else tidak("manifest endpoint", `HTTP ${r.status}`);
} catch (e) {
  tidak("manifest endpoint", (e as Error).message);
}

console.log("\nAttestation");
try {
  const anchor = await fetchTrustedManifest(ENV);
  const peers = anchor.expected_peer_ids?.length ?? 0;
  const rtmr = anchor.rtmr3_allowlist?.length ?? 0;
  if (peers > 0 && rtmr > 0) {
    lolos(
      "operator manifest",
      `signature valid, ${peers} peers, ${rtmr} RTMR3 measurement(s)`,
    );
    const src = anchor.source as Record<string, unknown> | undefined;
    if (src?.signed_at) lolos("signing time", String(src.signed_at));
  } else {
    tidak("operator manifest", "anchor kosong");
  }
} catch (e) {
  tidak("operator manifest", (e as Error).message);
}

console.log("\nSDK crypto component");
try {
  await loadWasmComponent();
  lolos("loadWasmComponent", "component loaded");
} catch (e) {
  tidak("loadWasmComponent", (e as Error).message);
}

console.log("\nDemo destination");
lolos("target URL", TARGET_URL);
lolos("host for the grant", UPSTREAM_HOST);

console.log("\nDeveloper key");
if (process.env.T3N_API_KEY) {
  lolos("T3N_API_KEY", "present in the environment");
} else {
  console.log(
    "  [tunda] T3N_API_KEY — belum ada. Klaim di https://go.terminal3.io/adk-community",
  );
  console.log(
    "          The key is shown once and cannot be retrieved again.",
  );
}

console.log(
  gagal === 0
    ? "\nEvery check that does not require a key has passed.\n"
    : `\n${gagal} pemeriksaan gagal. Perbaiki dulu sebelum menjalankan langkah berikutnya.\n`,
);
process.exit(gagal === 0 ? 0 : 1);
