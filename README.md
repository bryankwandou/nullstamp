<p align="center">
  <img src="brand/logo-lockup.svg" alt="Nullstamp" width="230">
</p>

<p align="center">
  Verifiable receipts for agent calls that touch personal data.<br>
  Built on the Terminal 3 Agent Developer Kit, running on T3N testnet.
</p>

<p align="center">
  <a href="https://nullstamp.vercel.app">Live demo</a> ·
  <a href="https://nullstamp.vercel.app/verify">Verify a receipt</a> ·
  <a href="docs/BUGS.md">Findings report</a> ·
  <a href="docs/PROOF.md">Evidence</a>
</p>

---

## The problem

An agent that does real work has to touch someone's name, date of birth, and
email address. The ways we record that activity today are caught between two
failures.

Keep a complete log and you are storing raw personal data, which turns the
compliance record itself into a liability. Keep a redacted log and you lose
completeness, so you cannot prove the trail is intact when someone asks.

EU AI Act Article 12 record-keeping obligations for high-risk systems take effect
in August 2026, and GDPR requires data subjects to know which fields were used,
when, and for what purpose. Those two demands fight each other for as long as the
record is built the ordinary way.

## A third option

T3N breaks that deadlock through the shape of the system rather than through
policy. Outbound calls go through `http-with-placeholders`: the request body
carries only `{{profile.<field>}}` markers, and the host substitutes them inside
the enclave, after the contract has finished assembling the request.

So the contract genuinely never holds the values. It is not promising not to store
them — it never receives them.

Nullstamp uses that property to issue receipts. Each issuance records the field
names referenced, the destination host, a digest of the request body, the response
status, and the time. Those claims are bound by one SHA-256 digest, and that
digest is planted in the transaction's Merkle leaf via
`kv-store.set-claims-digest`.

The consequence is that the receipt can be recomputed outside the node. That is
demonstrated, not asserted: a receipt issued inside the enclave on testnet was
exported and checked by a separate TypeScript program with no SDK and no network
access, and the digests match exactly. See [docs/PROOF.md](docs/PROOF.md).

## What a receipt records

| Recorded | Never recorded |
|---|---|
| `fields_used` — field names, sorted | The field values |
| `target_host` — where the call went | The upstream response body (only its digest) |
| `request_body_sha256` | Upstream credentials |
| `response_code` | |
| `subject_did`, `tenant_did` | |
| `issued_at_secs`, `seq_no` — from the cluster clock | |

One design decision is worth calling out. The declared field list is checked
against the actual request body **before** any traffic leaves. Declaring two
fields while the body references four is rejected, not recorded. Without that
rule a receipt could understate its own scope, and a receipt that can shrink its
own footprint is worthless.

## Repository layout

```
contract/z-tenant-nullstamp/   TEE contract, Rust compiled to a WASM component
  src/canon.rs                 marker parsing, canonical form, digest
  src/receipt.rs               receipt shape and sealing
  src/issue.rs                 issue-receipt
  src/verify.rs                verify-receipt
  src/list.rs                  list-receipts
  examples/sample_receipt.rs   prints a sample for cross-language testing

scripts/src/                   onboarding and management steps
  preflight.ts                 checks that run without a developer key
  01-quickstart.ts             handshake and authentication
  02-claim-tenant.ts           tenant admission (undocumented step, see T-04)
  03-register-contract.ts      WASM registration
  04-create-maps.ts            KV map creation with ACLs
  04b-sync-map-acl.ts          re-point ACLs after re-registration (see T-13)
  05-seed-secret.ts            credential seeding
  06-grant-agent.ts            authorization grant
  07-issue-receipt.ts          issue a receipt
  08-verify-receipt.ts         verify inside the enclave
  09-list-receipts.ts          read the trail
  10-contract-logs.ts          read the contract's own log
  11-export-receipt.ts         export a live receipt to a file
  verify-offline.ts            standalone verifier: no SDK, no network

web/                           landing page and browser verifier
docs/BUGS.md                   fourteen onboarding findings
docs/PROOF.md                  verbatim output from every step run
brand/                         mark, lockup, and brand guidelines
```

## Running it

Requirements: Node.js 20 or newer, Rust with the `wasm32-wasip2` target, and
`wasm-tools`.

```bash
# 1. build the contract
cd contract/z-tenant-nullstamp
rustup target add wasm32-wasip2
cargo test --target "$(rustc -vV | sed -n 's/^host: //p')"
cargo build --target wasm32-wasip2 --release
wasm-tools component wit target/wasm32-wasip2/release/z_tenant_nullstamp.wasm

# 2. check the environment — no developer key needed yet
cd ../../scripts
npm install
npm run preflight

# 3. prove the digest can be recomputed outside the node
cd ../contract/z-tenant-nullstamp
cargo run --example sample_receipt > ../../submission/sample-receipt.json
cd ../../scripts
npm run verify:offline -- ../submission/sample-receipt.json
```

For the steps that touch testnet you need a developer key from
<https://go.terminal3.io/adk-community>. It is shown once and cannot be retrieved
again, so copy it immediately.

```bash
cd scripts
cp .env.example .env      # set T3N_API_KEY
npm run step:01           # through step:11
```

## Notes for the Terminal 3 team

Fourteen findings with reproduction steps are in [docs/BUGS.md](docs/BUGS.md),
ordered by weight. The four that came out of actually running a contract on
testnet are the ones I would read first, because none of them are discoverable
from the documentation:

- **T-11** — `tenant.claim()` answers HTTP 500 on an already-provisioned tenant,
  rather than reporting `already-admitted`. Two request ids included.
- **T-12** — importing `signing@2.1.0` makes the contract fail to instantiate.
  Registration succeeds, then every call returns an opaque 500 with an empty
  contract log, including calls to functions that never touch signing.
- **T-13** — contract ids are minted per registration and map ACLs bind to the
  id, so every re-register silently invalidates every map ACL.
- **T-14** — `kv-store.scan` returns raw CAS pointer envelopes (`T3VR` magic)
  where `kv-store.get` resolves them, with no error and no mention in the WIT.

Also, the first code sample on the Quickstart cannot run as written:
`trustAnchor` is required on `T3nClientConfig` and `T3nConfigError` is thrown in
the constructor before any network traffic. The same sample appears on the claim
page.

And one proposal: `set-claims-digest` deserves a page of its own. Its WIT comment
says the digest is planted in the Merkle leaf "so clients can verify receipts
offline" — which answers the hardest question about confidential computing, and
no ADK page discusses it. This project is built on that capability and the result
holds up.

## License

MIT.
