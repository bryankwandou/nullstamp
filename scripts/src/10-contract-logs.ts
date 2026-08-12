/**
 * Langkah 10 — baca log yang dipancarkan contract.
 *
 * Host menampung baris `logging::info` per pasangan tenant dan contract, lalu
 * menyediakannya lewat `contracts.logs`. Ini alat pemeriksaan paling langsung
 * ketika sebuah pemanggilan gagal tanpa penjelasan.
 *
 * Fasilitas ini tidak disebut di halaman Walkthrough maupun halaman galat umum,
 * padahal justru inilah yang dibutuhkan saat menghadapi kegagalan yang tidak
 * bercerita.
 */
import { CONTRACT_TAIL } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState } from "./state.js";

try {
  requireState("contractId", "npm run step:03");
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  const hasil = await tenant.contracts.logs(CONTRACT_TAIL, { limit: 50 });
  console.log(JSON.stringify(hasil, null, 2));
} catch (e) {
  reportError(e);
}
