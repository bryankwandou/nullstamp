/**
 * State carried between steps.
 *
 * Each step runs as its own process so failures stay localised and each result
 * screen is easy to screenshot. Values the next step needs — the tenant DID, the
 * contract id — are kept in this file. The developer key is never written here.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATE_PATH = resolve(HERE, "..", "state.json");

export interface RunState {
  environment?: string;
  nodeUrl?: string;
  ethAddress?: string;
  tenantDid?: string;
  tenantClaim?: unknown;
  contractName?: string;
  contractId?: number;
  contractVersion?: string;
  mapsCreated?: string[];
  grantedHosts?: string[];
  lastReceiptId?: string;
  updatedAt?: string;
}

export function readState(): RunState {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as RunState;
  } catch {
    // Berkas rusak lebih baik diabaikan daripada menghentikan langkah; isinya
    // can simply be rebuilt from scratch.
    return {};
  }
}

export function writeState(patch: RunState): RunState {
  const next: RunState = {
    ...readState(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(STATE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

/** Ambil satu nilai yang wajib sudah ada, dengan pesan yang menyebut langkah pemasoknya. */
export function requireState<K extends keyof RunState>(
  key: K,
  langkah: string,
): NonNullable<RunState[K]> {
  const value = readState()[key];
  if (value === undefined || value === null) {
    throw new Error(
      `state.json belum memuat "${String(key)}". Jalankan dulu: ${langkah}`,
    );
  }
  return value as NonNullable<RunState[K]>;
}
