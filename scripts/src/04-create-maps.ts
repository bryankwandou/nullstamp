/**
 * Langkah 4 — buat map KV yang dipakai contract.
 *
 * Dua map dibutuhkan. `secrets` menampung kredensial upstream, `receipts`
 * menampung bukti yang diterbitkan.
 *
 * Dua hal yang mudah membuat langkah ini gagal:
 *
 * - `readers` harus disebut. Governor KV menolak secara bawaan, jadi
 *   mengosongkannya membuat contract gagal membaca map miliknya sendiri.
 * - Bentuk kawatnya hanya menerima huruf kecil, yaitu `"all"` atau
 *   `{ only: [id] }`. Bentuk berhuruf besar ditolak.
 *
 * Menjalankan ulang langkah ini aman: "map already exists" bersifat idempoten
 * dan diperlakukan sebagai keberhasilan.
 */
import { MAP_RECEIPTS, MAP_SECRETS } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState, writeState } from "./state.js";

function sudahAda(e: unknown): boolean {
  const m = (e as { message?: string })?.message ?? "";
  return m.toLowerCase().includes("already exists");
}

try {
  const contractId = requireState("contractId", "npm run step:03");

  const s = await openUserSession();
  const tenant = openTenantClient(s);
  const dibuat: string[] = [];

  for (const tail of [MAP_SECRETS, MAP_RECEIPTS]) {
    const nama = tenant.canonicalName(tail);
    try {
      await tenant.maps.create({
        tail,
        visibility: "private",
        writers: { only: [contractId] },
        readers: { only: [contractId] },
      });
      console.log(`dibuat  : ${nama}`);
      dibuat.push(nama);
    } catch (e) {
      if (sudahAda(e)) {
        console.log(`sudah ada: ${nama}`);
        dibuat.push(nama);
      } else {
        throw e;
      }
    }

    const status = await tenant.maps.getStatus(tail);
    console.log(`status  : ${nama} -> ${status}`);
  }

  writeState({ mapsCreated: dibuat });
} catch (e) {
  reportError(e);
}
