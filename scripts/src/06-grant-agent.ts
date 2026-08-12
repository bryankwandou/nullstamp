/**
 * Langkah 6 — pasang grant otorisasi.
 *
 * Ini titik yang paling sering membuat contract yang sudah benar tetap tidak
 * bisa menjangkau API tujuan. Contract tidak berwenang mengizinkan lalu lintas
 * keluarnya sendiri; yang berwenang adalah pemilik data. Host tujuan yang tidak
 * disebut di sini akan ditolak dengan `host/http.egress_denied`.
 *
 * Karena pengujian ini dijalankan atas nama diri sendiri, DID agent diisi DID
 * tenant. Bentuk itu yang dipakai untuk pemanggilan langsung.
 */
import { CONTRACT_TAIL, UPSTREAM_HOST } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

const FUNGSI = ["issue-receipt", "verify-receipt", "list-receipts"];

try {
  const s = await openUserSession();
  const tenant = openTenantClient(s);
  const scriptName = tenant.canonicalName(CONTRACT_TAIL);

  console.log(`contract     : ${scriptName}`);
  console.log(`fungsi       : ${FUNGSI.join(", ")}`);
  console.log(`host diizinkan: ${UPSTREAM_HOST}`);

  await s.t3n.agentAuthUpdate({
    agents: [
      {
        agentDid: s.tenantDid,
        scripts: [
          {
            scriptName,
            versionReq: null,
            functions: FUNGSI,
            allowedHosts: [UPSTREAM_HOST],
          },
        ],
      },
    ],
  });

  const terpasang = await s.t3n.getAgentAuth();
  console.log("\ngrant terbaca:", JSON.stringify(terpasang, null, 2));

  writeState({ grantedHosts: [UPSTREAM_HOST] });
} catch (e) {
  reportError(e);
}
