/**
 * Step 5 — seed the upstream credential into the `secrets` map.
 *
 * Writing through the tenant management surface bypasses the map's writer set, so it
 * succeeds even when only the contract may write. Once seeded, the only route to the
 * value is contract code running inside the enclave.
 *
 * The docs suggest `executeControl("map-entry-set", ...)` with a hand-built
 * `map_name`. The SDK already ships `maps.entrySet`, which builds the canonical name
 * itself, so that is what this uses — see finding T-07 for the surface the docs
 * leave out.
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
  console.log(`seeded  : ${tenant.canonicalName(MAP_SECRETS)} / ${KEY}`);

  // The read-back only confirms the row exists. Only its length is reported; the
  // value itself is never printed.
  const kembali = await tenant.maps.entryGet(MAP_SECRETS, KEY);
  console.log(
    kembali === null
      ? "peringatan: baris tidak terbaca kembali"
      : `read back, length ${kembali.length} characters`,
  );
} catch (e) {
  reportError(e);
}
