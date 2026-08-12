/**
 * Langkah 2 — pastikan tenant sudah ter-admit.
 *
 * Urutan di sini dibalik dari yang tampak wajar, dan itu disengaja. Membaca
 * keadaan lebih dulu lewat `tenant.me()`, baru memanggil `tenant.claim()` kalau
 * memang belum ter-admit.
 *
 * Alasannya bukan gaya. Halaman klaim SSO ternyata sudah membuat baris tenant
 * dan mengisi kredit, dan `tenant.claim()` atas tenant yang sudah aktif menjawab
 * "Internal error" HTTP 500, bukan `already-admitted` sebagaimana yang
 * diperkirakan dari bentuk jawabannya. Sudah dicoba dua kali dengan dua
 * request_id berbeda, keduanya sama. Rinciannya pada temuan T-11 di docs/BUGS.md.
 *
 * Jadi memanggil klaim tanpa memeriksa dulu akan menghentikan skrip pada langkah
 * yang sebenarnya sudah beres.
 */
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

try {
  const s = await openUserSession();
  const tenant = openTenantClient(s);

  console.log(`DID tenant : ${s.tenantDid}`);

  console.log("\nmembaca keadaan tenant lebih dulu...");
  const sebelum = await tenant.tenant.me();
  const status = (sebelum as { status?: string }).status;
  const label = (sebelum as { label?: string }).label;
  console.log(`  status : ${status ?? "tidak diketahui"}`);
  console.log(`  label  : ${label ?? "tidak diketahui"}`);

  let klaim: unknown = null;

  if (status === "active") {
    console.log(
      "\ntenant sudah aktif — halaman klaim SSO sudah mengerjakannya.\n" +
        "klaim ulang dilewati, sebab tenant.claim() atas tenant aktif menjawab 500.",
    );
    klaim = { skipped: "tenant already active", source: "halaman klaim SSO" };
  } else {
    console.log("\ntenant belum aktif, mengajukan klaim...");
    klaim = await tenant.tenant.claim();
    console.log("jawaban klaim:", JSON.stringify(klaim, null, 2));
  }

  const saldo = await s.t3n.getBalance();
  console.log("\nsaldo kredit:");
  console.log(`  tersedia  : ${(saldo as { available?: number }).available ?? "?"}`);
  console.log(`  dicadangkan: ${(saldo as { reserved?: number }).reserved ?? "?"}`);

  const kuota = (sebelum as { quotas?: Record<string, number> }).quotas ?? {};
  console.log("\nkuota yang membatasi pekerjaan berikutnya:");
  for (const k of [
    "max_contracts",
    "max_maps",
    "max_wasm_bytes",
    "outbox_calls_per_minute_max",
    "fuel_per_call_max",
  ]) {
    if (kuota[k] !== undefined) console.log(`  ${k.padEnd(28)}: ${kuota[k]}`);
  }

  writeState({ tenantDid: s.tenantDid, tenantClaim: klaim });
  console.log("\ntenant siap. keadaan tersimpan di state.json");
} catch (e) {
  reportError(e);
}
