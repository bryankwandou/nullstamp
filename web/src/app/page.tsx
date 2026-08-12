import Link from "next/link";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { Mechanism } from "@/components/mechanism";
import { Verifier } from "@/components/verifier";

export default function Beranda() {
  return (
    <>
      {/* Pembuka */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="ns-grid absolute inset-0 -z-10 h-[560px]" />

        <div className="mx-auto max-w-6xl px-5 pt-20 pb-16 sm:pt-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[12px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-seal" />
              Dibangun di atas Terminal 3 ADK, jalan di T3N testnet
            </p>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-7 max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
              Agen Anda menyentuh data pribadi orang.
              <span className="block text-muted">Buktikan apa saja yang dipakainya.</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
              Nullstamp menerbitkan bukti untuk setiap panggilan yang menyentuh
              data seseorang: field apa yang dirujuk, ke host mana dikirim, di
              bawah izin siapa. Nilainya tidak pernah ikut, sebab kode yang
              menerbitkan bukti itu memang tidak pernah menerimanya.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#coba"
                className="rounded-md bg-seal px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-seal-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
              >
                Periksa sebuah bukti
              </Link>
              <Link
                href="#mekanisme"
                className="rounded-md border border-line px-5 py-2.5 text-[15px] transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
              >
                Lihat mekanismenya
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Kebuntuan */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            Catatan aktivitas agent hari ini terjepit di antara dua kegagalan
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal delay={60}>
            <article className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-denied">
                kegagalan pertama
              </p>
              <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.01em]">
                Catatan yang lengkap menyimpan data mentah
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                Prompt dan tanggapan disimpan apa adanya supaya jejaknya utuh.
                Akibatnya catatan kepatuhan itu sendiri berubah menjadi timbunan
                data pribadi, dan ikut menjadi temuan ketika diperiksa.
              </p>
            </article>
          </Reveal>

          <Reveal delay={120}>
            <article className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-pending">
                kegagalan kedua
              </p>
              <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.01em]">
                Catatan yang diredaksi kehilangan kelengkapan
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                Bagian sensitifnya dihapus supaya aman disimpan. Yang tersisa
                tidak bisa membuktikan bahwa jejaknya utuh, sehingga tidak
                menjawab pertanyaan pemeriksa.
              </p>
            </article>
          </Reveal>
        </div>

        <Reveal delay={180}>
          <div className="mt-6 rounded-[10px] border border-seal/35 bg-seal-wash/60 p-6">
            <p className="text-[15px] leading-relaxed">
              Kewajiban rekaman EU AI Act Pasal 12 untuk sistem risiko tinggi
              mulai berlaku Agustus 2026, sementara GDPR menuntut pemilik data
              mengetahui field apa yang dipakai, kapan, dan untuk tujuan apa. Dua
              tuntutan itu saling menjegal selama catatannya dibuat dengan cara
              biasa.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Mekanisme */}
      <section id="mekanisme" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-wider text-seal">
            mekanisme
          </p>
          <h2 className="mt-3 max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            Jalan ketiga datang dari bentuk sistemnya, bukan dari kebijakan
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
            T3N menyelesaikan marker profil di dalam enclave, setelah contract
            selesai menyusun permintaan. Jadi contract bukan berjanji tidak
            menyimpan nilai itu; ia memang tidak menerimanya.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10">
          <Mechanism />
        </Reveal>
      </section>

      {/* Verifier */}
      <section id="coba" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-wider text-seal">
            coba sendiri
          </p>
          <h2 className="mt-3 max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            Bukti yang hanya bisa diperiksa penerbitnya bukan bukti
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
            Receipt di bawah ini keluaran nyata dari kode contract. Digest-nya
            dihitung ulang di peramban Anda memakai Web Crypto, tanpa satu pun
            permintaan ke server kami. Ubah isinya, atau tekan salah satu tombol
            percobaan, lalu perhatikan pemeriksaannya menolak.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-8">
          <Verifier />
        </Reveal>
      </section>

      {/* Isi receipt */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            Apa yang dicatat, dan apa yang tidak
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal delay={60}>
            <div className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-verified">
                dicatat
              </p>
              <ul className="mt-4 space-y-2.5 text-[14.5px] leading-relaxed">
                {[
                  ["fields_used", "nama field yang dirujuk, urut menaik"],
                  ["target_host", "host tujuan panggilan"],
                  ["request_body_sha256", "sidik badan permintaan"],
                  ["response_code", "kode status dari upstream"],
                  ["subject_did", "DID pemilik data yang sesinya berjalan"],
                  ["issued_at_secs", "waktu dari jam cluster, bukan jam mesin"],
                ].map(([k, v]) => (
                  <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <code className="font-mono text-[12.5px] text-seal sm:w-[168px] sm:shrink-0">
                      {k}
                    </code>
                    <span className="text-muted">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-denied">
                tidak pernah dicatat
              </p>
              <ul className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-muted">
                <li>
                  Nilai field profil. Contract hanya mengirim marker, dan host
                  menyelesaikannya setelah contract selesai.
                </li>
                <li>
                  Badan tanggapan upstream. Yang tersimpan sidiknya. Bagian yang
                  ingin ditarik keluar harus disebut satu per satu, dan
                  penyebutan itu ikut terikat digest.
                </li>
                <li>
                  Kredensial upstream. Nilainya dibaca di dalam enclave dari map
                  yang hanya bisa diakses contract.
                </li>
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-faint">
                Pengakuan field diperiksa terhadap isi badan permintaan sebelum
                ada lalu lintas keluar. Mengaku memakai dua field padahal
                merujuk empat akan ditolak, bukan dicatat.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Penutup */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="rounded-[10px] border border-line bg-surface px-6 py-12 text-center">
            <Logo size={40} animate className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-xl text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              Hitung sendiri, lalu bandingkan
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              Seluruh kode contract, skrip onboarding, dan pemeriksa mandiri ada
              di repositori. Laporan sepuluh temuan dari proses onboarding-nya
              juga terbuka.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/bryankwandou/nullstamp"
                className="rounded-md bg-seal px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-seal-strong"
              >
                Buka repositori
              </a>
              <Link
                href="/temuan"
                className="rounded-md border border-line px-5 py-2.5 text-[15px] transition-colors duration-150 hover:bg-bg"
              >
                Baca laporan temuan
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
