/**
 * Langkah 9 — ambil jejak receipt.
 *
 * Pemindaian KV di host bersifat sekali jalan tanpa kursor, jadi contract
 * memulangkan `next_start` bila hasilnya menyentuh batas. Nilai itu bisa
 * dikirim balik sebagai `start` untuk melanjutkan.
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

  console.log(`jumlah: ${hasil.count ?? 0}`);
  for (const r of hasil.receipts ?? []) {
    const core = (r.core ?? {}) as Record<string, unknown>;
    console.log(
      [
        r.receipt_id,
        core.purpose,
        `${core.method} ${core.target_host}`,
        `status ${core.response_code}`,
        `field: ${JSON.stringify(core.fields_used)}`,
      ].join("  |  "),
    );
  }
  if (hasil.next_start) console.log(`\nlanjutkan dari: ${hasil.next_start}`);
} catch (e) {
  reportError(e);
}
