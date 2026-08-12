//! `list-receipts` — read this tenant's receipt trail.
//!
//! A KV scan is single-shot; the host provides no cursor across calls. So the
//! response carries `next_start` whenever the result hit the limit, letting the
//! caller resume from that point.

use serde::Deserialize;

/// Every receipt identity carries this prefix, so a scan can be bounded to the
/// half-open range `[rcpt_, rcpt`)`.
pub const PREFIX: &[u8] = b"rcpt_";
/// The `_` byte is 0x5F; using 0x60 closes the range without being included.
pub const PREFIX_END: &[u8] = b"rcpt\x60";

const DEFAULT_LIMIT: u32 = 50;
const MAX_LIMIT: u32 = 200;

#[derive(Debug, Deserialize, Default)]
pub struct ListReq {
    /// Where the scan starts. When absent, it begins at the start of the range.
    #[serde(default)]
    pub start: Option<String>,
    #[serde(default)]
    pub limit: Option<u32>,
}

/// The limit is clamped inside the contract. The host rejects a `limit` of zero,
/// and an over-large request would exhaust the scan budget.
pub fn clamp_limit(limit: Option<u32>) -> u32 {
    match limit {
        None | Some(0) => DEFAULT_LIMIT,
        Some(n) if n > MAX_LIMIT => MAX_LIMIT,
        Some(n) => n,
    }
}

/// Decide where the scan starts. A caller-supplied value is accepted only if it
/// still falls inside the receipt-prefix range.
pub fn scan_start(start: &Option<String>) -> Vec<u8> {
    match start {
        Some(s) if s.as_bytes().starts_with(PREFIX) => s.as_bytes().to_vec(),
        _ => PREFIX.to_vec(),
    }
}

/// Entry point called from `lib.rs`.
pub fn list_receipts(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: ListReq = if input.is_empty() {
        ListReq::default()
    } else {
        serde_json::from_slice(input)
            .map_err(|e| format!("list-receipts: invalid input: {e}"))?
    };

    #[cfg(target_arch = "wasm32")]
    {
        let out = wasm::run(&req)?;
        serde_json::to_vec(&out).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = req;
        Err("list_receipts only runs on the wasm32 target".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use crate::host::{interfaces::kv_store, tenant::tenant_context};
    use serde_json::{json, Value};

    pub fn run(req: &ListReq) -> Result<Value, String> {
        let tid_hex = hex::encode(&tenant_context::tenant_did());
        let map = format!("z:{tid_hex}:receipts");
        let limit = clamp_limit(req.limit);

        let rows = kv_store::scan(
            &map,
            &scan_start(&req.start),
            &PREFIX_END.to_vec(),
            limit,
        )
        .map_err(|e| format!("list-receipts: could not scan {map}: {e}"))?;

        let mut receipts: Vec<Value> = Vec::with_capacity(rows.len());
        let mut last_key: Option<String> = None;
        for (key, value) in &rows {
            last_key = Some(String::from_utf8_lossy(key).to_string());

            // Values above a certain size are not stored as-is. The host moves
            // them into content-addressed storage and leaves a pointer in the row:
            // the magic `T3VR` followed by JSON holding a `value_cid`.
            //
            // The part that matters: `kv-store.get` resolves that pointer itself
            // and returns the original value, while `kv-store.scan` returns the
            // pointer raw. The WIT comment for `scan` promises key/value pairs and
            // says nothing about this possibility. So a contract that scans and
            // then parses the result the way it parses a `get` result fails with no
            // error at all from the host.
            // See finding T-14 in docs/BUGS.md.
            const MAGIC_CAS: &[u8] = b"T3VR";

            let from_cas = value.starts_with(MAGIC_CAS);
            let payload: Vec<u8> = if value.is_empty() || from_cas {
                match kv_store::get(&map, key) {
                    Ok(Some(v)) => v,
                    Ok(None) => Vec::new(),
                    Err(_) => Vec::new(),
                }
            } else {
                value.clone()
            };

            match serde_json::from_slice::<Value>(&payload) {
                Ok(v) => receipts.push(v),
                Err(e) => receipts.push(json!({
                    "receipt_id": last_key,
                    "error": format!("stored row could not be parsed: {e}"),
                    "from_cas_pointer": from_cas,
                })),
            }
        }

        // If the result hit the limit there may be more. The continuation point is
        // returned as-is; the caller decides whether to follow it.
        let next_start = if rows.len() as u32 == limit {
            last_key
        } else {
            None
        };

        Ok(json!({
            "receipts": receipts,
            "count": receipts.len(),
            "limit": limit,
            "next_start": next_start,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn batas_bawaan_dipakai_saat_tidak_disebut() {
        assert_eq!(clamp_limit(None), DEFAULT_LIMIT);
    }

    #[test]
    fn nol_diganti_batas_bawaan_karena_host_menolaknya() {
        assert_eq!(clamp_limit(Some(0)), DEFAULT_LIMIT);
    }

    #[test]
    fn batas_yang_kelewat_besar_dipangkas() {
        assert_eq!(clamp_limit(Some(10_000)), MAX_LIMIT);
    }

    #[test]
    fn batas_yang_masuk_akal_dibiarkan() {
        assert_eq!(clamp_limit(Some(25)), 25);
    }

    #[test]
    fn awal_pemindaian_jatuh_ke_awalan_saat_kosong() {
        assert_eq!(scan_start(&None), PREFIX.to_vec());
    }

    #[test]
    fn awal_pemindaian_di_luar_rentang_diabaikan() {
        assert_eq!(
            scan_start(&Some("zzz_lain".to_string())),
            PREFIX.to_vec(),
            "a foreign start point must not carry the scan outside the receipt range"
        );
    }

    #[test]
    fn awal_pemindaian_yang_sah_dipakai() {
        let s = "rcpt_0011aabb".to_string();
        assert_eq!(scan_start(&Some(s.clone())), s.into_bytes());
    }

    #[test]
    fn rentang_menutup_seluruh_awalan() {
        assert!(PREFIX < PREFIX_END);
        let contoh = b"rcpt_ffffffffffff".to_vec();
        assert!(contoh.as_slice() >= PREFIX && contoh.as_slice() < PREFIX_END);
    }

    #[test]
    fn masukan_kosong_dianggap_permintaan_bawaan() {
        // Empty input must not become a parse error; the non-wasm path is what
        // rejects it afterwards.
        let err = list_receipts(b"").unwrap_err();
        assert!(err.contains("wasm32"));
    }

    #[test]
    fn masukan_rusak_ditolak_sebagai_galat_penguraian() {
        assert!(list_receipts(b"{corrupt").unwrap_err().contains("invalid input"));
    }
}
