# Nullstamp — panduan brand

Sumber acuan tunggal untuk warna, huruf, dan nada bicara. Berkas ini yang dibaca
lebih dulu sebelum menulis komponen antarmuka apa pun.

---

## Nama

**Nullstamp.** `null` menunjuk pada nol data yang tersingkap; `stamp` menunjuk
pada cap yang menyatakan sesuatu benar terjadi. Dua suku kata, konsonan tegas di
ujung, dan bisa dilafalkan tanpa ragu oleh penutur non-Inggris.

Ketersediaan sudah diperiksa langsung lewat kode status HTTP, bukan dikira-kira:
GitHub, Vercel, dan npm ketiganya menjawab 404 untuk nama ini.

## Tanda

Lambang himpunan kosong yang dibaca sebagai bekas cap segel. Cincinnya terpotong
dua kali di titik silang dengan palang diagonal, sehingga bentuknya menyerupai
tinta cap yang tidak rata alih-alih lingkaran hasil mesin.

Aturan pemakaian:

- Palang diagonal selalu vermilion. Cincin memakai `currentColor` agar ikut warna
  teks induknya, jadi satu berkas cukup untuk latar terang dan gelap.
- Ruang kosong di sekeliling tanda paling sedikit setara jari-jari cincin.
- Ukuran terkecil 16 piksel. Di bawah itu potongan cincin mulai menyatu.
- Jangan memberi bayangan, gradien, atau garis luar tambahan. Cap itu datar.

## Warna

Rujukannya tinta segel di atas kertas, bukan neon di atas kaca. Pilihan ini
sekaligus menjauhkan tampilan dari ungu-biru yang sudah terlalu sering dipakai
perkakas pengembang.

### Ramp netral

| Nama | Nilai | Pemakaian |
|---|---|---|
| `ink-950` | `#0B0F14` | Latar mode gelap, teks utama mode terang |
| `ink-800` | `#161C24` | Permukaan terangkat di mode gelap |
| `ink-600` | `#39424E` | Garis pemisah di mode gelap |
| `ink-400` | `#6B7280` | Teks penunjang |
| `paper-200` | `#E6E3DC` | Garis pemisah di mode terang |
| `paper-100` | `#F0EEE9` | Permukaan terangkat di mode terang |
| `paper-050` | `#F7F6F3` | Latar mode terang |

### Aksen

| Nama | Nilai | Pemakaian |
|---|---|---|
| `seal-600` | `#D6452C` | Aksen utama, palang pada tanda, tombol tindakan |
| `seal-700` | `#A32E1C` | Keadaan tertekan dan tertunjuk |
| `seal-100` | `#FBE9E4` | Latar lencana di mode terang |

### Warna keadaan

| Nama | Nilai | Arti |
|---|---|---|
| `verified-600` | `#1E7A57` | Receipt sah, digest cocok |
| `denied-600` | `#B4331F` | Digest tidak cocok, egress ditolak |
| `pending-600` | `#8A6212` | Menunggu, tanda tangan tidak tersedia |

Aturan tegas: aksen tidak dipakai untuk dekorasi. Kemunculan vermilion di sebuah
halaman menandakan ada satu hal yang perlu diperhatikan atau ditekan. Bila ada
dua vermilion bersaing dalam satu tampilan, salah satunya salah.

## Huruf

- Antarmuka dan judul: **Inter Tight**, dimuat lewat `next/font`. Judul memakai
  bobot 600 dengan `letter-spacing` negatif tipis; badan teks bobot 400.
- Angka, digest, dan DID: **JetBrains Mono**. Semua digest ditulis monospace
  supaya panjangnya bisa dibandingkan sekilas.
- Tangga ukuran: 12, 14, 16, 20, 26, 34, 46. Tidak ada ukuran di antaranya.
- Panjang baris badan teks dijaga di kisaran 68 karakter.

## Nada bicara

Produk ini menjual bukti, jadi bahasanya harus bisa dipertanggungjawabkan.

Yang dilakukan:

- Menyebut mekanismenya, bukan kesannya. "Digest ditanam di Merkle leaf
  transaksi" lebih baik daripada "keamanan tingkat perusahaan".
- Menyatakan batasnya terbuka. Kalau tanda tangan tidak tersedia, halaman
  mengatakannya beserta alasannya.
- Kalimat pendek. Satu gagasan per kalimat.

Yang dihindari:

- Kata sifat besar tanpa angka di belakangnya: revolusioner, mulus, canggih.
- Klaim yang tidak bisa diperiksa pembaca di halaman itu juga.
- Ikon emosi di seluruh antarmuka dan salinan teks.
- Tanda seru.

## Tata letak

- Kisi 8 piksel. Jarak antar bagian besar memakai kelipatan 8 yang lebih lebar,
  yaitu 48, 72, atau 96.
- Sudut: 6 piksel untuk kendali, 10 piksel untuk kartu, penuh untuk lencana.
- Garis pemisah lebih dipercaya daripada bayangan. Bayangan hanya untuk lapisan
  yang benar-benar melayang seperti menu dan dialog.
- Gerak: 140 milidetik untuk sentuhan kecil, 260 milidetik untuk perpindahan
  bagian. Semua gerak menghormati `prefers-reduced-motion`.
