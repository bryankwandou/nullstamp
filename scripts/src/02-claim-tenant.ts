/**
 * Langkah 2 — klaim tenant.
 *
 * Sebelum ada map atau contract, DID harus terdaftar sebagai tenant dan kredit
 * ujinya diberikan. SDK menyediakan `tenant.claim()` untuk jalur mandiri di
 * testnet.
 *
 * Langkah ini tidak disebut di halaman Quickstart maupun Walkthrough. Tanpanya,
 * `maps.create` pada langkah berikutnya berjalan atas tenant yang belum ada.
 * Catatan lengkapnya di docs/BUGS.md.
 *
 * Pemanggilan berulang bersifat aman: jawabannya berubah menjadi
 * `already-admitted` dengan `granted_credits` bernilai null.
 */
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

try {
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`DID tenant : ${s.tenantDid}`);
  console.log("mengajukan klaim tenant...");

  const hasil = await tenant.tenant.claim();
  console.log("jawaban klaim:", JSON.stringify(hasil, null, 2));

  const info = await tenant.tenant.me();
  console.log("\nkeadaan tenant:", JSON.stringify(info, null, 2));

  writeState({ tenantDid: s.tenantDid, tenantClaim: hasil });
} catch (e) {
  reportError(e);
}
