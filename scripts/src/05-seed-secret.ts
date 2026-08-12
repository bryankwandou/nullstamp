/**
 * Langkah 5 — tanam kredensial upstream ke map `secrets`.
 *
 * Penulisan lewat jalur pengelolaan tenant melangkahi daftar penulis map, jadi
 * tetap berhasil meskipun map itu hanya boleh ditulis contract. Setelah tertanam,
 * satu-satunya jalan menuju nilainya adalah kode contract di dalam enclave.
 *
 * Halaman docs menganjurkan `executeControl("map-entry-set", ...)` dengan
 * menyusun `map_name` sendiri. SDK sudah menyediakan `maps.entrySet` yang
 * menyusun nama kanoniknya sendiri, jadi jalur itu yang dipakai di sini.
 */
import { MAP_SECRETS } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { requireState } from "./state.js";

const KEY = process.env.NULLSTAMP_SECRET_KEY ?? "upstream_api_key";
const VALUE = process.env.NULLSTAMP_SECRET_VALUE;

try {
  requireState("mapsCreated", "npm run step:04");

  if (!VALUE || VALUE.trim().length === 0) {
    throw new Error(
      [
        "NULLSTAMP_SECRET_VALUE belum diisi.",
        "",
        "Isi dengan kunci API layanan upstream yang akan dipanggil contract,",
        "lalu jalankan ulang. Nilainya hanya melewati jalur pengelolaan tenant",
        "dan tidak pernah tercetak di layar.",
      ].join("\n"),
    );
  }

  const s = await openUserSession();
  const tenant = openTenantClient(s);

  await tenant.maps.entrySet(MAP_SECRETS, KEY, VALUE.trim());
  console.log(`tertanam: ${tenant.canonicalName(MAP_SECRETS)} / ${KEY}`);

  // Pembacaan ulang hanya untuk memastikan barisnya ada. Panjangnya saja yang
  // dilaporkan; nilainya tidak dicetak.
  const kembali = await tenant.maps.entryGet(MAP_SECRETS, KEY);
  console.log(
    kembali === null
      ? "peringatan: baris tidak terbaca kembali"
      : `terbaca kembali, panjang ${kembali.length} karakter`,
  );
} catch (e) {
  reportError(e);
}
