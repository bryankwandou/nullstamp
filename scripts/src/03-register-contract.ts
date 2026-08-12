/**
 * Langkah 3 — daftarkan WASM component.
 *
 * Pendaftaran dilakukan lebih dulu daripada pembuatan map, bukan sebaliknya.
 * Alasannya: daftar pembaca dan penulis map disebut memakai nomor contract, dan
 * nomor itu baru ada setelah pendaftaran selesai. Urutan pada halaman
 * Walkthrough tidak menyebut ketergantungan ini.
 *
 * Bila nama dan versi yang sama didaftarkan dua kali, node menolak dengan
 * "version <x> is not higher than current version <y>". Naikkan
 * NULLSTAMP_VERSION di .env, lalu ulangi.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { CONTRACT_TAIL, CONTRACT_VERSION, WASM_PATH } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

const HERE = dirname(fileURLToPath(import.meta.url));

try {
  const wasmFile = resolve(HERE, "..", WASM_PATH);
  const wasm = readFileSync(wasmFile);
  console.log(`berkas WASM : ${wasmFile}`);
  console.log(`ukuran      : ${wasm.byteLength} bita`);

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`mendaftarkan ${CONTRACT_TAIL} versi ${CONTRACT_VERSION}...`);
  const hasil = await tenant.contracts.register({
    tail: CONTRACT_TAIL,
    version: CONTRACT_VERSION,
    wasm: new Uint8Array(wasm),
  });

  console.log("nama kanonik :", hasil.name);
  console.log("nomor contract:", hasil.contract_id);

  writeState({
    contractName: hasil.name,
    contractId: hasil.contract_id,
    contractVersion: CONTRACT_VERSION,
  });

  console.log("\nnomor contract tersimpan; dipakai langkah pembuatan map");
} catch (e) {
  reportError(e);
}
