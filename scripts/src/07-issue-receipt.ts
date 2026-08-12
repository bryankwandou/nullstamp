/**
 * Langkah 7 — terbitkan receipt.
 *
 * Inilah titik yang membuktikan seluruh rangkaian bekerja. Badan permintaan
 * hanya memuat marker, bukan nilai. Bila tanggapan gema memulangkan nilai yang
 * sudah terisi, artinya host yang menyelesaikannya di dalam enclave, sebab
 * contract tidak pernah memegang nilai itu.
 */
import {
  CONTRACT_TAIL,
  CONTRACT_VERSION,
  DEMO_FIELDS,
  TARGET_URL,
} from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState, writeState } from "./state.js";

/** Susun badan permintaan yang setiap nilainya berupa marker profil. */
function badanPermintaan(fields: string[]): Record<string, string> {
  const body: Record<string, string> = { reason: "nullstamp_demo" };
  for (const f of fields) body[f] = `{{profile.${f}}}`;
  return body;
}

const SECRET_KEY = process.env.NULLSTAMP_SECRET_KEY ?? "upstream_api_key";
const PAKAI_SECRET = process.env.NULLSTAMP_USE_SECRET === "1";

try {
  requireState("contractId", "npm run step:03");
  requireState("grantedHosts", "npm run step:06");

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const input: Record<string, unknown> = {
    purpose: "receipt_issuance_demo",
    method: "POST",
    url: TARGET_URL,
    declared_fields: DEMO_FIELDS,
    body_template: badanPermintaan(DEMO_FIELDS),
    extract: ["/json/reason"],
  };
  if (PAKAI_SECRET) input.secret_key = SECRET_KEY;

  console.log("tujuan        :", TARGET_URL);
  console.log("field diakui  :", DEMO_FIELDS.join(", "));
  console.log("badan dikirim :", JSON.stringify(input.body_template));
  console.log("\nmemanggil issue-receipt...\n");

  const hasil = await tenant.contracts.execute(CONTRACT_TAIL, {
    version: CONTRACT_VERSION,
    functionName: "issue-receipt",
    input,
  });

  console.log(JSON.stringify(hasil, null, 2));

  const receiptId = (hasil as { receipt_id?: string })?.receipt_id;
  if (receiptId) {
    writeState({ lastReceiptId: receiptId });
    console.log(`\nreceipt tersimpan: ${receiptId}`);
  } else {
    console.log(
      "\ncatatan: jawaban tidak memuat receipt_id di aras teratas; periksa bentuk sampulnya",
    );
  }
} catch (e) {
  reportError(e);
}
