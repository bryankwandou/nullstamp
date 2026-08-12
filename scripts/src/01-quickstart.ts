/**
 * Step 1 — Quickstart.
 *
 * One goal: an authenticated session with the tenant DID printed. This is the part
 * the brief asks to complete and screenshot.
 *
 * The client configuration here differs from the published sample, and it has to:
 * `trustAnchor` is required and throws in the constructor, and the handshake needs
 * the full handler set. See findings T-01 and T-02 in docs/BUGS.md.
 */
import { ENV } from "./config.js";
import { openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

try {
  console.log(`environment: ${ENV}`);
  const s = await openUserSession();

  console.log(`node       : ${s.nodeUrl}`);
  console.log(`eth address: ${s.ethAddress}`);
  console.log(`tenant DID : ${s.tenantDid}`);

  writeState({
    environment: ENV,
    nodeUrl: s.nodeUrl,
    ethAddress: s.ethAddress,
    tenantDid: s.tenantDid,
  });

  console.log("\nsession open. DID saved to state.json");
} catch (e) {
  reportError(e);
}
