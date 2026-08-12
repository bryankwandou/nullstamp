import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Laporan temuan onboarding T3 ADK — Nullstamp",
  description:
    "Sepuluh temuan dari proses menyelesaikan Quickstart dan Walkthrough Terminal 3 ADK, beserta bukti dan langkah reproduksinya.",
};

type Bobot = "penghambat" | "sedang" | "ringan" | "usulan";

const WARNA: Record<Bobot, string> = {
  penghambat: "text-denied border-denied/40 bg-denied/5",
  sedang: "text-pending border-pending/40 bg-pending/5",
  ringan: "text-muted border-line bg-surface",
  usulan: "text-seal border-seal/40 bg-seal-wash/60",
};

const TEMUAN: Array<{
  kode: string;
  bobot: Bobot;
  judul: string;
  isi: string;
  bukti?: string;
}> = [
  {
    kode: "T-01",
    bobot: "penghambat",
    judul: "Contoh kode pertama pada Quickstart tidak bisa berjalan",
    isi: "Contoh itu menyusun T3nClient tanpa field trustAnchor. Pada SDK, field tersebut wajib dan T3nConfigError dilempar di constructor, sebelum ada lalu lintas jaringan. Pengembang baru berhenti di langkah pertama tanpa petunjuk bahwa yang salah adalah contohnya.",
    bukti: "trustAnchor: TrustAnchorOrUnsafe;  // tanpa tanda tanya, jadi wajib",
  },
  {
    kode: "T-02",
    bobot: "penghambat",
    judul: "Set penangan pada Quickstart tidak lengkap untuk handshake",
    isi: "Contoh memasang EthSign saja. SDK menyediakan createDefaultHandlers yang komentarnya menyebut dirinya set penangan yang diperlukan handshake, mencakup penangan kunci ML-KEM dan sumber acak.",
  },
  {
    kode: "T-03",
    bobot: "penghambat",
    judul: "Dokumentasi bertentangan dengan WIT dan dengan kode acuan resmi",
    isi: "Halaman galat umum menyatakan tenant_did() sudah berbentuk string. WIT-nya memulangkan list<u8>, yaitu 20 bita mentah, dan repo acuan resmi memang menyandikannya dengan hex::encode. Contoh pada halaman Walkthrough karenanya tidak bisa dikompilasi.",
    bukti: 'tenant-did: func() -> list<u8>;   // host:tenant@1.0.0',
  },
  {
    kode: "T-04",
    bobot: "sedang",
    judul: "Langkah klaim tenant tidak disebut sama sekali",
    isi: "SDK menyediakan tenant.claim() sebagai jalur mandiri di testnet, lengkap dengan pemberian kredit. Tidak ada halaman Quickstart maupun Walkthrough yang menyebutnya, padahal tanpa langkah itu DID yang baru belum tentu punya baris tenant dan kredit.",
  },
  {
    kode: "T-05",
    bobot: "sedang",
    judul: "Urutan antara pendaftaran contract dan pembuatan map tidak dinyatakan",
    isi: "Contoh pembuatan map memakai contractId tanpa keterangan asalnya. Satu-satunya sumbernya hasil contracts.register, yang menurut urutan Walkthrough dikerjakan setelah map dibuat. Urutan yang tertulis tidak bisa diikuti sampai selesai.",
  },
  {
    kode: "T-06",
    bobot: "sedang",
    judul: "Rantai dependensi SDK membawa satu kerentanan kritis",
    isi: "Pemasangan pada proyek kosong menghasilkan empat peringatan, satu di antaranya kritis: Zip Slip pada decompress, lewat jalur jco, componentize-js, weval. Perbaikannya sudah tersedia.",
    bukti: "4 vulnerabilities (3 moderate, 1 critical)",
  },
  {
    kode: "T-07",
    bobot: "ringan",
    judul: "Antarmuka SDK yang berguna tidak muncul di dokumentasi",
    isi: "maps.entrySet, maps.entryGet, maps.getStatus, dan contracts.logs semuanya ada di SDK tetapi tidak disebut di halaman mana pun. Yang terakhir justru alat pertama yang dibutuhkan saat sebuah pemanggilan gagal tanpa penjelasan.",
  },
  {
    kode: "T-08",
    bobot: "ringan",
    judul: "Contoh penanganan galat menelan dua ragam yang justru penting",
    isi: "Contoh format_http_error menutup dengan lengan tangkap semua, sehingga PlaceholderDenied dan PlaceholderNoUserContext jatuh menjadi kata error tanpa keterangan. Komentar WIT justru menerangkan bahwa pembedaan keduanya disengaja.",
  },
  {
    kode: "T-09",
    bobot: "ringan",
    judul: "Beberapa alamat dokumentasi menjawab 404, satu halaman kosong isi",
    isi: "Dua alamat yang ditautkan dari indeks menjawab 404. Halaman contoh payroll yang alamatnya benar pun tidak memuat penjelasan, hanya menunjuk ke tautan lain.",
  },
  {
    kode: "T-10",
    bobot: "ringan",
    judul: "Nomor versi pada repo acuan tidak seragam",
    isi: "world.wit menyebut 0.4.0 sementara Cargo.toml dan CONTRACT_VERSION menyebut 0.4.1, dan nama ujinya masih menyebut versi lama. Membingungkan justru di titik yang paling sensitif, sebab versi harus naik setiap pendaftaran ulang.",
  },
  {
    kode: "U-01",
    bobot: "usulan",
    judul: "set-claims-digest layak punya halaman sendiri",
    isi: "Komentar WIT-nya menyebut digest ditanam ke Merkle leaf sehingga klien bisa memeriksa receipt di luar node. Kalimat itu menjawab pertanyaan tersulit tentang komputasi rahasia, dan tidak ada satu pun halaman ADK yang membahasnya. Nullstamp dibangun di atas kemampuan ini, dan hasilnya bisa diperiksa.",
  },
];

export default function Temuan() {
  const hitung = (b: Bobot) => TEMUAN.filter((t) => t.bobot === b).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Reveal>
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Laporan temuan onboarding
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-muted">
          Disusun sambil menyelesaikan Quickstart dan Walkthrough Terminal 3 ADK
          pada 12 Agustus 2026. Setiap temuan punya bukti yang bisa diperiksa
          ulang, berupa berkas dan baris pada paket SDK, isi WIT yang divendor di
          repo acuan, atau keluaran perintah apa adanya.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 font-mono text-[12px]">
          <span className="rounded-full border border-denied/40 bg-denied/5 px-2.5 py-1 text-denied">
            {hitung("penghambat")} penghambat
          </span>
          <span className="rounded-full border border-pending/40 bg-pending/5 px-2.5 py-1 text-pending">
            {hitung("sedang")} sedang
          </span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-muted">
            {hitung("ringan")} ringan
          </span>
          <span className="rounded-full border border-seal/40 bg-seal-wash/60 px-2.5 py-1 text-seal">
            {hitung("usulan")} usulan
          </span>
        </div>
      </Reveal>

      <div className="mt-12 space-y-4">
        {TEMUAN.map((t, i) => (
          <Reveal key={t.kode} delay={Math.min(i * 40, 240)}>
            <article className="rounded-[10px] border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center gap-3">
                <code className="font-mono text-[13px] text-faint">{t.kode}</code>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${WARNA[t.bobot]}`}
                >
                  {t.bobot}
                </span>
              </div>
              <h2 className="mt-3 text-[18.5px] font-semibold leading-snug tracking-[-0.01em]">
                {t.judul}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{t.isi}</p>
              {t.bukti && (
                <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-bg px-3.5 py-2.5">
                  <code className="font-mono text-[12.5px] text-ink">{t.bukti}</code>
                </pre>
              )}
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-12 rounded-[10px] border border-line bg-surface p-6 text-[14.5px] leading-relaxed text-muted">
          Versi lengkapnya, beserta kutipan verbatim dan langkah reproduksi tiap
          temuan, ada pada{" "}
          <a
            href="https://github.com/bryankwandou/nullstamp/blob/main/docs/BUGS.md"
            className="text-seal underline decoration-seal/30 underline-offset-2 hover:decoration-seal"
          >
            docs/BUGS.md
          </a>{" "}
          di repositori.
        </p>
      </Reveal>
    </div>
  );
}
