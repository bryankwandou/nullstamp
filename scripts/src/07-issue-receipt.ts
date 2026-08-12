/**
 * Step 7 — issue a receipt.
 *
 * This is the point that proves the whole chain works. The request body carries
 * markers, not values. If the echo response comes back with values filled in, the
 * host substituted them inside the enclave, because the contract never held them.
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

  console.log("target        :", TARGET_URL);
  console.log("declared      :", DEMO_FIELDS.join(", "));
  console.log("body sent     :", JSON.stringify(input.body_template));
  console.log("\ncalling issue-receipt...\n");

  const hasil = await tenant.contracts.execute(CONTRACT_TAIL, {
    version: CONTRACT_VERSION,
    functionName: "issue-receipt",
    input,
  });

  console.log(JSON.stringify(hasil, null, 2));

  const receiptId = (hasil as { receipt_id?: string })?.receipt_id;
  if (receiptId) {
    writeState({ lastReceiptId: receiptId });
    console.log(`\nreceipt stored: ${receiptId}`);
  } else {
    console.log(
      "\ncatatan: jawaban tidak memuat receipt_id di aras teratas; periksa bentuk sampulnya",
    );
  }
} catch (e) {
  reportError(e);
}
