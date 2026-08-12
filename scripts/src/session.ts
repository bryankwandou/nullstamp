/**
 * Opening a session against T3N.
 *
 * This differs from the Quickstart sample in two ways, and neither is a matter of
 * style — both are forced by the SDK's own types:
 *
 * 1. `trustAnchor` is required. Without it `T3nClient` throws `T3nConfigError` in the
 *    constructor, before any network traffic. The correct path is
 *    `fetchTrustedManifest`, which checks the operator signature and never returns an
 *    unverified anchor.
 *
 * 2. The handshake needs more than the `EthSign` signer. The full set comes from
 *    `createDefaultHandlers`, which also installs the ML-KEM key handler and the
 *    randomness source.
 *
 * Both are recorded in docs/BUGS.md as findings T-01 and T-02: gaps between the
 * documentation and the SDK.
 */
import {
  T3nClient,
  TenantClient,
  createDefaultHandlers,
  createEthAuthInput,
  eth_get_address,
  fetchTrustedManifest,
  getNodeUrl,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
  type TrustAnchorOrUnsafe,
} from "@terminal3/t3n-sdk";

import { ALLOW_UNSAFE_TRUST, ENV, requireApiKey } from "./config.js";

export interface UserSession {
  t3n: T3nClient;
  tenantDid: string;
  ethAddress: string;
  nodeUrl: string;
}

/** Ambil anchor terverifikasi, atau nyatakan terbuka bila verifikasi dilewati. */
export async function resolveTrustAnchor(): Promise<TrustAnchorOrUnsafe> {
  if (ALLOW_UNSAFE_TRUST) {
    console.warn(
      "[peringatan] verifikasi attestation dilewati karena T3N_UNSAFE_TRUST_SERVER=1",
    );
    return { unsafe_trust_server: true };
  }
  const anchor = await fetchTrustedManifest(ENV);
  const peers = anchor.expected_peer_ids?.length ?? 0;
  const rtmr = anchor.rtmr3_allowlist?.length ?? 0;
  console.log(
    `anchor verified — ${peers} peers, ${rtmr} RTMR3 measurement(s)`,
  );
  return anchor;
}

/**
 * Open a user session: handshake, then authenticate with the developer key.
 * The tenant DID comes from the server's answer, never assembled locally from
 * alamat wallet.
 */
export async function openUserSession(): Promise<UserSession> {
  const apiKey = requireApiKey();
  setEnvironment(ENV);

  const nodeUrl = getNodeUrl();
  const trustAnchor = await resolveTrustAnchor();
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
  const tenantDid = typeof did === "string" ? did : did.value;

  return { t3n, tenantDid, ethAddress, nodeUrl };
}

/** Klien tenant untuk urusan pengelolaan: map, contract, dan kredit. */
export function openTenantClient(session: UserSession): TenantClient {
  return new TenantClient({
    environment: ENV,
    t3n: session.t3n,
    baseUrl: session.nodeUrl,
    endpoint: session.nodeUrl,
    tenantDid: session.tenantDid,
  });
}

/** Cetak galat apa adanya, termasuk field tambahan yang dibawa kelas galat SDK. */
export function reportError(e: unknown): never {
  const err = e as Record<string, unknown> & { message?: string };
  console.error("\n--- STEP FAILED ---");
  console.error("kind   :", (e as object)?.constructor?.name ?? typeof e);
  console.error("message:", err?.message ?? String(e));
  for (const k of ["code", "field", "authMethod", "currentState", "request_id", "requestId"]) {
    if (err?.[k] !== undefined) console.error(`${k.padEnd(7)}:`, err[k]);
  }
  if (err?.stack) console.error("\nstack  :\n" + String(err.stack));
  process.exit(1);
}
