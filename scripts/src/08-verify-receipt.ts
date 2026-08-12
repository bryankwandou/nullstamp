/**
 * Langkah 8 — periksa receipt.
 *
 * Contract menghitung ulang digest dari lapis `core` yang tersimpan lalu
 * membandingkannya dengan yang tercatat. Karena bentuk kanoniknya menata kunci
 * secara menaik, perhitungan yang sama bisa diulang di luar node. Berkas
 * `verify-offline.ts` melakukan itu tanpa menyentuh jaringan sama sekali.
 */
import { CONTRACT_TAIL, CONTRACT_VERSION } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { readState, requireState } from "./state.js";

try {
  const receiptId =
    process.argv[2] ?? requireState("lastReceiptId", "npm run step:07");
  console.log("memeriksa:", receiptId);

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
      ? "\ndigest cocok, receipt sah"
      : "\ndigest tidak cocok; lihat kolom reason di atas",
  );
} catch (e) {
  reportError(e);
}
