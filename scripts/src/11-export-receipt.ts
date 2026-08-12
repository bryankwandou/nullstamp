/**
 * Step 11 — pull a real receipt off testnet and write it to a file.
 *
 * One purpose: to provide material for checking outside the node. The resulting file
 * can be handed to `verify-offline.ts`, which imports no SDK, opens no session, and
 * touches no network. If the digest agrees there, a receipt's integrity can be
 * demonstrated without trusting the node and without trusting us.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONTRACT_TAIL, CONTRACT_VERSION } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { readState } from "./state.js";

interface Jawaban {
  count?: number;
  receipts?: Array<Record<string, unknown>>;
}

try {
  const tujuan = resolve(
    process.argv[2] ?? "../submission/live-receipt.json",
  );

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const hasil = (await tenant.contracts.execute(CONTRACT_TAIL, {
    version: readState().contractVersion ?? CONTRACT_VERSION,
    functionName: "list-receipts",
    input: { limit: 50 },
  })) as Jawaban;

  const semua = hasil.receipts ?? [];
  const utuh = semua.filter((r) => r.core !== undefined && r.digest_sha256 !== undefined);

  if (utuh.length === 0) {
    throw new Error(
      `tidak ada receipt utuh di antara ${semua.length} baris. Terbitkan dulu: npm run step:07`,
    );
  }

  // Take the newest by issuance time, not by receipt id: the id derives from the
  // digest, so its ordering has nothing to do with time.
  const waktu = (r: Record<string, unknown>) =>
    Number((r.core as Record<string, unknown>)?.issued_at_secs ?? 0);

  const pilih = utuh.reduce((a, b) => (waktu(b) >= waktu(a) ? b : a)) as Record<
    string,
    unknown
  >;

  writeFileSync(tujuan, JSON.stringify(pilih, null, 2) + "\n", "utf8");

  const core = pilih.core as Record<string, unknown>;
  console.log(`saved to    : ${tujuan}`);
  console.log(`receipt_id  : ${String(pilih.receipt_id)}`);
  console.log(`digest      : ${String(pilih.digest_sha256)}`);
  console.log(`target host : ${String(core.target_host)}`);
  console.log(`fields used : ${JSON.stringify(core.fields_used)}`);
  console.log(`seq_no      : ${String(core.seq_no)}`);
  console.log(`\ncheck it outside the node with:`);
  console.log(`  npm run verify:offline -- ${process.argv[2] ?? "../submission/live-receipt.json"}`);
} catch (e) {
  reportError(e);
}
