/**
 * Step 10 — read the log the contract emitted.
 *
 * The host buffers `logging::info` lines per tenant-and-contract pair and serves
 * them through `contracts.logs`. This is the most direct diagnostic available when a
 * call fails without explanation.
 *
 * It appears on neither the Walkthrough nor the common-errors page, which is finding
 * T-07 — and it is precisely what you need when facing a failure that will not
 * explain itself. Its *empty* output is what cracked finding T-12: a contract that
 * logs nothing at all never started.
 */
import { CONTRACT_TAIL } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState } from "./state.js";

try {
  requireState("contractId", "npm run step:03");
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const hasil = await tenant.contracts.logs(CONTRACT_TAIL, { limit: 50 });
  console.log(JSON.stringify(hasil, null, 2));
} catch (e) {
  reportError(e);
}
