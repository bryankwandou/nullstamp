import Link from "next/link";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { Mechanism } from "@/components/mechanism";
import { Verifier } from "@/components/verifier";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="ns-grid absolute inset-0 -z-10 h-[560px]" />

        <div className="mx-auto max-w-6xl px-5 pt-20 pb-16 sm:pt-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[12px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-seal" />
              Built on the Terminal 3 ADK, live on T3N testnet
            </p>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-7 max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
              Your agent touches someone&rsquo;s personal data.
              <span className="block text-muted">Prove exactly what it used.</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
              Nullstamp issues a receipt for every call that touches a person&rsquo;s
              data: which fields were referenced, which host received them, under
              whose authorisation. The values never appear, because the code that
              writes the receipt never receives them.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#try"
                className="rounded-md bg-seal px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-seal-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
              >
                Check a real receipt
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-line px-5 py-2.5 text-[15px] transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
              >
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The deadlock */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            Agent audit trails today are caught between two failures
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal delay={60}>
            <article className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-denied">
                first failure
              </p>
              <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.01em]">
                A complete log stores raw personal data
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                Prompts and responses are kept verbatim so the trail stays intact.
                The compliance record then becomes a pile of personal data in its
                own right, and turns up as a finding in the next audit.
              </p>
            </article>
          </Reveal>

          <Reveal delay={120}>
            <article className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-pending">
                second failure
              </p>
              <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.01em]">
                A redacted log loses completeness
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                The sensitive parts are stripped out so the log is safe to keep.
                What remains cannot prove the trail is intact, so it does not
                answer the question an auditor is actually asking.
              </p>
            </article>
          </Reveal>
        </div>

        <Reveal delay={180}>
          <div className="mt-6 rounded-[10px] border border-seal/35 bg-seal-wash/60 p-6">
            <p className="text-[15px] leading-relaxed">
              EU AI Act Article 12 record-keeping obligations for high-risk systems
              take effect in August 2026, while GDPR requires data subjects to know
              which fields were used, when, and for what purpose. Those two demands
              fight each other for as long as the record is built the ordinary way.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Mechanism */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-wider text-seal">
            how it works
          </p>
          <h2 className="mt-3 max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            The third option comes from the shape of the system, not from policy
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
            T3N substitutes profile markers inside the enclave, after the contract
            has finished assembling the request. So the contract is not promising
            not to store those values. It never receives them.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10">
          <Mechanism />
        </Reveal>
      </section>

      {/* Verifier */}
      <section id="try" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-wider text-seal">
            try it yourself
          </p>
          <h2 className="mt-3 max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            A receipt only its issuer can check is not a receipt
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
            The receipt below was issued inside a TEE on T3N testnet and exported
            verbatim. Its digest is recomputed in your browser using Web Crypto,
            with no request to our servers. Edit it, or press one of the tamper
            buttons, and watch verification refuse it.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-8">
          <Verifier />
        </Reveal>
      </section>

      {/* Receipt contents */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="max-w-2xl text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            What gets recorded, and what never does
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal delay={60}>
            <div className="h-full rounded-[10px] border border-line bg-surface p-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-verified">
                recorded
              </p>
              <ul className="mt-4 space-y-2.5 text-[14.5px] leading-relaxed">
                {[
                  ["fields_used", "the field names referenced, sorted"],
                  ["target_host", "the host the call went to"],
                  ["request_body_sha256", "digest of the request body"],
                  ["response_code", "status returned by the upstream"],
                  ["subject_did", "the data owner whose session ran"],
                  ["issued_at_secs", "cluster clock, not the local machine"],
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
                never recorded
              </p>
              <ul className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-muted">
                <li>
                  Profile values. The contract emits only markers, and the host
                  substitutes them after the contract has finished.
                </li>
                <li>
                  The upstream response body. Only its digest is stored. Anything
                  you want pulled out has to be named explicitly, and that naming
                  is itself bound into the digest.
                </li>
                <li>
                  Upstream credentials. Their values are read inside the enclave
                  from a map only the contract can reach.
                </li>
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-faint">
                The declared field list is checked against the actual request body
                before any traffic leaves. Declaring two fields while the body
                references four is rejected, not recorded.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="rounded-[10px] border border-line bg-surface px-6 py-12 text-center">
            <Logo size={40} animate className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-xl text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              Compute it yourself, then compare
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              The contract, the onboarding scripts, and the standalone verifier are
              all in the repository, along with a report of the fourteen findings
              this build produced against the ADK.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/bryankwandou/nullstamp"
                className="rounded-md bg-seal px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-seal-strong"
              >
                Open the repository
              </a>
              <Link
                href="/findings"
                className="rounded-md border border-line px-5 py-2.5 text-[15px] transition-colors duration-150 hover:bg-bg"
              >
                Read the findings
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
