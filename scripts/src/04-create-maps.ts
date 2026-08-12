/**
 * Step 4 — create the KV maps the contract uses.
 *
 * Two maps are needed. `secrets` holds the upstream credential; `receipts` holds
 * the issued receipts.
 *
 * Two things make this step fail easily:
 *
 * - `readers` must be stated. The KV governor denies by default, so leaving it out
 *   produces a map the contract cannot read even though it owns it.
 * - The wire form only accepts lower case, i.e. `"all"` or `{ only: [id] }`.
 *   Capitalised forms are rejected.
 *
 * Re-running this step is safe: "map already exists" is idempotent and treated as
 * success. After any re-registration of the contract, run step 04b as well.
 */
import { MAP_RECEIPTS, MAP_SECRETS } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState, writeState } from "./state.js";

function sudahAda(e: unknown): boolean {
  const m = (e as { message?: string })?.message ?? "";
  return m.toLowerCase().includes("already exists");
}

try {
  const contractId = requireState("contractId", "npm run step:03");

  const s = await openUserSession();
  const tenant = openTenantClient(s);
  const dibuat: string[] = [];

  for (const tail of [MAP_SECRETS, MAP_RECEIPTS]) {
    const nama = tenant.canonicalName(tail);
    try {
      await tenant.maps.create({
        tail,
        visibility: "private",
        writers: { only: [contractId] },
        readers: { only: [contractId] },
      });
      console.log(`created : ${nama}`);
      dibuat.push(nama);
    } catch (e) {
      if (sudahAda(e)) {
        console.log(`sudah ada: ${nama}`);
        dibuat.push(nama);
      } else {
        throw e;
      }
    }

    const status = await tenant.maps.getStatus(tail);
    console.log(`status  : ${nama} -> ${status}`);
  }

  writeState({ mapsCreated: dibuat });
} catch (e) {
  reportError(e);
}
