import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { Verifier } from "@/components/verifier";

export const metadata: Metadata = {
  title: "Verifikasi receipt — Nullstamp",
  description:
    "Hitung ulang digest sebuah receipt Nullstamp di peramban Anda sendiri, tanpa permintaan jaringan.",
};

export default function Verifikasi() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Verifikasi receipt
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
          Tempel sebuah receipt Nullstamp, lalu digest-nya dihitung ulang di
          tempat memakai Web Crypto. Tidak ada bagian dari receipt itu yang
          dikirim ke mana pun.
        </p>
      </Reveal>

      <Reveal delay={70} className="mt-9">
        <Verifier />
      </Reveal>

      <Reveal delay={140}>
        <section className="mt-14 max-w-2xl">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">
            Cara digest-nya dihitung
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Lapis <code className="font-mono text-[13.5px] text-seal">core</code>{" "}
            disusun ke bentuk kanonik lebih dulu: kunci objek diurutkan menaik,
            spasi dibuang, dan urutan larik dibiarkan apa adanya karena urutan
            larik memang bermakna. Hasilnya dilewatkan SHA-256.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Di sisi contract sifat urut itu datang dari{" "}
            <code className="font-mono text-[13.5px]">serde_json</code>, yang
            bersandar pada <code className="font-mono text-[13.5px]">BTreeMap</code>{" "}
            selama fitur <code className="font-mono text-[13.5px]">preserve_order</code>{" "}
            tidak dinyalakan. Aturan yang sama ditulis ulang dalam sepuluh baris
            di sini. Karena itu kedua sisi sampai pada digest yang sama, dan
            kesamaan itu sudah diuji lintas bahasa.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Identitas receipt diambil dari dua belas bita pertama digest-nya. Jadi
            seseorang yang mengubah isi lalu memperbaiki digest supaya konsisten
            tetap tertinggal jejak, sebab identitasnya tidak bisa ikut diperbaiki
            tanpa berubah menjadi identitas lain.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
