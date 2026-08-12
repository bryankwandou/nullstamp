# Laporan temuan — onboarding T3 ADK

Disusun sambil mengerjakan Quickstart dan Walkthrough, 12 Agustus 2026.

Setiap temuan disertai bukti yang bisa diperiksa ulang: berkas dan baris pada
paket `@terminal3/t3n-sdk@4.35.1`, isi WIT yang divendor pada repo acuan
`Terminal-3/z-tenant-flight`, atau keluaran perintah apa adanya. Tidak ada
temuan yang bersandar pada dugaan.

## Lingkungan pengujian

| Butir | Nilai |
|---|---|
| Sistem | Windows 11, 10.0.26200 |
| Node.js | 24.13.0 |
| Rust | 1.89.0, target `wasm32-wasip2` |
| wasm-tools | 1.255.0 |
| SDK | `@terminal3/t3n-sdk@4.35.1` |
| Node T3N | `https://cn-api.sg.testnet.t3n.terminal3.io` |
| Manifest testnet | versi 1786457685, ditandatangani 2026-08-11T14:14:45Z |

Ringkasan: 3 penghambat, 3 sedang, 4 ringan, 1 usulan.

---

## T-01 — Contoh kode pertama pada Quickstart tidak bisa berjalan: `trustAnchor` tidak disertakan

**Bobot: penghambat.** Menghentikan setiap pengembang baru pada langkah pertama.

Contoh pada halaman Quickstart menyusun klien seperti ini:

```ts
const t3n = new T3nClient({
  wasmComponent,
  handlers: {
    EthSign: metamask_sign(address, undefined, T3N_API_KEY),
  },
});
```

Sementara tipe `T3nClientConfig` pada SDK menyatakan `trustAnchor` sebagai field
wajib. Kutipan komentarnya:

> **Required.** Client-pinned trust anchor the node's DKG attestation is verified
> against before the handshake trusts its ML-KEM key (SP-003). … It is a required
> field precisely so no caller can omit it by accident — bypassing verification
> must be a visible, grep-able choice.

Deklarasinya: `trustAnchor: TrustAnchorOrUnsafe;` tanpa tanda tanya, jadi bukan
opsional. Kelas `T3nConfigError` pada SDK juga menyebut dirinya dilempar
"eagerly at construction".

**Akibat.** Contoh itu gagal sebelum menyentuh jaringan, dan pesannya menunjuk
field konfigurasi, bukan ke dokumentasi yang menyesatkan. Pengembang tidak punya
petunjuk bahwa yang salah adalah contoh di halaman tersebut.

**Reproduksi.** Tempel contoh Quickstart apa adanya, jalankan
`npx tsx quickstart.ts`.

**Usulan perbaikan.** Sertakan pengambilan anchor pada contoh pertama:

```ts
const trustAnchor = await fetchTrustedManifest("testnet");
const t3n = new T3nClient({ wasmComponent, baseUrl: getNodeUrl(), trustAnchor, handlers: { … } });
```

Jalur ini sudah tersedia dan sudah bekerja. Diuji pada testnet: manifest terambil
dengan HTTP 200, tanda tangan operator sah, berisi 3 peer dan 1 pengukuran RTMR3.
`fetchTrustedManifest` juga dinyatakan tidak pernah memulangkan anchor yang belum
terverifikasi, jadi menjadikannya jalur baku tidak menambah risiko.

---

## T-02 — Set penangan pada Quickstart tidak lengkap untuk handshake

**Bobot: penghambat.**

Contoh Quickstart memasang satu penangan saja, yaitu `EthSign`. SDK menyediakan
`createDefaultHandlers(baseUrl, trustAnchor)` yang komentarnya menyebut dirinya:

> Create the default handler set **required** by the T3n handshake.

Set itu mencakup penangan kunci ML-KEM dan sumber acak, keduanya tidak ada pada
contoh. Penangan ML-KEM juga tempat anchor dipakai untuk memverifikasi kunci
sebelum handshake mempercayainya.

**Usulan perbaikan.** Pada contoh, gabungkan keduanya:

```ts
handlers: {
  ...createDefaultHandlers(nodeUrl, trustAnchor),
  EthSign: metamask_sign(address, undefined, apiKey),
}
```

---

## T-03 — Halaman Walkthrough bertentangan dengan WIT dan dengan kode acuan resmi

**Bobot: penghambat.** Contoh yang diberikan tidak bisa dikompilasi.

Halaman galat umum menyatakan, soal penyandian DID:

> `tenant_did()` already returns the string form

Kenyataannya, pada `wit/deps/host-tenant-1.0.0/package.wit` yang divendor di repo
acuan, tanda tangannya:

```wit
/// Tenant DID under which this contract is running. The 20-byte
/// raw `CompactDid` shape — same as user / organisation DIDs.
tenant-did: func() -> list<u8>;
```

Jadi yang kembali adalah 20 bita mentah, bukan string. Repo acuan resmi milik
Terminal 3 sendiri memang menyandikannya, pada `src/booking.rs`:

```rust
let tid = tenant_context::tenant_did();
let map_name = alloc::format!("z:{}:secrets", hex::encode(&tid));
```

Sementara contoh pada halaman Walkthrough menuliskannya tanpa penyandian:

```rust
let map_name = format!("z:{}:secrets", tid);
```

**Akibat.** Contoh itu tidak bisa dikompilasi, karena `Vec<u8>` tidak
mengimplementasikan `Display`. Pengembang yang mempercayai halaman galat umum
lalu memperbaiki galat kompilasi dengan cara lain berisiko menyusun nama map
yang salah dan berakhir pada `map not found` tanpa tahu sebabnya.

**Usulan perbaikan.** Perbaiki kalimat pada halaman galat umum menjadi
kebalikannya, dan selaraskan contoh Walkthrough dengan `booking.rs`.

---

## T-04 — Langkah klaim tenant tidak disebut sama sekali

**Bobot: sedang.**

Alur pada Quickstart dan Walkthrough berjalan dari autentikasi langsung ke
pembuatan map dan pendaftaran contract. SDK menyediakan `tenant.claim()` beserta
tipe hasilnya:

```ts
interface TenantSelfAdmitResult {
  status: "admitted" | "already-admitted";
  tenant: string;
  granted_credits: number | null;
}
```

Komentarnya menyebut ini "the testnet self-admit path". Tidak ada halaman
Quickstart maupun Walkthrough yang menyebutnya.

**Akibat.** DID yang baru diklaim belum tentu punya baris tenant dan kredit.
Halaman galat umum memang memuat `InsufficientCreditError` dengan saran
menghubungi devrel, padahal untuk testnet ada jalur mandiri yang menyelesaikannya
tanpa perlu berkirim surel.

**Usulan perbaikan.** Tambahkan satu langkah bernama klaim tenant di antara
Quickstart dan Walkthrough, dan sebutkan sifat idempotennya.

---

## T-05 — Ketergantungan urutan antara pendaftaran contract dan pembuatan map tidak dinyatakan

**Bobot: sedang.**

Halaman pembuatan map KV memberi contoh:

```ts
await tenant.maps.create({
  tail: "secrets",
  visibility: "private",
  writers: { only: [contractId] },
  readers: { only: [contractId] },
});
```

Nilai `contractId` muncul tanpa keterangan asalnya. Satu-satunya sumbernya adalah
hasil `contracts.register`, yang menurut urutan Walkthrough dikerjakan setelah
map dibuat.

**Akibat.** Urutan yang tertulis tidak bisa diikuti sampai selesai. Pengembang
harus menebak bahwa pendaftaran perlu dijalankan lebih dulu.

**Usulan perbaikan.** Nyatakan urutannya: daftarkan contract, ambil
`contract_id`, baru buat map. Atau sebutkan bahwa map bisa dibuat dengan
`writers: "all"` lebih dulu lalu dipersempit lewat `maps.update`.

---

## T-06 — Rantai dependensi SDK membawa satu kerentanan kritis

**Bobot: sedang.**

Setelah `npm install @terminal3/t3n-sdk` pada proyek kosong:

```
added 153 packages, and audited 154 packages
4 vulnerabilities (3 moderate, 1 critical)
```

Rinciannya dari `npm audit --json`:

| Paket | Bobot | Isu |
|---|---|---|
| `decompress` | kritis | Zip Slip, penulisan berkas di luar direktori tujuan saat ekstraksi arsip |
| `@bytecodealliance/weval` | sedang | lewat `decompress` |
| `@bytecodealliance/componentize-js` | sedang | lewat `weval` |
| `@bytecodealliance/jco` | sedang | lewat `componentize-js` |

Jalurnya `jco` → `componentize-js` → `weval` → `decompress`. Perbaikan sudah
tersedia menurut `fixAvailable`.

**Catatan.** Karena SDK ini dipakai justru untuk membangun sesuatu yang dijaga
kerahasiaannya, kesan dari empat peringatan pada pemasangan pertama cukup
mengganggu. Bila `jco` sebenarnya hanya diperlukan saat pembangunan, memindahkannya
ke dependensi pengembangan atau dependensi opsional akan membersihkan pemasangan
di sisi pemakai.

---

## T-07 — Antarmuka SDK yang berguna tidak muncul di dokumentasi

**Bobot: ringan.** Bukan kerusakan, tetapi membuat pekerjaan jauh lebih lama.

Tiga hal yang saya temukan hanya dengan membaca `index.d.ts`, bukan dari halaman
mana pun:

1. `maps.entrySet(tail, key, value)`. Halaman penanaman kunci API menganjurkan
   `executeControl("map-entry-set", { map_name: tenant.canonicalName("secrets"), … })`.
   Pembantu ini menyusun nama kanoniknya sendiri, jadi lebih sulit salah.
   Pasangannya `entryGet` dan `getStatus` juga tidak disebut.

2. `contracts.logs(tail, { limit })`. Membaca kembali baris `logging::info` yang
   dipancarkan contract sendiri. Inilah alat pertama yang dibutuhkan saat sebuah
   pemanggilan gagal tanpa penjelasan, dan justru tidak disebut di halaman galat
   umum.

3. `maps.getStatus` memulangkan `"active" | "deleting" | "absent"`, sehingga
   siklus hapus lalu buat ulang bisa ditunggu alih-alih dikira-kira.

---

## T-08 — Contoh penanganan galat pada Walkthrough menelan dua ragam yang justru penting

**Bobot: ringan.**

Contoh `format_http_error` pada halaman Walkthrough menangani `EgressDenied`,
`PlaceholderUnknown`, dan `UpstreamError`, lalu menutup dengan lengan tangkap
semua `_ => "error"`.

Padahal WIT mendefinisikan lima ragam, dan komentarnya menerangkan bahwa
pembedaan itu memang disengaja:

> `placeholder-unknown` … Distinct from `placeholder-denied` so the contract can
> surface "your profile is missing X" UX rather than "you're not allowed to read X".

Dengan lengan tangkap semua, `PlaceholderDenied` dan
`PlaceholderNoUserContext` jatuh menjadi kata "error" tanpa keterangan, sehingga
manfaat pembedaan yang dirancang host itu hilang.

**Usulan perbaikan.** Tulis kelima lengan secara lengkap pada contoh, tanpa
lengan tangkap semua, supaya penambahan ragam baru nanti terdeteksi saat
kompilasi.

---

## T-09 — Beberapa alamat dokumentasi menjawab 404, satu halaman kosong isi

**Bobot: ringan.**

| Alamat | Hasil |
|---|---|
| `/developers/adk/examples/payroll-agent` | HTTP 404 |
| `/developers/adk/workflow/register-contract` | HTTP 404 |

Alamat yang benar menurut `sitemap.xml` adalah `/developers/adk/use-cases/payroll-agent`
dan `/developers/adk/get-started/walkthrough/register-contract`.

Selain itu, halaman `/developers/adk/use-cases/payroll-agent` yang benar pun tidak
memuat penjelasan; isinya hanya menunjuk ke tautan lain. Padahal halaman ini
disebut sebagai contoh di indeks dokumentasi.

---

## T-10 — Nomor versi pada repo acuan tidak seragam

**Bobot: ringan.**

Pada `Terminal-3/z-tenant-flight`:

- `wit/world.wit` menyatakan `package z:tenant-flight@0.4.0;`
- `Cargo.toml` menyatakan `version = "0.4.1"`
- `src/lib.rs` menyatakan `CONTRACT_VERSION: &str = "0.4.1"`, dan ujinya memaksa
  nilai itu sementara nama ujinya masih `contract_version_is_v0_4_0`

Tidak menghentikan pekerjaan, tetapi karena halaman galat umum menegaskan bahwa
versi harus naik setiap pendaftaran ulang, contoh yang nomor versinya tidak
seragam justru membingungkan di titik yang paling sensitif.

---

## U-01 — Usulan: `set-claims-digest` layak punya halaman sendiri

Ini bukan kerusakan, melainkan kemampuan yang menurut saya paling bernilai dan
paling tidak terlihat.

Pada `host:interfaces@2.1.0`, antarmuka `kv-store` memuat:

```wit
/// Set an application-defined claims digest for this transaction.
/// The digest must be exactly 32 bytes (SHA-256). It is included
/// in the Merkle leaf so clients can verify receipts offline.
set-claims-digest: func(digest: list<u8>) -> result<_, string>;
```

Kalimat terakhirnya menjawab pertanyaan yang paling sering diajukan tentang
komputasi rahasia, yaitu bagaimana pihak luar bisa memeriksa sesuatu yang
dijalankan di tempat yang tidak bisa mereka lihat. Tidak ada satu pun halaman ADK
yang membahasnya.

Nullstamp dibangun di atas kemampuan ini, dan hasilnya bisa diperiksa: sebuah
bukti yang diterbitkan kode contract berhasil dihitung ulang oleh pemeriksa
terpisah yang ditulis dalam TypeScript, tanpa Rust dan tanpa jaringan, dengan
digest yang sama persis. Rinciannya di [PROOF.md](PROOF.md).

Bila kemampuan ini diberi halaman sendiri beserta contoh bentuk kanonik,
argumen jualan T3N berubah dari "percayalah pada enclave" menjadi "hitung sendiri
dan bandingkan".
