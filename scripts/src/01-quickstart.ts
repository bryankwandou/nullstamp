/**
 * Langkah 1 — Quickstart.
 *
 * Sasarannya satu: sesi terautentikasi dan DID tenant tercetak. Ini bagian yang
 * diminta brief untuk diselesaikan lalu difoto.
 */
import { ENV } from "./config.js";
import { openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

try {
  console.log(`lingkungan: ${ENV}`);
  const s = await openUserSession();

  console.log(`node       : ${s.nodeUrl}`);
  console.log(`alamat eth : ${s.ethAddress}`);
  console.log(`DID tenant : ${s.tenantDid}`);

  writeState({
    environment: ENV,
    nodeUrl: s.nodeUrl,
    ethAddress: s.ethAddress,
    tenantDid: s.tenantDid,
  });

  console.log("\nsesi terbuka. DID tersimpan di state.json");
} catch (e) {
  reportError(e);
}
