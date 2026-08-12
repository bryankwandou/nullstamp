/**
 * Langkah 11 — tarik receipt nyata dari testnet dan simpan ke berkas.
 *
 * Gunanya satu: menyediakan bahan untuk pemeriksaan di luar node. Berkas hasilnya
 * bisa diserahkan ke `verify-offline.ts`, yang tidak mengimpor SDK, tidak membuka
 * sesi, dan tidak menyentuh jaringan. Kalau digest-nya cocok di sana, berarti
 * keutuhan receipt bisa dibuktikan tanpa mempercayai node maupun kami.
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

  // Ambil yang paling baru menurut waktu penerbitan. Bukan menurut receipt id,
  // sebab id diturunkan dari digest sehingga urutannya tidak berhubungan dengan
  // waktu.
  const waktu = (r: Record<string, unknown>) =>
    Number((r.core as Record<string, unknown>)?.issued_at_secs ?? 0);

  const pilih = utuh.reduce((a, b) => (waktu(b) >= waktu(a) ? b : a)) as Record<
    string,
    unknown
  >;

  writeFileSync(tujuan, JSON.stringify(pilih, null, 2) + "\n", "utf8");

  const core = pilih.core as Record<string, unknown>;
  console.log(`tersimpan ke : ${tujuan}`);
  console.log(`receipt_id   : ${String(pilih.receipt_id)}`);
  console.log(`digest       : ${String(pilih.digest_sha256)}`);
  console.log(`host tujuan  : ${String(core.target_host)}`);
  console.log(`field dipakai: ${JSON.stringify(core.fields_used)}`);
  console.log(`seq_no       : ${String(core.seq_no)}`);
  console.log(`\nperiksa di luar node dengan:`);
  console.log(`  npm run verify:offline -- ${process.argv[2] ?? "../submission/live-receipt.json"}`);
} catch (e) {
  reportError(e);
}
