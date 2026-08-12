/**
 * Pembukaan sesi ke T3N.
 *
 * Bedanya dengan contoh di halaman Quickstart ada dua, dan keduanya bukan
 * pilihan gaya melainkan keharusan yang dipaksa tipe SDK:
 *
 * 1. `trustAnchor` wajib diisi. Tanpa itu `T3nClient` melempar
 *    `T3nConfigError` di constructor, sebelum ada lalu lintas jaringan. Jalur
 *    yang benar adalah `fetchTrustedManifest`, yang memeriksa tanda tangan
 *    operator dan tidak pernah memulangkan anchor yang belum terverifikasi.
 *
 * 2. Handshake butuh lebih dari penanda `EthSign`. Set lengkapnya disusun
 *    `createDefaultHandlers`, yang juga memasang penangan kunci ML-KEM dan
 *    sumber acak.
 *
 * Keduanya dicatat di docs/BUGS.md sebagai selisih antara dokumentasi dan SDK.
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
    `anchor terverifikasi — ${peers} peer, ${rtmr} pengukuran RTMR3`,
  );
  return anchor;
}

/**
 * Buka sesi pengguna: handshake lalu autentikasi memakai kunci pengembang.
 * DID tenant datang dari jawaban server, tidak pernah disusun sendiri dari
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
  console.error("\n--- LANGKAH GAGAL ---");
  console.error("jenis  :", (e as object)?.constructor?.name ?? typeof e);
  console.error("pesan  :", err?.message ?? String(e));
  for (const k of ["code", "field", "authMethod", "currentState", "request_id", "requestId"]) {
    if (err?.[k] !== undefined) console.error(`${k.padEnd(7)}:`, err[k]);
  }
  if (err?.stack) console.error("\njejak  :\n" + String(err.stack));
  process.exit(1);
}
