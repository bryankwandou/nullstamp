# Bukti yang bisa diperiksa ulang

Berkas ini memuat keluaran apa adanya dari langkah-langkah yang sudah dijalankan.
Semuanya bisa diulang oleh siapa pun yang meng-clone repositori ini. Tidak ada
angka di halaman ini yang ditulis tangan.

---

## 1. Contract terbangun dan lolos uji

```
$ cargo test --target x86_64-pc-windows-gnu
test result: ok. 53 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   Doc-tests z_tenant_nullstamp
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

$ cargo build --target wasm32-wasip2 --release
    Finished `release` profile [optimized] target(s) in 33.93s
254053 bita  target/wasm32-wasip2/release/z_tenant_nullstamp.wasm
```

Tanpa peringatan compiler.

## 2. Component-nya sah, dan permukaan kemampuannya minimum

```
$ wasm-tools component wit target/wasm32-wasip2/release/z_tenant_nullstamp.wasm

world root {
  import host:tenant/tenant-context@1.0.0;
  import host:interfaces/logging@2.1.0;
  import host:interfaces/kv-store@2.1.0;
  import host:interfaces/http-with-placeholders@2.1.0;
  import host:interfaces/signing@2.1.0;
  ...
  export z:tenant-nullstamp/contracts@0.1.0;
}
```

Yang menarik, `wit-bindgen` memangkas antarmuka yang di-import sampai ke fungsi
yang benar-benar dipakai. Pada component hasil, `logging` menyisakan `info` saja,
dan `kv-store` menyisakan `get`, `put`, `set-claims-digest`, dan `scan`. Karena
host menolak contract yang meminta antarmuka di luar dunianya, permukaan
kemampuan yang sempit ini bukan sekadar kerapian, melainkan batas yang ditegakkan.

Perlu dicatat: `http` biasa sengaja tidak di-import. Nullstamp hanya punya satu
jalan keluar, yaitu `http-with-placeholders`. Jadi tidak ada jalur di dalam
contract ini yang bisa mengirim data tanpa melewati penyelesaian marker di sisi
host.

## 3. Testnet terjangkau dan attestation-nya terverifikasi

Dijalankan tanpa kunci pengembang.

```
$ npm run preflight

Lingkungan SDK
  [ok]    lingkungan bawaan SDK — testnet
  [ok]    alamat node — https://cn-api.sg.testnet.t3n.terminal3.io

Keterjangkauan node
  [ok]    endpoint manifest — HTTP 200

Attestation
  [ok]    manifest operator — tanda tangan sah, 3 peer, 1 pengukuran RTMR3
  [ok]    waktu penandatanganan — 2026-08-11T14:14:45Z

Komponen kriptografi SDK
  [ok]    loadWasmComponent — komponen termuat
```

## 4. Digest receipt bisa dihitung ulang lintas bahasa

Ini pernyataan inti Nullstamp, jadi tidak cukup dijelaskan; harus ditunjukkan.

Sebuah receipt disusun oleh kode Rust yang sama dengan yang berjalan di dalam
enclave:

```
$ cargo run --example sample_receipt
{
  "core": {
    "contract_id": 41,
    "contract_version": "0.1.0",
    "extracted_pointers": [ "/json/keperluan" ],
    "fields_used": [ "first_name", "last_name" ],
    "issued_at_secs": 1786457685,
    "method": "POST",
    "purpose": "peragaan_penerbitan_bukti",
    "request_body_sha256": "7d3a1f0c9b8e6d5a4c3b2a1908f7e6d5c4b3a2910f8e7d6c5b4a39281706f5e4d",
    "response_body_sha256": "1a2b3c4d5e6f70819293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f7081",
    "response_code": 200,
    "schema": "nullstamp.receipt.v1",
    "seq_no": 10482,
    "subject_did": "3c5d7e9f001122334455667788990aabbccddeef",
    "target_host": "postman-echo.com",
    "target_url": "https://postman-echo.com/post",
    "tenant_did": "9f2a4c7b1e5d8a3f6b0c2d4e6f8a1b3c5d7e9f00"
  },
  "digest_sha256": "c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945",
  "receipt_id": "rcpt_c212bc7936f8120043cdc617",
  "signature": null,
  "signing_error": "capability signing tidak diberikan pada contract ini"
}
```

Perhatikan bahwa `core` hanya memuat **nama** field, yaitu `first_name` dan
`last_name`. Nilainya tidak ada, dan memang tidak pernah bisa ada, karena kode
yang menyusun bagian ini tidak menerimanya.

Receipt yang sama lalu diperiksa oleh program terpisah dalam TypeScript. Program
itu tidak mengimpor SDK, tidak membuka sesi, dan tidak menyentuh jaringan:

```
$ npm run verify:offline -- ../submission/sample-receipt.json

receipt_id      : rcpt_c212bc7936f8120043cdc617
digest tercatat : c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945
digest dihitung : c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945
tanda tangan    : tidak ada — capability signing tidak diberikan pada contract ini

HASIL: sah. Digest dihitung ulang di luar node dan cocok.
```

Kedua sisi sampai pada digest yang sama karena keduanya menyusun bentuk kanonik
dengan aturan yang sama: kunci objek urut menaik, tanpa spasi. Di sisi Rust sifat
itu datang dari `serde_json` yang bersandar pada `BTreeMap`; di sisi TypeScript
ditulis ulang dalam sepuluh baris.

## 5. Pengubahan sekecil apa pun tertangkap

Dua percobaan, keduanya dilakukan pada receipt yang sudah sah di atas.

**Menyembunyikan satu field yang sebenarnya dipakai.** Ini bentuk kecurangan yang
paling mungkin terjadi di dunia nyata: mengaku memakai lebih sedikit data
daripada kenyataannya.

```
$ node -e "... e.core.fields_used=['first_name'] ..."
$ npm run verify:offline -- ../submission/tampered-fields.json

HASIL: tidak sah.
  - digest tidak cocok: tercatat c212bc79…d945, dihitung ulang 272a4f33…7470
  - receipt_id tidak sesuai digest: tercatat rcpt_c212bc7936f8120043cdc617,
    seharusnya rcpt_272a4f33840c5302c40a25f9
exit=1
```

**Menukar host tujuan.**

```
$ node -e "... e.core.target_host='api.penyerang.com' ..."
$ npm run verify:offline -- ../submission/tampered-host.json

HASIL: tidak sah.
  - digest tidak cocok: tercatat c212bc79…d945, dihitung ulang 3d12b64b…5154
  - receipt_id tidak sesuai digest
exit=1
```

Ada satu lapis lagi. Seseorang yang mengubah `core` lalu ikut memperbarui
`digest_sha256` supaya konsisten masih akan tertangkap, karena `receipt_id`
diturunkan dari digest. Keadaan itu diuji di sisi contract:

```
$ cargo test digest_yang_dipalsukan_agar_cocok_tetap_gagal_di_identitas
test verify::tests::digest_yang_dipalsukan_agar_cocok_tetap_gagal_di_identitas ... ok
```

## 6. Yang belum bisa ditunjukkan

Jujur soal batas pekerjaan ini.

Langkah 2 sampai 10 — klaim tenant, pendaftaran contract, pembuatan map,
penanaman kredensial, pemasangan grant, penerbitan receipt di dalam enclave —
membutuhkan kunci pengembang yang hanya bisa diperoleh lewat SSO di halaman
klaim, dan kunci itu hanya ditampilkan satu kali. Kunci itu belum ada di tangan.

Seluruh kode untuk langkah-langkah tersebut sudah ditulis, sudah lolos
`tsc --noEmit`, dan tinggal dijalankan. Begitu kunci masuk ke `scripts/.env`,
urutannya adalah `npm run step:01` sampai `step:10`, dan halaman ini akan
diperbarui dengan keluaran nyatanya beserta tangkapan layar.
