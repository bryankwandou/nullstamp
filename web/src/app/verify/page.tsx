import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { Verifier } from "@/components/verifier";

export const metadata: Metadata = {
  title: "Verify a receipt — Nullstamp",
  description:
    "Recompute the digest of a Nullstamp receipt in your own browser, with no network request.",
};

export default function Verify() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Verify a receipt
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
          Paste a Nullstamp receipt and its digest is recomputed here using Web
          Crypto. No part of what you paste is sent anywhere.
        </p>
      </Reveal>

      <Reveal delay={70} className="mt-9">
        <Verifier />
      </Reveal>

      <Reveal delay={140}>
        <section className="mt-14 max-w-2xl">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">
            How the digest is computed
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The <code className="font-mono text-[13.5px] text-seal">core</code>{" "}
            layer is rendered into a canonical form first: object keys sorted
            ascending, whitespace dropped, and array order left alone because array
            order carries meaning. That string is then hashed with SHA-256.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            On the contract side the ordering comes from{" "}
            <code className="font-mono text-[13.5px]">serde_json</code>, which rests
            on <code className="font-mono text-[13.5px]">BTreeMap</code> as long as
            the <code className="font-mono text-[13.5px]">preserve_order</code>{" "}
            feature is off. The same rule is rewritten in ten lines here. That is
            why both sides land on the same digest, and the equivalence has been
            tested across languages against a live testnet receipt.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The receipt identity is the first twelve bytes of its digest. So anyone
            who edits the content and then repairs the digest to agree still leaves
            a trace, because the identity cannot be repaired without becoming a
            different identity.
          </p>

          <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.015em]">
            Checking one from the command line
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The same check runs without a browser, and without the SDK. It exits 0
            for a valid receipt and 1 for a tampered one, so it drops into CI as is.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-surface px-4 py-3">
            <code className="font-mono text-[12.5px] leading-relaxed text-ink">
              {`git clone https://github.com/bryankwandou/nullstamp
cd nullstamp/scripts && npm install
npm run verify:offline -- ../submission/live-receipt.json`}
            </code>
          </pre>
        </section>
      </Reveal>
    </div>
  );
}
