/**
 * Step 9 — read the receipt trail.
 *
 * The host's KV scan is single-shot with no cursor, so the contract returns
 * `next_start` when the result hits the limit. Send that value back as `start` to
 * continue.
 *
 * Getting this step to return parseable rows required finding T-14: `scan` hands
 * back raw CAS pointers where `get` resolves them.
 */
import { CONTRACT_TAIL, CONTRACT_VERSION } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { readState, requireState } from "./state.js";

interface Jawaban {
  receipts?: Array<Record<string, unknown>>;
  count?: number;
  next_start?: string | null;
}

try {
  requireState("contractId", "npm run step:03");
  const limit = Number(process.argv[2] ?? 20);

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const hasil = (await tenant.contracts.execute(CONTRACT_TAIL, {
    version: readState().contractVersion ?? CONTRACT_VERSION,
    functionName: "list-receipts",
    input: { limit },
  })) as Jawaban;

  console.log(`count: ${hasil.count ?? 0}`);
  for (const r of hasil.receipts ?? []) {
    const core = (r.core ?? {}) as Record<string, unknown>;
    console.log(
      [
        r.receipt_id,
        core.purpose,
        `${core.method} ${core.target_host}`,
        `status ${core.response_code}`,
        `fields: ${JSON.stringify(core.fields_used)}`,
      ].join("  |  "),
    );
  }
  if (hasil.next_start) console.log(`\nresume from: ${hasil.next_start}`);
} catch (e) {
  reportError(e);
}
