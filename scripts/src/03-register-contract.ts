/**
 * Step 3 — register the WASM component.
 *
 * Registration comes before map creation, not after. The reason: a map's reader and
 * writer sets are expressed as contract ids, and the id only exists once
 * registration has completed. The Walkthrough's ordering does not mention this
 * dependency — see finding T-05 in docs/BUGS.md.
 *
 * Registering the same name and version twice is refused with
 * "version <x> is not higher than current version <y>". Raise NULLSTAMP_VERSION in
 * .env and try again. Note the version lives in three places — Cargo.toml,
 * world.wit, and CONTRACT_VERSION — with no single source of truth, which is
 * finding T-10 and a mistake worth watching for.
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
  console.log(`wasm file   : ${wasmFile}`);
  console.log(`size        : ${wasm.byteLength} bytes`);

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`registering ${CONTRACT_TAIL} version ${CONTRACT_VERSION}...`);
  const hasil = await tenant.contracts.register({
    tail: CONTRACT_TAIL,
    version: CONTRACT_VERSION,
    wasm: new Uint8Array(wasm),
  });

  console.log("canonical name:", hasil.name);
  console.log("contract id   :", hasil.contract_id);

  writeState({
    contractName: hasil.name,
    contractId: hasil.contract_id,
    contractVersion: CONTRACT_VERSION,
  });

  console.log("\ncontract id saved; the map step uses it");
} catch (e) {
  reportError(e);
}
