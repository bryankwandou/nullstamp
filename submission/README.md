# Submission package

Everything a reviewer needs, in one folder. Nothing here is illustrative — every
terminal transcript is the verbatim output of the command named in its first line,
captured as it ran, and every screenshot came from the deployed site.

## Start here

| File | What it is |
|---|---|
| [Nullstamp-Submission.pdf](Nullstamp-Submission.pdf) | The complete dossier. 25 pages, all screenshots embedded, quoting the evidence files directly. Self-contained — 2.4 MB. |
| [GOOGLE-DOC.md](GOOGLE-DOC.md) | The same report as paste-ready Markdown, for building the public Google Doc the brief asks for. Screenshot slots are marked. |
| [video/nullstamp-walkthrough.mp4](video/) | 44-second walkthrough, 1920×1080. Eight scenes, every number taken from the real run. |

## Live links

| | |
|---|---|
| Demo | https://nullstamp.vercel.app |
| Verify a receipt yourself | https://nullstamp.vercel.app/verify |
| See a rejection directly | https://nullstamp.vercel.app/verify?tamper=hide-field |
| Findings report | https://nullstamp.vercel.app/findings |
| Repository | https://github.com/bryankwandou/nullstamp |

## The receipt under discussion

`live-receipt.json` holds a real receipt issued inside the enclave on T3N testnet.

```
receipt_id  rcpt_8fb056c99bbea7e655d72075
digest      8fb056c99bbea7e655d72075e37e428c8fbaade3c79b32fb737a6c4bef82e4d3
contract    639, z:f21dce…:nullstamp@0.1.7
upstream    postman-echo.com, status 200
seq_no      114186   (cluster clock)
```

`tampered-fields.json` and `tampered-host.json` are that same receipt with one thing
changed, kept so the rejection can be reproduced rather than described.

Check it yourself, with no key and no network:

```bash
cd ../scripts && npm install
npm run verify:offline -- ../submission/live-receipt.json    # exits 0
npm run verify:offline -- ../submission/tampered-fields.json # exits 1
```

## evidence/ — 18 transcripts

Numbered in the order they were produced.

| File | Step |
|---|---|
| `01-cargo-test.txt` | 54 tests pass |
| `02-cargo-build.txt` | WASM built, 252,806 bytes |
| `03-wasm-tools.txt` | Component valid, four host imports |
| `04-preflight.txt` | Twelve checks, none needing a key |
| `05-step01-quickstart.txt` | Handshake and authentication |
| `06-step02-tenant.txt` | Tenant state, balance, quotas |
| `07-step03-register.txt` | Contract 653 registered |
| `08-step04-maps.txt` | KV maps created |
| `09-step04b-acl.txt` | ACLs re-pointed (finding T-13) |
| `10-step05-secret.txt` | Credential seeded |
| `11-step06-grant.txt` | Authorization grant installed |
| `12-step07-issue.txt` | Receipt issued inside the enclave |
| `13-step08-verify.txt` | Verified in-enclave, `valid: true` |
| `14-step09-list.txt` | Trail of eight receipts |
| `15-step10-logs.txt` | The contract's own log |
| `16-step11-export.txt` | Where the credit grant ran out (finding T-15) |
| `17-verify-offline.txt` | Digest recomputed outside the node — match, exit 0 |
| `18-tamper-rejected.txt` | Three attacks, all rejected, exit 1 |

## screenshots/ — 7 captures

Taken from the deployed site with headless Chrome at 2× scale.

| File | What it shows |
|---|---|
| `site-01-landing.png` | Landing page |
| `site-02-verify.png` | Genuine receipt, four checks green, digests agreeing |
| `site-03-findings.png` | All fifteen findings |
| `site-04-rejected-hidden-field.png` | A used field hidden — digest and identity both fail |
| `site-05-rejected-repaired.png` | Content edited and digest repaired: the digest check passes, identity still fails |
| `site-06-rejected-swapped-host.png` | Destination host swapped |
| `pdf-preview-page1.png` | First page of the dossier |

## video/ — the walkthrough and its frames

`nullstamp-walkthrough.mp4` plus one still per scene, so individual frames can be
dropped into a deck or a Doc without scrubbing the video.

Built with Remotion; source is in `../video/src/`. Rebuild with:

```bash
cd ../video && npm install && npm run build
```

Two notes for anyone rebuilding it. Remotion's bundler needs TypeScript 5 —
TypeScript 7 dropped `ts.sys`, which the esbuild loader calls, and the failure
surfaces as an unrelated `Cannot read properties of undefined (reading 'readFile')`.
And `"type": "module"` in `package.json` breaks the bundler outright.

## A caveat worth stating plainly

The tenant account is now at **zero credits**. Ten contract registrations exhausted
the 20,000 grant, which is finding T-15. So steps 03 through 11 cannot be re-run
against this DID without a top-up.

Everything in this folder still stands on its own, because the part that matters —
recomputing a receipt's digest and checking it — needs no credits, no session, and no
network. That is the whole argument, and the empty account is an accidental proof of
it.
