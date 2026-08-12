//! `list-receipts` — ambil jejak receipt milik tenant ini.
//!
//! Pemindaian KV bersifat sekali jalan; host tidak menyediakan kursor antar
//! panggilan. Karena itu jawaban menyertakan `next_start` bila hasilnya
//! menyentuh batas, supaya pemanggil bisa melanjutkan dari titik itu.

use serde::Deserialize;

/// Semua identitas receipt berawalan ini, jadi pemindaian bisa dibatasi pada
/// rentang setengah terbuka `[rcpt_, rcpt`)`.
pub const PREFIX: &[u8] = b"rcpt_";
/// Bita `_` adalah 0x5F; penggantinya 0x60 menutup rentang tanpa ikut terbaca.
pub const PREFIX_END: &[u8] = b"rcpt\x60";

const LIMIT_BAWAAN: u32 = 50;
const LIMIT_TERTINGGI: u32 = 200;

#[derive(Debug, Deserialize, Default)]
pub struct ListReq {
    /// Titik awal pemindaian. Bila kosong, dimulai dari awal rentang.
    #[serde(default)]
    pub start: Option<String>,
    #[serde(default)]
    pub limit: Option<u32>,
}

/// Batas dijaga di dalam contract. Host menolak `limit` bernilai nol, dan
/// permintaan yang terlalu besar akan menghabiskan anggaran pemindaian.
pub fn clamp_limit(limit: Option<u32>) -> u32 {
    match limit {
        None | Some(0) => LIMIT_BAWAAN,
        Some(n) if n > LIMIT_TERTINGGI => LIMIT_TERTINGGI,
        Some(n) => n,
    }
}

/// Tentukan titik awal pemindaian. Nilai dari pemanggil hanya diterima bila
/// masih berada di dalam rentang awalan receipt.
pub fn scan_start(start: &Option<String>) -> Vec<u8> {
    match start {
        Some(s) if s.as_bytes().starts_with(PREFIX) => s.as_bytes().to_vec(),
        _ => PREFIX.to_vec(),
    }
}

/// Titik masuk yang dipanggil `lib.rs`.
pub fn list_receipts(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: ListReq = if input.is_empty() {
        ListReq::default()
    } else {
        serde_json::from_slice(input)
            .map_err(|e| format!("list-receipts: masukan tidak sah: {e}"))?
    };

    #[cfg(target_arch = "wasm32")]
    {
        let out = wasm::run(&req)?;
        serde_json::to_vec(&out).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = req;
        Err("list_receipts hanya berjalan pada target wasm32".to_string())
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
        .map_err(|e| format!("list-receipts: gagal memindai {map}: {e}"))?;

        let mut receipts: Vec<Value> = Vec::with_capacity(rows.len());
        let mut terakhir: Option<String> = None;
        for (key, value) in &rows {
            terakhir = Some(String::from_utf8_lossy(key).to_string());
            match serde_json::from_slice::<Value>(value) {
                Ok(v) => receipts.push(v),
                Err(e) => receipts.push(json!({
                    "receipt_id": terakhir,
                    "error": format!("baris tersimpan rusak: {e}"),
                })),
            }
        }

        // Bila hasilnya menyentuh batas, masih mungkin ada sisa. Titik lanjut
        // dikembalikan apa adanya; pemanggil yang memutuskan mau melanjutkan.
        let next_start = if rows.len() as u32 == limit {
            terakhir
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
        assert_eq!(clamp_limit(None), LIMIT_BAWAAN);
    }

    #[test]
    fn nol_diganti_batas_bawaan_karena_host_menolaknya() {
        assert_eq!(clamp_limit(Some(0)), LIMIT_BAWAAN);
    }

    #[test]
    fn batas_yang_kelewat_besar_dipangkas() {
        assert_eq!(clamp_limit(Some(10_000)), LIMIT_TERTINGGI);
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
            "titik awal asing tidak boleh membawa pemindaian keluar rentang receipt"
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
        // Masukan kosong tidak boleh menjadi galat penguraian; jalur non-wasm
        // yang kemudian menolaknya.
        let err = list_receipts(b"").unwrap_err();
        assert!(err.contains("wasm32"));
    }

    #[test]
    fn masukan_rusak_ditolak_sebagai_galat_penguraian() {
        assert!(list_receipts(b"{rusak").unwrap_err().contains("tidak sah"));
    }
}
