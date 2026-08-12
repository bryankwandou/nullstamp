/**
 * Step 2 — make sure the tenant is admitted.
 *
 * The order here is the reverse of what looks natural, and that is deliberate: read
 * the state with `tenant.me()` first, and only call `tenant.claim()` if the tenant
 * is not already admitted.
 *
 * The reason is not style. The SSO claim page has already created the tenant row
 * and credited the account, and `tenant.claim()` against an already-active tenant
 * answers "Internal error" HTTP 500 rather than the `already-admitted` its response
 * shape implies. Tried twice, two different request_ids, same outcome. See finding
 * T-11 in docs/BUGS.md.
 *
 * So calling claim without checking first halts the script on a step that was
 * already finished.
 */
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

try {
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`tenant DID : ${s.tenantDid}`);

  console.log("\nreading tenant state first...");
  const sebelum = await tenant.tenant.me();
  const status = (sebelum as { status?: string }).status;
  const label = (sebelum as { label?: string }).label;
  console.log(`  status : ${status ?? "unknown"}`);
  console.log(`  label  : ${label ?? "unknown"}`);

  let klaim: unknown = null;

  if (status === "active") {
    console.log(
      "\ntenant already active — the SSO claim page had already done it.\n" +
        "re-claim skipped, because tenant.claim() on an active tenant answers 500.",
    );
    klaim = { skipped: "tenant already active", source: "SSO claim page" };
  } else {
    console.log("\ntenant not active yet, submitting a claim...");
    klaim = await tenant.tenant.claim();
    console.log("claim response:", JSON.stringify(klaim, null, 2));
  }

  const saldo = await s.t3n.getBalance();
  console.log("\ncredit balance:");
  console.log(`  available : ${(saldo as { available?: number }).available ?? "?"}`);
  console.log(`  reserved  : ${(saldo as { reserved?: number }).reserved ?? "?"}`);

  const kuota = (sebelum as { quotas?: Record<string, number> }).quotas ?? {};
  console.log("\nquotas that bound the work ahead:");
  for (const k of [
    "max_contracts",
    "max_maps",
    "max_wasm_bytes",
    "outbox_calls_per_minute_max",
    "fuel_per_call_max",
  ]) {
    if (kuota[k] !== undefined) console.log(`  ${k.padEnd(28)}: ${kuota[k]}`);
  }

  writeState({ tenantDid: s.tenantDid, tenantClaim: klaim });
  console.log("\ntenant ready. state saved to state.json");
} catch (e) {
  reportError(e);
}
