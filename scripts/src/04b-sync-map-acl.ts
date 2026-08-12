/**
 * Step 4b — re-point map ACLs at the contract id currently in force.
 *
 * This has to run after every re-registration, because of a trap that appears in no
 * documentation page:
 *
 *   Each registration mints a NEW contract id. Map ACLs bind to that id, not to the
 *   contract name. So the moment a contract is re-registered, every map that
 *   allowed the old id starts refusing the new one.
 *
 * The symptom is obvious once you know and baffling before then:
 *   access denied: TenantContract(did:t3n:…/617) cannot read map "z:…:receipts"
 *
 * See finding T-13 in docs/BUGS.md. Credit where due: that error message is one of
 * the clearest in the whole platform — it names the principal, the id, the map, and
 * the operation. The problem is only that nothing warns you the coupling exists.
 */
import { MAP_RECEIPTS, MAP_SECRETS } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState } from "./state.js";

try {
  const contractId = requireState("contractId", "npm run step:03");

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`effective contract id : ${contractId}`);
  console.log("re-pointing map ACLs...\n");

  for (const tail of [MAP_SECRETS, MAP_RECEIPTS]) {
    await tenant.maps.update(tail, {
      visibility: "private",
      writers: { only: [contractId] },
      readers: { only: [contractId] },
    });

    const status = await tenant.maps.getStatus(tail);
    const nama = (status as { map?: string }).map ?? tail;
    const keadaan = (status as { status?: string }).status ?? "?";
    console.log(`  ${nama} -> ${keadaan}`);
    console.log(`    readers & writers now restricted to contract ${contractId}`);
  }

  console.log("\nACLs aligned. The contract can read and write its maps again.");
} catch (e) {
  reportError(e);
}
