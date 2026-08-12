/**
 * Langkah 4b — selaraskan ACL map ke nomor contract yang berlaku sekarang.
 *
 * Perlu dijalankan setiap kali contract didaftarkan ulang, dan alasannya adalah
 * satu jebakan yang tidak disebut di dokumentasi mana pun:
 *
 *   Setiap pendaftaran memberi nomor contract yang BARU. ACL map mengikat pada
 *   nomor itu, bukan pada nama contract-nya. Jadi begitu contract didaftarkan
 *   ulang, seluruh map yang mengizinkan contract lama langsung menolak yang baru.
 *
 * Gejalanya jelas kalau sudah tahu, dan membingungkan kalau belum:
 *   access denied: TenantContract(did:t3n:…/617) cannot read map "z:…:receipts"
 *
 * Rinciannya pada temuan T-13 di docs/BUGS.md.
 */
import { MAP_RECEIPTS, MAP_SECRETS } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState } from "./state.js";

try {
  const contractId = requireState("contractId", "npm run step:03");

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`nomor contract berlaku : ${contractId}`);
  console.log("menyelaraskan ACL map...\n");

  for (const tail of [MAP_SECRETS, MAP_RECEIPTS]) {
    await tenant.maps.update(tail, {
      visibility: "private",
      writers: { only: [contractId] },
      readers: { only: [contractId] },
    });

    const status = await tenant.maps.getStatus(tail);
    const nama = (status as { map?: string }).map ?? tail;
    const keadaan = (status as { status?: string }).status ?? "?";
    console.log(`  ${nama} -> ${keadaan}`);
    console.log(`    pembaca & penulis kini hanya contract ${contractId}`);
  }

  console.log("\nACL selaras. Contract sudah boleh membaca dan menulis map-nya.");
} catch (e) {
  reportError(e);
}
