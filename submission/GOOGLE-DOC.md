# Terminal 3 ADK — Testnet Onboarding Report and Use Case

**Submitted by:** Bryan Kwandou
**Date:** 12 August 2026
**Tenant DID:** `did:t3n:f21dce7928980eeea7dc93618b91f602a80fe1c4`

| | |
|---|---|
| Public repository | https://github.com/bryankwandou/nullstamp |
| Live demo | https://nullstamp.vercel.app |
| Browser verifier | https://nullstamp.vercel.app/verify |
| Findings report | https://nullstamp.vercel.app/findings |
| Findings, full text | https://github.com/bryankwandou/nullstamp/blob/main/docs/BUGS.md |
| Evidence, verbatim output | https://github.com/bryankwandou/nullstamp/blob/main/docs/PROOF.md |

> **How to use this file:** paste the whole thing into a new Google Doc, set
> sharing to "Anyone with the link — Viewer", then drop screenshots at the marked
> points. Square brackets mark image slots.

---

## 1. Summary

The brief asked for four things: complete the Quickstart, complete the
Walkthrough, report the bugs encountered, and as a bonus propose an initial use
case beyond the first contract.

All four are done, and the bonus is not a proposal — it is a second TEE contract
running on testnet.

**Fourteen findings** are documented with reproduction steps. Five block a new
developer outright. Four of the fourteen were only discoverable by running a
contract against the live network, and I would rank those as the most useful
material in this submission:

- `tenant.claim()` returns HTTP 500 on a tenant the SSO page already provisioned
- importing `signing@2.1.0` makes any contract fail to instantiate, with an
  opaque 500 and an empty contract log
- every contract re-registration silently invalidates every map ACL
- `kv-store.scan` hands back raw CAS pointers where `kv-store.get` resolves them

The use case, **Nullstamp**, issues verifiable receipts for agent calls that touch
personal data. Its central claim — that a receipt can be recomputed by anyone
outside the node — is demonstrated with a live receipt and an independent
verifier, not asserted.

## 2. Identity and environment

| Item | Value |
|---|---|
| Tenant DID | `did:t3n:f21dce7928980eeea7dc93618b91f602a80fe1c4` |
| Derived Eth address | `0xcbdf0480addeacbe6e7b27154585db65ad249379` |
| Environment | `sandbox` (same node as `testnet`) |
| Node | `https://cn-api.sg.testnet.t3n.terminal3.io` |
| Operator manifest | signed `2026-08-11T14:14:45Z`, 3 peers, 1 RTMR3 measurement |
| Credits granted | 20,000 (`available: 3502747402` after repeated registrations) |
| Contract | `z:f21dce7928980eeea7dc93618b91f602a80fe1c4:nullstamp` |
| Contract ids used | 615, 617, 618, 619, 620, 621, 638, 639 — one per registration (finding T-13) |
| SDK | `@terminal3/t3n-sdk@4.35.1` |
| Rust | 1.89.0, target `wasm32-wasip2` |
| wasm-tools | 1.255.0 |
| Node.js | 24.13.0 |
| OS | Windows 11 (10.0.26200) |

The API key is not reproduced in this document and never entered the repository's
git history.

**[Screenshot 1: the claim page showing the DID, with the API key redacted]**

## 3. Development environment

```
rustup target add wasm32-wasip2
cargo install wasm-tools
npm install @terminal3/t3n-sdk
```

The docs' note that `cargo install wasm-tools` compiles around a hundred crates
with no progress output is accurate and helpful.

Not mentioned: the SDK install reports four security advisories, one of them
critical. Finding T-06.

Before touching the network I wrote a preflight check that runs **without** a
developer key, so that environment failures could be told apart from service
failures. It verifies tool versions, the WASM file, node reachability, the
operator manifest signature, and the SDK crypto component. All checks pass.

**[Screenshot 2: `npm run preflight`, all checks passing]**

## 4. Quickstart

The first code sample on the Quickstart page cannot run as written. Two causes,
both forced by the SDK's own types:

1. `T3nClientConfig.trustAnchor` is required, and `T3nConfigError` is thrown in
   the constructor before any network traffic occurs.
2. The handshake needs the full handler set from `createDefaultHandlers`, not
   `EthSign` alone.

The same defective sample appears on the claim page at
`go.terminal3.io/adk-community`, so it exists on two surfaces.

The form that works:

```ts
setEnvironment("testnet");
const nodeUrl = getNodeUrl();
const trustAnchor = await fetchTrustedManifest("testnet");
const wasmComponent = await loadWasmComponent();
const ethAddress = eth_get_address(apiKey);

const t3n = new T3nClient({
  wasmComponent,
  baseUrl: nodeUrl,
  trustAnchor,
  handlers: {
    ...createDefaultHandlers(nodeUrl, trustAnchor),
    EthSign: metamask_sign(ethAddress, undefined, apiKey),
  },
});

await t3n.handshake();
const did = await t3n.authenticate(createEthAuthInput(ethAddress));
```

Result — and note that the DID returned by the server matches the claim page
character for character, which confirms the whole derivation path:

```
environment: sandbox
anchor verified — 3 peers, 1 RTMR3 measurement
eth address: 0xcbdf0480addeacbe6e7b27154585db65ad249379
tenant DID : did:t3n:f21dce7928980eeea7dc93618b91f602a80fe1c4
```

**[Screenshot 3: `npm run step:01`]**

## 5. Tenant state — and the first server-side bug

`tenant.claim()` fails against a tenant the SSO page has already provisioned:

```
RPC Error: Internal error [28113ed7-3a9d-45ef-98b8-b664fd9eb421]
RPC Error: Internal error [d8dbb69a-758f-4a4a-a67e-1e52b2f4b742]
```

Two attempts, two request ids. The docs' guidance for a generic 500 is to retry
once and then report, which is what I did.

Meanwhile every read against the same tenant succeeds:

```
tenant.me()      -> { "status": "active", "label": "testnet-dev", ... }
getBalance()     -> { "available": 19989922328, "reserved": 0 }
contracts.list() -> []
```

This is finding T-11. The response shape implies the call is meant to be
idempotent — an `already-admitted` status with null credits — so a setup script
that trusts that is blocked on a step that was already complete.

My step 02 now reads `tenant.me()` first and only claims when the status is not
`active`.

**[Screenshot 4: `npm run step:02` and the diagnostic showing the 500 with its request ids]**

## 6. Walkthrough — reading the first contract

I cloned `Terminal-3/z-tenant-flight` and read it through, including the vendored
WIT. Two things stood out.

`tenant-did` returns `list<u8>` — twenty raw bytes — and the reference repo encodes
it with `hex::encode` before building a map name. The common-errors page states
the opposite, so the Walkthrough sample does not compile. Finding T-03. This one
matters more than a typo because map names derive from the DID; get the encoding
wrong and every later KV call addresses a map that does not exist.

Second, `host:interfaces@2.1.0` contains considerably more capability than the
docs cover — `signing`, `clock`, `contracts-call`, `token`, and most interestingly
`kv-store.set-claims-digest`. That last one became the foundation of this project.

## 7. Walkthrough — a second contract, beyond the provided example

This section answers the bonus.

### The problem

An agent doing real work has to touch personal data. Recording that activity is
caught between two failures: a complete log stores raw personal data and becomes a
liability itself, while a redacted log loses completeness and cannot prove the
trail is intact.

EU AI Act Article 12 record-keeping for high-risk systems takes effect August 2026.
GDPR requires data subjects to know which fields were used, when, and why. Those
demands fight each other for as long as the record is built the ordinary way.

### Why T3N specifically

Because `http-with-placeholders` makes the answer structural rather than a matter
of policy. The contract emits markers; the host substitutes them inside the
enclave after the contract has finished. The contract is not promising not to
store the values — it never receives them.

### The contract

`z:tenant-nullstamp`, three functions:

- `issue-receipt` — perform an outbound call, then issue a receipt covering it
- `verify-receipt` — recompute a stored receipt's digest and compare
- `list-receipts` — read the trail, with a continuation point at the limit

What a receipt records: field names referenced, destination host, request body
digest, upstream status code, subject DID, cluster time, and sequence number. What
it never records: field values, the response body, and credentials.

All of it is bound by one SHA-256 digest, planted in the transaction's Merkle leaf
through `set-claims-digest`.

### Two design decisions worth stating

The declared field list is checked against the actual request body **before** any
byte leaves. Declaring two fields while the body references four is rejected, not
recorded. Without that rule a receipt could understate its own scope, and a
receipt that can shrink its own footprint is worthless.

Plain `http` is deliberately not imported. Nullstamp has exactly one way out, so
no path inside the contract can send data without passing through host-side marker
resolution.

### Build results

```
cargo test    -> 53 passed, 0 failed; plus 1 doc-test
cargo build   -> 254047 bytes, no warnings
wasm-tools    -> valid component; imports narrow to 4 host interfaces
```

**[Screenshot 5: `cargo test` output]**
**[Screenshot 6: `wasm-tools component wit` output]**

## 8. The bug that cost the most time

Registration of version 0.1.0 succeeded and returned contract id 615. Then every
call to it failed:

```
RPC Error: Internal error [754f19f6-b496-4f2d-b475-add668c7d85e]
```

Three properties made this hard to attribute:

1. Registration succeeded — the rejection happens later, at instantiation.
2. `contracts.logs` returned `{"entries": []}`. The contract never starts, so it
   cannot log anything about its own failure.
3. `list-receipts`, which only scans a KV map and touches no HTTP and no signing,
   failed identically.

So the signal pointed nowhere near the cause. I bisected by removing imported
interfaces one at a time.

The cause was `host:interfaces/signing@2.1.0`. It is declared in
`host-interfaces-2.1.0/package.wit` at line 159 with nothing marking it
unavailable to tenant contracts. Removing that single import — changing nothing
else — turned the opaque 500 into a precise, genuinely excellent error:

```
access denied: TenantContract(did:t3n:f21dce…/617) cannot read map "z:f21dce…:receipts"
```

That is finding T-12, and my suggested fix is to reject the *registration* when
the world imports an interface the tenant runtime does not provide, naming the
interface in the error.

The new error then revealed finding T-13: contract ids are minted per
registration and map ACLs bind to the id, so re-registering silently invalidates
every ACL. Across this exercise the same contract held ids 615, 617, 618, 619,
and 620. `maps.update` fixes it and appears in no documentation page.

**[Screenshot 7: the opaque 500 with an empty contract log, next to the precise error after removing signing]**

## 9. A receipt issued inside the enclave

```
target        : https://postman-echo.com/post
declared      : first_name, last_name
body sent     : {"reason":"nullstamp_demo",
                 "first_name":"{{profile.first_name}}",
                 "last_name":"{{profile.last_name}}"}

{
  "core": {
    "contract_id": 639,
    "contract_version": "0.1.7",
    "fields_used": [ "first_name", "last_name" ],
    "issued_at_secs": 1786554217,
    "method": "POST",
    "request_body_sha256": "26e5ee62768086e9213455818dbc5d17b41356f41f3d36ac92979a9059cffc6b",
    "response_body_sha256": "af8e3bce0cd50618030d03a18241046b5b8c8e41c173b6400eb754568a8528f2",
    "response_code": 200,
    "seq_no": 114186,
    "target_host": "postman-echo.com",
    ...
  },
  "digest_sha256": "8fb056c99bbea7e655d72075e37e428c8fbaade3c79b32fb737a6c4bef82e4d3",
  "receipt_id": "rcpt_8fb056c99bbea7e655d72075"
}
```

`response_code` 200 means the call genuinely left the enclave and reached the
upstream. `seq_no` and `issued_at_secs` come from the cluster. And `core` lists
only field **names** — the values are absent and cannot be present.

Verification inside the enclave:

```
{ "valid": true, "receipt_id": "rcpt_8fb056c99bbea7e655d72075", "reason": null }
```

The contract's own log, which names the field count and never the values:

```
"nullstamp: calling POST postman-echo.com for peragaan_penerbitan_bukti with 2 profile fields"
"nullstamp: receipt rcpt_8fb056c99bbea7e655d72075 issued, upstream status 200"
```

**[Screenshot 8: `npm run step:07` full receipt]**
**[Screenshot 9: `npm run step:08`, `step:09`, `step:10`]**

## 10. Getting the trail to work exposed a fourth bug

`list-receipts` returned rows whose values would not parse. From inside the
contract I dumped the first bytes:

```
543356527b2276616c75655f636964223a5b32362c32372c...
T3VR{"value_cid":[26,27,193,186,180,45,202,168,81,195,32,170,0,2
```

Values large enough to be offloaded to content-addressed storage are replaced by a
pointer envelope: ASCII magic `T3VR` followed by JSON containing a `value_cid`.

`kv-store.get` resolves that pointer transparently. `kv-store.scan` does not. I
proved the asymmetry with two functions of the same deployment reading the same
row: `verify-receipt` reads via `get` and returns `valid: true`, while
`list-receipts` reads via `scan` and gets 311 bytes of pointer.

The WIT signature promises key/value pairs and says nothing about this. The host
raises no error — `scan` succeeds and the bytes are simply the wrong bytes.
Finding T-14.

## 11. The central claim, demonstrated

A receipt that only its issuer can check is not a receipt. So the digest is
computed over a canonical form: object keys ascending, no whitespace, array order
preserved.

I exported the live receipt above and checked it with a separate TypeScript
program that imports no SDK, opens no session, and makes no network request:

```
receipt_id      : rcpt_8fb056c99bbea7e655d72075
digest recorded : 8fb056c99bbea7e655d72075e37e428c8fbaade3c79b32fb737a6c4bef82e4d3
digest computed : 8fb056c99bbea7e655d72075e37e428c8fbaade3c79b32fb737a6c4bef82e4d3

RESULT: valid. Digest recomputed outside the node and it matches.
```

The reverse direction is tested too. Hiding a field that was actually used, and
swapping the destination host, are both caught. The careful version of the attack —
editing the content and repairing the digest so it agrees — is also caught,
because the receipt id derives from the digest and cannot be repaired without
becoming a different id.

Anyone can run the same check at https://nullstamp.vercel.app/verify, in the
browser via Web Crypto, with no request to us. There are buttons to tamper with
the receipt yourself and watch verification refuse it.

**[Screenshot 10: browser verifier, valid state]**
**[Screenshot 11: browser verifier after tampering, invalid state]**

## 12. All fourteen findings

Full text with verbatim quotes and reproduction steps:
https://github.com/bryankwandou/nullstamp/blob/main/docs/BUGS.md

| ID | Weight | Summary |
|---|---|---|
| T-01 | blocker | First Quickstart sample cannot run: `trustAnchor` is required and throws in the constructor. Same defect on the claim page |
| T-02 | blocker | Quickstart handler set incomplete for the handshake; `createDefaultHandlers` is never mentioned |
| T-03 | blocker | Docs say `tenant_did()` is a string; WIT returns `list<u8>` and the reference repo hex-encodes it. Walkthrough sample does not compile |
| T-11 | blocker | `tenant.claim()` returns 500 on an already-provisioned tenant instead of `already-admitted`. Two request ids supplied |
| T-12 | blocker | Importing `signing@2.1.0` makes the contract fail to instantiate. Registration succeeds; every call then returns an opaque 500 with an empty contract log |
| T-13 | confusing | Contract ids are per registration and map ACLs bind to the id, so every re-register silently invalidates every ACL |
| T-14 | confusing | `kv-store.scan` returns raw `T3VR` CAS pointers where `get` resolves them; no error, not in the WIT |
| T-04 | confusing | The tenant claim step is not documented anywhere |
| T-05 | confusing | `maps.create` needs a `contractId` that only exists after registration, which the Walkthrough sequences later |
| T-06 | confusing | SDK install reports 4 advisories, 1 critical (Zip Slip in `decompress` via `jco`) |
| T-07 | time sink | `contracts.logs`, `maps.entrySet`, `maps.entryGet`, `maps.getStatus`, `maps.update` appear in no documentation page |
| T-08 | time sink | Error-handling sample's catch-all arm collapses `PlaceholderDenied` and `PlaceholderNoUserContext`, whose distinction the WIT calls deliberate |
| T-09 | time sink | Two doc URLs return 404; the payroll example page has no content |
| T-10 | time sink | Reference repo version numbers disagree across `world.wit`, `Cargo.toml`, and a test name |

Worth saying plainly: when the contract actually runs, the error messages are
very good. The access-denied message names the principal, the id, the map, and
the operation — it was the clearest error I saw all day. The problem is
concentrated in the cases where the contract never starts, where the message
degrades to `Internal error` and the log is empty.

## 13. One proposal

`kv-store.set-claims-digest` deserves a documentation page of its own.

Its WIT comment says the digest is planted in the Merkle leaf "so clients can
verify receipts offline." That sentence answers the hardest question about
confidential computing: how can anyone outside check work performed somewhere they
cannot see? No ADK page discusses it.

This project is built on that capability, and the result holds up under an
independent verifier. Give it a page with a worked canonical-form example, and the
pitch for T3N changes from "trust the enclave" to "compute it yourself and
compare." That is a materially stronger claim, and the machinery already ships.

## 14. Reproducing everything

```bash
git clone https://github.com/bryankwandou/nullstamp
cd nullstamp/contract/z-tenant-nullstamp
cargo test --target "$(rustc -vV | sed -n 's/^host: //p')"
cargo build --target wasm32-wasip2 --release
wasm-tools component wit target/wasm32-wasip2/release/z_tenant_nullstamp.wasm

cd ../../scripts
npm install
npm run preflight                    # no developer key needed

cp .env.example .env                 # set T3N_API_KEY
npm run step:01                      # through step:11
npm run verify:offline -- ../submission/live-receipt.json
```

## 15. Contact

Bryan Kwandou — nayrbryangaming01@gmail.com
GitHub: https://github.com/bryankwandou
