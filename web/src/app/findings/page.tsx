import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "T3 ADK onboarding findings — Nullstamp",
  description:
    "Fifteen findings from completing the Terminal 3 ADK Quickstart and Walkthrough and running a contract on testnet, with evidence and reproduction steps.",
};

type Weight = "blocker" | "confusing" | "time sink" | "proposal";

const COLOR: Record<Weight, string> = {
  blocker: "text-denied border-denied/40 bg-denied/5",
  confusing: "text-pending border-pending/40 bg-pending/5",
  "time sink": "text-muted border-line bg-surface",
  proposal: "text-seal border-seal/40 bg-seal-wash/60",
};

const FINDINGS: Array<{
  id: string;
  weight: Weight;
  title: string;
  body: string;
  evidence?: string;
  fromTestnet?: boolean;
}> = [
  {
    id: "T-12",
    weight: "blocker",
    fromTestnet: true,
    title: "Importing signing@2.1.0 silently kills the contract",
    body: "The interface is declared in host-interfaces-2.1.0 at line 159 with nothing marking it unavailable to tenant contracts. A contract that imports it registers successfully, then every call fails with an opaque 500 — including calls to functions that never touch signing. The contract log stays empty, because the contract never starts. Removing that one import turned the 500 into a precise, useful error. This cost more time than anything else in the exercise.",
    evidence: "RPC Error: Internal error [754f19f6-b496-4f2d-b475-add668c7d85e]\ncontracts.logs -> { \"entries\": [], \"next_seq\": null }",
  },
  {
    id: "T-11",
    weight: "blocker",
    fromTestnet: true,
    title: "tenant.claim() returns HTTP 500 on an already-provisioned tenant",
    body: "The SSO claim page already creates the tenant row and credits the account. Calling claim() afterwards does not report that state, it fails — twice, with two request ids. Meanwhile every read against the same tenant succeeds and reports status active with 19.9 billion credits available. The response shape implies the call is meant to be idempotent, so a setup script that trusts that gets blocked on a step already finished.",
    evidence: "RPC Error: Internal error [28113ed7-3a9d-45ef-98b8-b664fd9eb421]\nRPC Error: Internal error [d8dbb69a-758f-4a4a-a67e-1e52b2f4b742]",
  },
  {
    id: "T-01",
    weight: "blocker",
    title: "The first code sample in the Quickstart cannot run",
    body: "It constructs T3nClient without trustAnchor. That field is required, and T3nConfigError is thrown in the constructor before any network traffic. A new developer stops at step one with no hint that the sample itself is wrong. The same defective sample appears on the claim page, so it exists on two surfaces.",
    evidence: "trustAnchor: TrustAnchorOrUnsafe;   // no `?` — required",
  },
  {
    id: "T-02",
    weight: "blocker",
    title: "The handler set in the Quickstart is incomplete for the handshake",
    body: "The sample passes EthSign alone. The SDK exports createDefaultHandlers, whose own doc comment describes it as the set the handshake requires, supplying the ML-KEM key handler and the randomness source as well.",
  },
  {
    id: "T-03",
    weight: "blocker",
    title: "The docs contradict the WIT and the official reference repo",
    body: "The common-errors page states tenant_did() is already a string. The WIT returns list<u8> — twenty raw bytes — and the official reference repo hex-encodes it. The Walkthrough sample therefore does not compile. Worse than a typo, because map names derive from the DID: get the encoding wrong and every later KV call addresses a map that does not exist.",
    evidence: "tenant-did: func() -> list<u8>;   // host:tenant@1.0.0",
  },
  {
    id: "T-13",
    weight: "confusing",
    fromTestnet: true,
    title: "Re-registering a contract invalidates every map ACL, silently",
    body: "Map ACLs bind to the numeric contract id, not the contract name, and every registration mints a new id. So any code change silently breaks every map the contract depends on. Across this exercise the same contract held ids 615, 617, 618, 619, 620, and 621 — not even contiguous, so unpredictable. maps.update fixes it and appears in no documentation page. Credit where due: the error message itself is the clearest one I saw all day.",
    evidence: 'access denied: TenantContract(did:t3n:f21dce…/617)\n  cannot read map "z:f21dce…:receipts"',
  },
  {
    id: "T-14",
    weight: "confusing",
    fromTestnet: true,
    title: "kv-store.scan returns raw CAS pointers where get resolves them",
    body: "Values large enough to be offloaded to content-addressed storage come back from scan as a pointer envelope: the ASCII magic T3VR followed by JSON holding a value_cid. get on the same key resolves the pointer and returns the original bytes. The WIT signature promises key/value pairs and says nothing about this, and the host raises no error — scan succeeds and the bytes are simply the wrong bytes. Proved with two functions of the same deployment reading the same row.",
    evidence: 'T3VR{"value_cid":[26,27,193,186,180,45,202,168,81,195,32,170,…',
  },
  {
    id: "T-15",
    weight: "confusing",
    fromTestnet: true,
    title: "The credit grant is spent far faster than the claim page implies",
    body: "The claim page advertises the 20,000 test credit grant as enough for 25 agents and ~5,000 protected actions. In practice this exercise exhausted it completely with ten contract registrations and about a dozen calls. Note the shape of the numbers: one contract execution asks to lock 10,000,000,000 against a total grant of 20,000,000,000, so on the face of it the whole allowance covers two concurrent calls. Nothing warns you as the balance falls, and the failure arrives as a hard stop mid-pipeline. It compounds with T-13, because iterating on a contract forces the re-registrations that drain the grant.",
    evidence:
      "InsufficientCredit (account=f21dce79…, required=10000000000, available=0)\n[824ac0e3-0a2d-4d4a-b1d4-d1733f9e28a4]\n\nBalance readings: 19,989,922,328 → 19,939,779,025 → 8,078,980,220 → 3,502,747,402 → 0",
  },
  {
    id: "T-04",
    weight: "confusing",
    title: "The tenant claim step is not documented anywhere",
    body: "tenant.claim() exists in the SDK as the self-serve path on testnet, including the test-credit grant. Neither the Quickstart nor the Walkthrough mentions it, and the failure surfaces much later, at maps.create.",
  },
  {
    id: "T-05",
    weight: "confusing",
    title: "The documented order cannot be followed to completion",
    body: "The maps.create example uses contractId without saying where it comes from. The only source is the result of contracts.register, which the Walkthrough sequences after map creation. Following the page in order leaves you holding a placeholder for a value you cannot have yet.",
  },
  {
    id: "T-06",
    weight: "confusing",
    title: "Installing the SDK reports a critical vulnerability",
    body: "A fresh install in an empty project reports four advisories, one critical: a Zip Slip in decompress reached through jco, componentize-js, weval. A fix is available upstream. Not blocking, but it is the first thing a security reviewer at an adopting company will see.",
    evidence: "4 vulnerabilities (3 moderate, 1 critical)",
  },
  {
    id: "T-07",
    weight: "time sink",
    title: "Useful SDK surface is absent from the docs",
    body: "contracts.logs, maps.entrySet, maps.entryGet, maps.getStatus, and maps.update all exist and work, and none appear on any documentation page. contracts.logs is the sharpest omission — it is the first tool you want when a call fails opaquely, and its empty output was the evidence that cracked T-12.",
  },
  {
    id: "T-08",
    weight: "time sink",
    title: "The error-handling example swallows the two variants that matter most",
    body: "format_http_error ends in a catch-all arm, collapsing PlaceholderDenied and PlaceholderNoUserContext into a bare error. The WIT comments explain the distinction is deliberate: one means the marker is not permitted, the other means there is no user session to resolve against. Those call for completely different fixes.",
  },
  {
    id: "T-09",
    weight: "time sink",
    title: "Broken links and an empty page",
    body: "Two URLs linked from the docs index return 404. The payroll-agent example page resolves but carries no explanation, only links out.",
  },
  {
    id: "T-10",
    weight: "time sink",
    title: "Version numbers in the reference repo disagree",
    body: "world.wit says 0.4.0 while Cargo.toml and CONTRACT_VERSION say 0.4.1, and a test name still refers to the older version. Confusing at exactly the wrong spot, since the version must increase on every re-registration.",
  },
  {
    id: "U-01",
    weight: "proposal",
    title: "set-claims-digest deserves a page of its own",
    body: "Its WIT comment says the digest is planted in the Merkle leaf so clients can verify receipts offline. That sentence answers the hardest question about confidential computing — how anyone outside can check work performed somewhere they cannot see — and no ADK page discusses it. This project is built on that capability and the result holds up under an independent verifier. Give it a page with a worked canonical-form example, and the pitch changes from trust the enclave to compute it yourself and compare.",
  },
];

export default function Findings() {
  const count = (w: Weight) => FINDINGS.filter((f) => f.weight === w).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Reveal>
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Onboarding findings
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-muted">
          Collected while completing the Terminal 3 ADK Quickstart and Walkthrough
          on 12 August 2026, then extended while running a second contract end to end
          against the live testnet, until the credit grant ran out. Every finding has evidence you can check:
          a file and line in the published SDK, the vendored WIT in the official
          reference repo, or verbatim output including the request id the docs ask
          for.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 font-mono text-[12px]">
          <span className="rounded-full border border-denied/40 bg-denied/5 px-2.5 py-1 text-denied">
            {count("blocker")} blockers
          </span>
          <span className="rounded-full border border-pending/40 bg-pending/5 px-2.5 py-1 text-pending">
            {count("confusing")} confusing
          </span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-muted">
            {count("time sink")} time sinks
          </span>
          <span className="rounded-full border border-seal/40 bg-seal-wash/60 px-2.5 py-1 text-seal">
            {count("proposal")} proposal
          </span>
        </div>
        <p className="mt-6 rounded-[10px] border border-seal/35 bg-seal-wash/60 px-5 py-4 text-[14.5px] leading-relaxed">
          The five marked <span className="font-medium">from testnet</span> only
          surfaced by running a contract against the live network. None of them are
          discoverable by reading the documentation, and they are the ones I would
          read first.
        </p>
      </Reveal>

      <div className="mt-12 space-y-4">
        {FINDINGS.map((f, i) => (
          <Reveal key={f.id} delay={Math.min(i * 30, 210)}>
            <article className="rounded-[10px] border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center gap-3">
                <code className="font-mono text-[13px] text-faint">{f.id}</code>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${COLOR[f.weight]}`}
                >
                  {f.weight}
                </span>
                {f.fromTestnet && (
                  <span className="rounded-full border border-seal/40 bg-seal-wash/60 px-2.5 py-0.5 font-mono text-[11px] text-seal">
                    from testnet
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-[18.5px] font-semibold leading-snug tracking-[-0.01em]">
                {f.title}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{f.body}</p>
              {f.evidence && (
                <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-bg px-3.5 py-2.5">
                  <code className="font-mono text-[12.5px] leading-relaxed text-ink">
                    {f.evidence}
                  </code>
                </pre>
              )}
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-12 rounded-[10px] border border-line bg-surface p-6 text-[14.5px] leading-relaxed text-muted">
          Full text with verbatim quotes, suggested fixes, and reproduction steps
          for every finding is in{" "}
          <a
            href="https://github.com/bryankwandou/nullstamp/blob/main/docs/BUGS.md"
            className="text-seal underline decoration-seal/30 underline-offset-2 hover:decoration-seal"
          >
            docs/BUGS.md
          </a>
          . The verbatim output of every step that was run is in{" "}
          <a
            href="https://github.com/bryankwandou/nullstamp/blob/main/docs/PROOF.md"
            className="text-seal underline decoration-seal/30 underline-offset-2 hover:decoration-seal"
          >
            docs/PROOF.md
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
