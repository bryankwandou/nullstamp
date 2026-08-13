import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Walkthrough — Nullstamp",
  description:
    "A 44-second walkthrough of Nullstamp: the problem, the mechanism, a live testnet receipt, and its digest recomputed outside the node.",
};

/**
 * The video lives here rather than only in the repository because GitHub serves
 * .mp4 from raw with `application/octet-stream` and `nosniff`, so a browser
 * downloads it instead of playing it. Served from our own origin it plays inline,
 * which is what a reviewer following a link expects.
 */
const SCENES: Array<[string, string]> = [
  ["0:00", "The problem: an agent touches personal data and cannot prove what it used"],
  ["0:03", "The deadlock — keeping everything, or redacting into uselessness"],
  ["0:09", "How it works: the contract never receives the values"],
  ["0:15", "A real receipt issued inside the enclave, contract 639"],
  ["0:22", "Its digest recomputed outside the node — and it matches"],
  ["0:29", "A tampered copy, refused"],
  ["0:34", "Fifteen findings, five of them blockers"],
  ["0:41", "Compute it yourself, then compare"],
];

export default function Walkthrough() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Walkthrough
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
          Forty-four seconds, eight scenes. Every number on screen is taken from the
          real testnet run recorded in the repository — none of it is illustrative.
        </p>
      </Reveal>

      <Reveal delay={70} className="mt-9">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <video
            controls
            preload="metadata"
            poster="/walkthrough-poster.png"
            className="block w-full"
          >
            <source src="/nullstamp-walkthrough.mp4" type="video/mp4" />
            Your browser cannot play this video. You can{" "}
            <a href="/nullstamp-walkthrough.mp4">download it directly</a> instead.
          </video>
        </div>
        <p className="mt-3 text-[13px] text-faint">
          1920×1080, 44 seconds, 4.5 MB. Also in the repository at{" "}
          <code className="font-mono text-[12.5px]">
            submission/video/nullstamp-walkthrough.mp4
          </code>
          .
        </p>
      </Reveal>

      <Reveal delay={140}>
        <section className="mt-14 max-w-2xl">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">
            What happens, and when
          </h2>
          <dl className="mt-5 space-y-3">
            {SCENES.map(([at, what]) => (
              <div key={at} className="flex gap-4">
                <dt className="w-12 shrink-0 font-mono text-[13.5px] text-seal">{at}</dt>
                <dd className="text-[15px] leading-relaxed text-muted">{what}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="mt-14 max-w-2xl">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">
            Do not take the video&rsquo;s word for it
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The scene at 0:22 is the one that matters, and it is the one you can check
            yourself. Open the{" "}
            <Link href="/verify" className="text-seal hover:underline">
              verifier
            </Link>{" "}
            and the same receipt&rsquo;s digest is recomputed in your own browser. Then
            try{" "}
            <Link
              href="/verify?tamper=hide-field"
              className="text-seal hover:underline"
            >
              hiding a field that was used
            </Link>{" "}
            and watch it be refused.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
