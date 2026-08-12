import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <Logo size={22} />
              <span className="text-[16px] font-semibold tracking-[-0.02em]">
                nullstamp
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Dibangun di atas Terminal 3 Agent Developer Kit. Bukti yang
              diterbitkan bisa dihitung ulang tanpa bantuan kami.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[14px]">
            <Link href="/verifikasi" className="text-muted transition-colors hover:text-ink">
              Verifikasi receipt
            </Link>
            <Link href="/temuan" className="text-muted transition-colors hover:text-ink">
              Laporan temuan
            </Link>
            <a
              href="https://docs.terminal3.io/developers/adk/overview/what-is-adk"
              className="text-muted transition-colors hover:text-ink"
            >
              Docs T3 ADK
            </a>
            <a
              href="https://github.com/bryankwandou/nullstamp"
              className="text-muted transition-colors hover:text-ink"
            >
              Repositori
            </a>
          </div>
        </div>

        <p className="mt-10 font-mono text-[12px] text-faint">
          MIT. Contract z:tenant-nullstamp@0.1.0.
        </p>
      </div>
    </footer>
  );
}
