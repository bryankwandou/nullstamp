/**
 * Step 8 — verify a receipt.
 *
 * The contract recomputes the digest from the stored `core` layer and compares it
 * against the recorded one. Because the canonical form sorts keys ascending, the
 * same arithmetic can be repeated outside the node. `verify-offline.ts` does exactly
 * that, without touching the network at all.
 */
import { CONTRACT_TAIL, CONTRACT_VERSION } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { readState, requireState } from "./state.js";

try {
  const receiptId =
    process.argv[2] ?? requireState("lastReceiptId", "npm run step:07");
  console.log("checking:", receiptId);

  requireState("contractId", "npm run step:03");
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const hasil = await tenant.contracts.execute(CONTRACT_TAIL, {
    version: readState().contractVersion ?? CONTRACT_VERSION,
    functionName: "verify-receipt",
    input: { receipt_id: receiptId },
  });

  console.log(JSON.stringify(hasil, null, 2));

  const sah = (hasil as { valid?: boolean })?.valid;
  console.log(
    sah === true
      ? "\ndigest matches, receipt is valid"
      : "\ndigest tidak cocok; lihat kolom reason di atas",
  );
} catch (e) {
  reportError(e);
}
