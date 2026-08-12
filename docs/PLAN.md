# Nullstamp — Master Plan

Status: locked, 12 Agustus 2026
Nama final: **Nullstamp** (github.com/<user>/nullstamp, nullstamp.vercel.app)

---

## 1. Kenapa proyek ini ada

Brief Terminal 3 lewat Superteam Earn meminta developer menguji onboarding testnet T3N,
menyelesaikan Quickstart + Walkthrough, melaporkan bug, dan — sebagai bonus — mengusulkan
satu use case awal di luar contract pertama.

Nullstamp adalah use case itu, dibangun sampai jalan, bukan sekadar diusulkan di slide.

## 2. Masalah yang dikejar

Agent AI yang mengurus hal nyata harus menyentuh data pribadi: nama, tanggal lahir, email,
nomor dokumen. Cara mencatat aktivitas itu hari ini terjebak di antara dua kegagalan:

- Log lengkap menyimpan PII mentah, sehingga catatan kepatuhan itu sendiri menjadi
  timbunan risiko kebocoran.
- Log yang diredaksi kehilangan kelengkapan, sehingga tidak bisa dibuktikan utuh saat diperiksa.

Kewajiban rekaman EU AI Act Pasal 12 untuk sistem risiko tinggi mulai berlaku Agustus 2026,
dan GDPR menuntut pemilik data tahu field apa dipakai, kapan, untuk tujuan apa.

## 3. Kenapa T3N satu-satunya jalan

Arsitektur T3N membuat jawabannya struktural, bukan kebijakan:

| Primitive T3N | Yang dijamin |
|---|---|
| `http-with-placeholders` | Placeholder `{{profile.*}}` diselesaikan host di dalam enclave. Plaintext tidak pernah masuk memori WASM. |
| Delegation grant (`agent-auth-update`) | Pemilik data menentukan fungsi mana dan host mana yang boleh disentuh agent. Tanpa grant, panggilan gagal di titik penegakan. |
| KV map `z:<tid>:secrets` | Kredensial disegel; jalur satu-satunya adalah kode contract di dalam TEE. |
| `did:t3n:...` | Identitas tenant dan agent terpisah, bisa diaudit. |
| Egress allowlist | Tujuan keluar diikat ke grant pengguna, bukan ke deklarasi contract. |

Konsekuensinya: catatan yang dihasilkan Nullstamp bisa menyatakan "field ini dipakai, dikirim ke
host ini, di bawah grant ini" sekaligus membuktikan nilainya tidak pernah terlihat — karena
contract-nya memang tidak punya akses ke nilai itu.

## 4. Bentuk produk

Satu TEE contract (`z-tenant-nullstamp`) plus antarmuka web.

### Fungsi contract

- `issue-receipt` — jalankan panggilan pihak ketiga memakai placeholder, lalu terbitkan
  receipt: daftar field yang dirujuk, host tujuan, hash payload, status upstream, timestamp,
  DID agent, versi contract. Nilai field tidak pernah ikut.
- `verify-receipt` — periksa ulang receipt terhadap catatan di KV map, kembalikan hasil
  verifikasi beserta alasan bila gagal.
- `list-receipts` — ambil jejak receipt untuk satu subjek, dipagari ACL.

### Antarmuka web

- Landing page: menjelaskan dilema audit trail dan bukti tandingannya.
- Live console: jalankan `issue-receipt` ke testnet, tampilkan receipt asli yang kembali.
- Verifier: tempel receipt, lihat hasil `verify-receipt`.
- Docs onboarding: catatan Quickstart + Walkthrough dan bug yang ditemukan.

## 5. Urutan kerja

1. Klaim developer key + DID di claim page, simpan segera (kunci hanya tampil sekali).
2. Quickstart: `@terminal3/t3n-sdk`, handshake, authenticate, dapat `tenantDid`.
3. Set dev env: `rustup target add wasm32-wasip2`, `cargo install wasm-tools`.
4. Walkthrough write/build: clone `z-tenant-flight` sebagai acuan, tulis contract Nullstamp.
5. `cargo build --target wasm32-wasip2 --release`, validasi dengan `wasm-tools component wit`.
6. Buat KV map (`receipts`, `secrets`) dengan readers dan writers eksplisit — governor menolak
   secara bawaan bila readers dikosongkan.
7. Seed kredensial via `executeControl("map-entry-set", ...)`.
8. Register contract (`contracts.register`), naikkan `version` tiap kali daftar ulang.
9. Set grant pengguna, lalu invoke lewat sesi agent (`executeAndDecode`).
10. Catat setiap error verbatim beserta `request_id` untuk laporan bug.
11. Bangun web, deploy Vercel.
12. Susun Google Doc publik: screenshot tiap tahap, tabel bug, tautan repo.

## 6. Jebakan yang sudah diketahui dari docs

- Developer key hilang setelah meninggalkan claim page, tidak ada pemulihan di fase test.
- `tenant_did()` sudah berbentuk string; jangan di-hex-encode ulang.
- `baseUrl: getNodeUrl()` harus dikirim eksplisit saat membuat `TenantClient`.
- Nama map dipakai sebagai tail lokal saja; SDK menambahkan prefiks `z:<tid>:` sendiri.
- Register ulang tanpa menaikkan versi ditolak.
- `host/http.egress_denied` muncul bila host tujuan belum ada di grant pengguna.
- `cargo install wasm-tools` menyusun sekitar 100 crate tanpa output progres, kira-kira dua menit.

## 7. Ukuran keberhasilan

- Quickstart dan Walkthrough tuntas, terbukti lewat screenshot.
- Contract kedua di luar contoh resmi berjalan di testnet.
- Laporan bug punya langkah reproduksi, error verbatim, dan `request_id`.
- Landing page dan console hidup di Vercel.
- Repo publik, README bisa diikuti orang lain dari nol.
