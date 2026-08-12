<p align="center">
  <img src="brand/logo-lockup.svg" alt="Nullstamp" width="230">
</p>

<p align="center">
  Bukti terverifikasi untuk panggilan agent yang menyentuh data pribadi.<br>
  Dibangun di atas Terminal 3 ADK dan jaringan T3N.
</p>

---

## Masalahnya

Agent yang mengurus hal nyata harus menyentuh nama, tanggal lahir, dan alamat
surel seseorang. Cara mencatat aktivitas itu hari ini terjepit di antara dua
kegagalan.

Catatan yang lengkap menyimpan data mentah, sehingga catatan kepatuhan itu
sendiri menjadi timbunan risiko. Catatan yang diredaksi kehilangan kelengkapan,
sehingga tidak bisa dibuktikan utuh ketika diperiksa.

Kewajiban rekaman EU AI Act Pasal 12 untuk sistem risiko tinggi mulai berlaku
Agustus 2026, dan GDPR menuntut pemilik data mengetahui field apa yang dipakai,
kapan, dan untuk tujuan apa. Dua tuntutan itu saling menjegal selama catatannya
dibuat dengan cara biasa.

## Jalan ketiga

T3N memecah kebuntuan itu bukan lewat kebijakan, melainkan lewat bentuk
sistemnya. Panggilan keluar dikirim melalui `http-with-placeholders`: badan
permintaan hanya memuat marker `{{profile.<field>}}`, dan host menyelesaikannya
di dalam enclave, setelah contract selesai menyusun permintaan.

Artinya contract memang tidak pernah memegang nilainya. Bukan berjanji tidak
menyimpan — memang tidak menerima.

Nullstamp memanfaatkan sifat itu untuk menerbitkan bukti. Setiap penerbitan
mencatat nama field yang dirujuk, host tujuan, sidik badan permintaan, kode
status, dan waktu. Semua pernyataan itu diikat satu digest SHA-256, dan digest
itu ditanam ke Merkle leaf transaksi lewat `kv-store.set-claims-digest`.

Akibatnya bukti tadi bisa dihitung ulang di luar node. Sudah dibuktikan: sebuah
receipt yang disusun kode contract berhasil diperiksa oleh program TypeScript
terpisah, tanpa Rust dan tanpa jaringan, dengan digest yang sama persis. Lihat
[docs/PROOF.md](docs/PROOF.md).

## Isi repositori

```
contract/z-tenant-nullstamp/   TEE contract, Rust menjadi WASM component
  src/canon.rs                 pembacaan marker, bentuk kanonik, digest
  src/receipt.rs               bentuk receipt dan penyegelannya
  src/issue.rs                 issue-receipt
  src/verify.rs                verify-receipt
  src/list.rs                  list-receipts
  examples/sample_receipt.rs   pencetak receipt contoh untuk uji lintas bahasa

scripts/src/                   sepuluh langkah onboarding dan pengelolaan
  preflight.ts                 pemeriksaan yang jalan tanpa kunci pengembang
  01-quickstart.ts             handshake dan autentikasi
  02-claim-tenant.ts           klaim tenant, langkah yang tidak ada di docs
  03-register-contract.ts      pendaftaran WASM
  04-create-maps.ts            pembuatan map KV beserta ACL
  05-seed-secret.ts            penanaman kredensial
  06-grant-agent.ts            pemasangan grant otorisasi
  07-issue-receipt.ts          penerbitan bukti
  08-verify-receipt.ts         pemeriksaan bukti di dalam enclave
  09-list-receipts.ts          pengambilan jejak
  10-contract-logs.ts          pembacaan log contract
  verify-offline.ts            pemeriksa mandiri, tanpa SDK dan tanpa jaringan

web/                           halaman muka dan konsol
docs/BUGS.md                   laporan temuan onboarding
docs/PROOF.md                  keluaran apa adanya dari yang sudah dijalankan
docs/PLAN.md                   rencana dan urutan kerja
brand/                         tanda, susunan, dan panduan brand
```

## Menjalankan

Yang dibutuhkan: Node.js 20 atau lebih baru, Rust dengan target
`wasm32-wasip2`, dan `wasm-tools`.

```bash
# 1. bangun contract
cd contract/z-tenant-nullstamp
rustup target add wasm32-wasip2
cargo test --target "$(rustc -vV | sed -n 's/^host: //p')"
cargo build --target wasm32-wasip2 --release
wasm-tools component wit target/wasm32-wasip2/release/z_tenant_nullstamp.wasm

# 2. periksa lingkungan, belum perlu kunci pengembang
cd ../../scripts
npm install
npm run preflight

# 3. buktikan digest bisa dihitung ulang di luar node
cd ../contract/z-tenant-nullstamp
cargo run --example sample_receipt > ../../submission/sample-receipt.json
cd ../../scripts
npm run verify:offline -- ../submission/sample-receipt.json
```

Untuk langkah yang menyentuh testnet, kunci pengembang harus diklaim lebih
dulu di <https://go.terminal3.io/adk-community>. Kunci itu hanya ditampilkan satu
kali dan tidak bisa diambil ulang, jadi salin segera. Setelah itu:

```bash
cd scripts
cp .env.example .env      # isi T3N_API_KEY
npm run step:01           # sampai step:10
```

## Catatan untuk tim Terminal 3

Contoh kode pertama pada halaman Quickstart tidak bisa berjalan apa adanya:
field `trustAnchor` bersifat wajib pada `T3nClientConfig`, dan `T3nConfigError`
dilempar di constructor sebelum ada lalu lintas jaringan. Halaman galat umum juga
menyatakan `tenant_did()` sudah berbentuk string, padahal WIT-nya memulangkan 20
bita mentah dan repo acuan resmi memang menyandikannya dengan `hex::encode`.

Sepuluh temuan beserta langkah reproduksinya ada di [docs/BUGS.md](docs/BUGS.md),
diurutkan menurut bobot. Satu usulan juga ada di sana: `set-claims-digest` layak
diberi halaman sendiri, sebab kalimat "so clients can verify receipts offline"
pada komentar WIT-nya menjawab
pertanyaan tersulit tentang komputasi rahasia, dan tidak ada satu pun halaman ADK
yang membahasnya.

## Lisensi

MIT.
