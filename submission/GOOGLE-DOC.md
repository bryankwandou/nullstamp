# Terminal 3 ADK — Laporan Onboarding Testnet dan Usulan Use Case

**Peserta:** Bryan Kwandou
**Tanggal:** 12 Agustus 2026
**Repositori publik:** https://github.com/bryankwandou/nullstamp
**Peragaan langsung:** https://nullstamp.vercel.app
**Verifier receipt:** https://nullstamp.vercel.app/verifikasi
**Laporan temuan:** https://nullstamp.vercel.app/temuan

> Cara memakai naskah ini: salin seluruh isinya ke Google Doc baru, atur akses
> menjadi "Anyone with the link — Viewer", lalu tempel tangkapan layar pada titik
> yang sudah ditandai. Tanda kurung siku menunjukkan tempat gambar.

---

## 1. Ringkasan

Brief meminta empat hal: menyelesaikan Quickstart, menyelesaikan Walkthrough,
melaporkan bug yang ditemukan, dan sebagai bonus mengusulkan satu use case awal
di luar contract pertama.

Tiga hal pertama dikerjakan sampai batas yang bisa dicapai. Untuk bonusnya, use
case-nya tidak hanya diusulkan, tetapi dibangun sampai berjalan: sebuah TEE
contract kedua bernama Nullstamp, lengkap dengan 54 unit test, halaman peragaan,
dan pemeriksa mandiri yang membuktikan klaim intinya.

Sepuluh temuan tercatat. Tiga di antaranya menghentikan pengembang baru pada
langkah pertama, termasuk satu yang membuat contoh kode pertama di halaman
Quickstart tidak bisa berjalan apa adanya.

## 2. Identitas dan lingkungan

| Butir | Nilai |
|---|---|
| DID tenant | `[isi setelah klaim: did:t3n:...]` |
| Alamat Eth turunan | `[isi]` |
| Lingkungan | testnet |
| Node | `https://cn-api.sg.testnet.t3n.terminal3.io` |
| Manifest testnet | versi 1786457685, ditandatangani 2026-08-11T14:14:45Z |
| Sistem | Windows 11, 10.0.26200 |
| Node.js | 24.13.0 |
| Rust | 1.89.0, target `wasm32-wasip2` |
| wasm-tools | 1.255.0 |
| SDK | `@terminal3/t3n-sdk@4.35.1` |

Kunci pengembang tidak dicantumkan di dokumen ini, dan tidak pernah masuk ke
riwayat repositori.

**[Tangkapan layar 1: halaman klaim setelah DID dan kunci terbit, dengan bagian
kunci disensor]**

## 3. Penyiapan lingkungan pengembangan

```
rustup target add wasm32-wasip2
cargo install wasm-tools
npm install @terminal3/t3n-sdk
```

Catatan dari halaman docs bahwa `cargo install wasm-tools` menyusun sekitar
seratus crate tanpa keluaran progres memang benar dan berguna.

Yang tidak disebut: pemasangan SDK memunculkan empat peringatan keamanan, satu di
antaranya kritis. Rinciannya pada temuan T-06.

**[Tangkapan layar 2: keluaran `npm run preflight`, seluruh pemeriksaan lolos]**

Untuk memisahkan kegagalan lingkungan dari kegagalan layanan, saya menulis satu
skrip pemeriksaan pendahuluan yang bisa dijalankan sebelum kunci pengembang ada.
Skrip itu memeriksa versi perkakas, keberadaan berkas WASM, keterjangkauan node,
keabsahan tanda tangan manifest operator, dan pemuatan komponen kriptografi SDK.
Seluruhnya lolos.

## 4. Quickstart

Contoh kode pada halaman Quickstart tidak bisa dijalankan apa adanya. Penyebabnya
dua, keduanya dipaksa oleh tipe SDK dan bukan soal selera:

1. `T3nClientConfig.trustAnchor` bersifat wajib, dan `T3nConfigError` dilempar di
   constructor sebelum ada lalu lintas jaringan.
2. Handshake membutuhkan set penangan lengkap dari `createDefaultHandlers`, bukan
   `EthSign` sendirian.

Bentuk yang berhasil:

```ts
setEnvironment("testnet");
const nodeUrl = getNodeUrl();
const trustAnchor = await fetchTrustedManifest("testnet");
const wasmComponent = await loadWasmComponent();
const ethAddress = eth_get_address(apiKey);

const t3n = new T3nClient({
  wasmComponent,
  baseUrl: nodeUrl,
  trustAnchor,
  handlers: {
    ...createDefaultHandlers(nodeUrl, trustAnchor),
    EthSign: metamask_sign(ethAddress, undefined, apiKey),
  },
});

await t3n.handshake();
const did = await t3n.authenticate(createEthAuthInput(ethAddress));
```

`fetchTrustedManifest` sudah diuji terhadap testnet dan berhasil: manifest
terambil dengan HTTP 200, tanda tangan operator sah, berisi 3 peer dan 1
pengukuran RTMR3. Fungsi itu juga dinyatakan tidak pernah memulangkan anchor yang
belum terverifikasi, jadi menjadikannya jalur baku pada dokumentasi tidak
menambah risiko apa pun.

**[Tangkapan layar 3: keluaran `npm run step:01` — DID tenant tercetak]**

## 5. Klaim tenant

Langkah ini tidak ada di dokumentasi, tetapi diperlukan. SDK menyediakan
`tenant.claim()` sebagai jalur mandiri untuk testnet, sekaligus pemberian kredit
uji. Sifatnya idempoten: pemanggilan berulang menjawab `already-admitted`.

**[Tangkapan layar 4: keluaran `npm run step:02` — jawaban klaim dan keadaan tenant]**

## 6. Walkthrough — contract pertama

Repo acuan `Terminal-3/z-tenant-flight` di-clone dan dibaca sampai selesai,
termasuk WIT yang divendor di dalamnya. Dari situ dua hal penting terlihat.

Pertama, `tenant-did` memulangkan `list<u8>` berupa 20 bita mentah, dan repo acuan
memang menyandikannya dengan `hex::encode`. Halaman galat umum menyatakan
sebaliknya, dan contoh pada halaman Walkthrough karenanya tidak bisa dikompilasi.
Rinciannya pada temuan T-03.

Kedua, `host:interfaces@2.1.0` memuat jauh lebih banyak kemampuan daripada yang
dibahas dokumentasi, termasuk `signing`, `clock`, `contracts-call`, `token`, dan
yang paling menarik `kv-store.set-claims-digest`.

## 7. Walkthrough — contract kedua, di luar contoh yang disediakan

Bagian ini menjawab bonus pada brief.

### Masalah yang dikejar

Agent yang mengurus hal nyata harus menyentuh data pribadi. Cara mencatat
aktivitasnya hari ini terjepit di antara dua kegagalan. Catatan yang lengkap
menyimpan data mentah, sehingga catatan kepatuhan itu sendiri menjadi timbunan
risiko. Catatan yang diredaksi kehilangan kelengkapan, sehingga tidak bisa
dibuktikan utuh saat diperiksa.

Kewajiban rekaman EU AI Act Pasal 12 untuk sistem risiko tinggi mulai berlaku
Agustus 2026, sementara GDPR menuntut pemilik data mengetahui field apa yang
dipakai, kapan, dan untuk tujuan apa.

### Mengapa T3N yang bisa menjawabnya

Karena `http-with-placeholders` membuat jawabannya struktural, bukan soal
kebijakan. Contract mengirim marker, host menyelesaikannya di dalam enclave
setelah contract selesai. Jadi contract bukan berjanji tidak menyimpan nilai itu;
ia memang tidak menerimanya.

### Bentuk contract

`z:tenant-nullstamp@0.1.0`, tiga fungsi:

- `issue-receipt` — jalankan panggilan keluar, lalu terbitkan bukti atasnya
- `verify-receipt` — hitung ulang digest receipt tersimpan dan bandingkan
- `list-receipts` — ambil jejak receipt, dengan titik lanjut bila menyentuh batas

Yang dicatat sebuah receipt: nama field yang dirujuk, host tujuan, sidik badan
permintaan, kode status upstream, DID subjek, waktu dari jam cluster, dan nomor
urut. Yang tidak pernah dicatat: nilai field, badan tanggapan, dan kredensial.

Semua pernyataan itu diikat satu digest SHA-256, dan digest itu ditanam ke Merkle
leaf transaksi lewat `set-claims-digest`.

### Satu keputusan rancangan yang perlu disebut

Pengakuan field diperiksa terhadap isi badan permintaan sebelum ada satu bita pun
keluar. Mengaku memakai dua field padahal badan permintaan merujuk empat akan
ditolak, bukan dicatat. Tanpa aturan ini sebuah receipt bisa mengaku lebih
sederhana daripada kenyataannya, dan bukti yang bisa mengecilkan cakupannya
sendiri tidak ada gunanya.

Selain itu, `http` biasa sengaja tidak di-import. Nullstamp hanya punya satu jalan
keluar, yaitu `http-with-placeholders`. Jadi tidak ada jalur di dalam contract ini
yang bisa mengirim data tanpa melewati penyelesaian marker di sisi host.

**[Tangkapan layar 5: keluaran `cargo test` — 53 lolos, 0 gagal]**
**[Tangkapan layar 6: keluaran `wasm-tools component wit` — daftar import dan export]**

## 8. Bukti yang bisa diperiksa ulang

Sebuah bukti yang hanya bisa diperiksa penerbitnya bukan bukti. Karena itu digest
dihitung atas bentuk kanonik: kunci objek urut menaik, tanpa spasi, urutan larik
dibiarkan.

Kesetaraannya diuji lintas bahasa. Receipt disusun oleh kode Rust yang sama dengan
yang berjalan di enclave, lalu diperiksa program TypeScript terpisah yang tidak
mengimpor SDK, tidak membuka sesi, dan tidak menyentuh jaringan:

```
receipt_id      : rcpt_c212bc7936f8120043cdc617
digest tercatat : c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945
digest dihitung : c212bc7936f8120043cdc61780e4fb3a0b5331eca3a392f5edae5350ff07d945

HASIL: sah. Digest dihitung ulang di luar node dan cocok.
```

Sisi sebaliknya juga diuji. Menyembunyikan satu field yang sebenarnya dipakai, dan
menukar host tujuan, keduanya tertangkap. Percobaan yang lebih teliti — mengubah
isi lalu ikut memperbaiki digest supaya konsisten — tetap tertangkap, karena
identitas receipt diturunkan dari digest dan tidak bisa ikut diperbaiki tanpa
berubah menjadi identitas lain.

Pemeriksaan yang sama bisa dijalankan siapa pun di
https://nullstamp.vercel.app/verifikasi, memakai Web Crypto di peramban, tanpa
permintaan jaringan. Tersedia tombol untuk merusak receipt sendiri lalu melihat
pemeriksaannya menolak.

**[Tangkapan layar 7: halaman verifier, keadaan sah]**
**[Tangkapan layar 8: halaman verifier setelah receipt diubah, keadaan tidak sah]**

## 9. Sepuluh temuan

Versi lengkap dengan kutipan verbatim dan langkah reproduksi ada di
https://github.com/bryankwandou/nullstamp/blob/main/docs/BUGS.md

| Kode | Bobot | Ringkas |
|---|---|---|
| T-01 | penghambat | Contoh kode pertama Quickstart tidak bisa berjalan: `trustAnchor` wajib tetapi tidak disertakan, dan galatnya dilempar di constructor |
| T-02 | penghambat | Set penangan pada Quickstart tidak lengkap untuk handshake; `createDefaultHandlers` tidak disebut |
| T-03 | penghambat | Halaman galat umum menyatakan `tenant_did()` sudah berbentuk string, padahal WIT memulangkan `list<u8>` dan repo acuan resmi menyandikannya; contoh Walkthrough tidak bisa dikompilasi |
| T-04 | sedang | Langkah klaim tenant tidak disebut sama sekali, padahal diperlukan untuk mendapat baris tenant dan kredit |
| T-05 | sedang | Pembuatan map memakai `contractId` yang hanya ada setelah pendaftaran, sehingga urutan yang tertulis tidak bisa diikuti sampai selesai |
| T-06 | sedang | Pemasangan SDK memunculkan 4 peringatan, satu kritis: Zip Slip pada `decompress` lewat jalur `jco` |
| T-07 | ringan | `maps.entrySet`, `maps.entryGet`, `maps.getStatus`, dan `contracts.logs` tidak muncul di dokumentasi mana pun |
| T-08 | ringan | Contoh penanganan galat memakai lengan tangkap semua, sehingga dua ragam yang pembedaannya disengaja host jadi hilang |
| T-09 | ringan | Dua alamat dokumentasi menjawab 404; halaman contoh payroll tidak memuat penjelasan |
| T-10 | ringan | Nomor versi pada repo acuan tidak seragam antara `world.wit`, `Cargo.toml`, dan nama ujinya |

## 10. Satu usulan

`kv-store.set-claims-digest` layak diberi halaman sendiri.

Komentar WIT-nya berbunyi: digest ditanam ke Merkle leaf "so clients can verify
receipts offline". Kalimat itu menjawab pertanyaan tersulit tentang komputasi
rahasia, yaitu bagaimana pihak luar bisa memeriksa sesuatu yang dijalankan di
tempat yang tidak bisa mereka lihat. Tidak ada satu pun halaman ADK yang
membahasnya.

Nullstamp dibangun di atas kemampuan itu, dan hasilnya bisa diperiksa siapa pun.
Bila kemampuan ini diberi halaman beserta contoh bentuk kanonik, argumen jualan
T3N berubah dari "percayalah pada enclave" menjadi "hitung sendiri dan
bandingkan".

## 11. Batas pekerjaan ini

Langkah 2 sampai 10 — klaim tenant, pendaftaran contract, pembuatan map,
penanaman kredensial, pemasangan grant, penerbitan receipt di dalam enclave —
membutuhkan kunci pengembang dari halaman klaim SSO.

Seluruh kode untuk langkah itu sudah ditulis, lolos `tsc --noEmit`, dan tinggal
dijalankan berurutan. Bagian dokumen ini akan diperbarui dengan keluaran nyata dan
tangkapan layarnya begitu kunci diperoleh.

Yang sudah terbukti tanpa kunci: contract terbangun dan lolos 54 uji, component
sah dan permukaan kemampuannya minimum, testnet terjangkau dengan attestation
terverifikasi, dan digest receipt bisa dihitung ulang lintas bahasa beserta
penolakan terhadap pengubahan.

## 12. Cara memeriksa ulang

```bash
git clone https://github.com/bryankwandou/nullstamp
cd nullstamp/contract/z-tenant-nullstamp
cargo test --target "$(rustc -vV | sed -n 's/^host: //p')"
cargo build --target wasm32-wasip2 --release
wasm-tools component wit target/wasm32-wasip2/release/z_tenant_nullstamp.wasm

cd ../../scripts && npm install && npm run preflight

cd ../contract/z-tenant-nullstamp
cargo run --example sample_receipt > ../../submission/sample-receipt.json
cd ../../scripts
npm run verify:offline -- ../submission/sample-receipt.json
```

## 13. Kontak

Bryan Kwandou — nayrbryangaming01@gmail.com
GitHub: https://github.com/bryankwandou
