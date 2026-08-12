/**
 * Penyelidikan keadaan tenant.
 *
 * Dipakai setelah `tenant.claim()` menjawab "Internal error". Urutannya disusun
 * least state-changing first: read before attempting any write. Every call is
 * reported verbatim along with its request_id, because the
 * galat umum meminta nomor itu saat melaporkan kegagalan 500.
 */
import { openTenantClient, openUserSession } from "./session.js";

function laporkan(nama: string, e: unknown) {
  const err = e as Record<string, unknown> & { message?: string };
  console.log(`  GAGAL  ${nama}`);
  console.log(`         jenis   : ${(e as object)?.constructor?.name ?? typeof e}`);
  console.log(`         pesan   : ${err?.message ?? String(e)}`);
  for (const k of ["code", "requestId", "request_id", "field"]) {
    if (err?.[k] !== undefined) console.log(`         ${k} : ${String(err[k])}`);
  }
}

const s = await openUserSession();
const tenant = openTenantClient(s);

console.log(`\nDID: ${s.tenantDid}`);
console.log(`alamat eth: ${s.ethAddress}\n`);

console.log("1. tenant.me() — apakah baris tenant sudah ada?");
try {
  const me = await tenant.tenant.me();
  console.log("  BERHASIL:", JSON.stringify(me, null, 2));
} catch (e) {
  laporkan("tenant.me()", e);
}

console.log("\n2. t3n.getBalance() — apakah kredit sudah masuk?");
try {
  const b = await s.t3n.getBalance();
  console.log("  BERHASIL:", JSON.stringify(b, null, 2));
} catch (e) {
  laporkan("getBalance()", e);
}

console.log("\n3. t3n.getUsage() — bentuk laporan pemakaian");
try {
  const u = await s.t3n.getUsage();
  console.log("  BERHASIL:", JSON.stringify(u, null, 2).slice(0, 900));
} catch (e) {
  laporkan("getUsage()", e);
}

console.log("\n4. tenant.claim() percobaan ulang — docs meminta satu kali ulang");
try {
  const c = await tenant.tenant.claim();
  console.log("  BERHASIL:", JSON.stringify(c, null, 2));
} catch (e) {
  laporkan("tenant.claim() ulangan", e);
}

console.log("\n5. contracts.list() — apakah permukaan pengelolaan tenant terjangkau?");
try {
  const l = await tenant.contracts.list();
  console.log("  BERHASIL:", JSON.stringify(l));
} catch (e) {
  laporkan("contracts.list()", e);
}

console.log("");
