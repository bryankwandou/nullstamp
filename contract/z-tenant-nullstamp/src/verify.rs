//! `verify-receipt` — hitung ulang digest sebuah receipt dan bandingkan dengan
//! digest yang tercatat saat penerbitan.
//!
//! Pemeriksaan intinya murni: diberi sampul receipt, siapa pun bisa menyusun
//! ulang bentuk kanonik `core` dan melihat apakah digest-nya cocok. Fungsi yang
//! sama dipakai contract di dalam enclave dan bisa dijalankan ulang di luar node.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::canon;

#[derive(Debug, Deserialize)]
pub struct VerifyReq {
    pub receipt_id: String,
}

/// Alasan sebuah receipt dinyatakan tidak sah.
#[derive(Debug, PartialEq, Eq)]
pub enum Mismatch {
    /// Sampul tidak punya lapis `core`.
    CoreHilang,
    /// Sampul tidak punya `digest_sha256`.
    DigestHilang,
    /// Digest yang dihitung ulang berbeda dari yang tercatat.
    DigestBerbeda { tercatat: String, dihitung: String },
    /// Identitas receipt tidak sesuai digest-nya.
    IdentitasTidakSesuai { tercatat: String, dihitung: String },
}

impl core::fmt::Display for Mismatch {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Mismatch::CoreHilang => write!(f, "sampul receipt tidak memuat core"),
            Mismatch::DigestHilang => write!(f, "sampul receipt tidak memuat digest_sha256"),
            Mismatch::DigestBerbeda {
                tercatat,
                dihitung,
            } => write!(
                f,
                "digest tidak cocok: tercatat {tercatat}, dihitung ulang {dihitung}"
            ),
            Mismatch::IdentitasTidakSesuai {
                tercatat,
                dihitung,
            } => write!(
                f,
                "receipt_id tidak sesuai digest: tercatat {tercatat}, seharusnya {dihitung}"
            ),
        }
    }
}

/// Periksa satu sampul receipt. Tidak menyentuh host, jadi bisa dijalankan di
/// mana saja termasuk di sisi pengguna.
pub fn check_envelope(env: &Value) -> Result<[u8; 32], Mismatch> {
    let core = env.get("core").ok_or(Mismatch::CoreHilang)?;
    if core.is_null() {
        return Err(Mismatch::CoreHilang);
    }
    let tercatat = env
        .get("digest_sha256")
        .and_then(Value::as_str)
        .ok_or(Mismatch::DigestHilang)?;

    let dihitung = canon::digest_of(core).map_err(|_| Mismatch::CoreHilang)?;
    let dihitung_hex = hex::encode(dihitung);

    if dihitung_hex != tercatat {
        return Err(Mismatch::DigestBerbeda {
            tercatat: tercatat.to_string(),
            dihitung: dihitung_hex,
        });
    }

    if let Some(id) = env.get("receipt_id").and_then(Value::as_str) {
        let seharusnya = canon::receipt_id_from(&dihitung);
        if id != seharusnya {
            return Err(Mismatch::IdentitasTidakSesuai {
                tercatat: id.to_string(),
                dihitung: seharusnya,
            });
        }
    }

    Ok(dihitung)
}

/// Bentuk jawaban yang dikembalikan ke pemanggil.
pub fn report(receipt_id: &str, hasil: Result<[u8; 32], Mismatch>) -> Value {
    match hasil {
        Ok(d) => json!({
            "valid": true,
            "receipt_id": receipt_id,
            "digest_sha256": hex::encode(d),
            "reason": Value::Null,
        }),
        Err(m) => json!({
            "valid": false,
            "receipt_id": receipt_id,
            "digest_sha256": Value::Null,
            "reason": m.to_string(),
        }),
    }
}

/// Titik masuk yang dipanggil `lib.rs`.
pub fn verify_receipt(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: VerifyReq = serde_json::from_slice(input)
        .map_err(|e| format!("verify-receipt: masukan tidak sah: {e}"))?;
    if req.receipt_id.trim().is_empty() {
        return Err("verify-receipt: receipt_id tidak boleh kosong".to_string());
    }

    #[cfg(target_arch = "wasm32")]
    {
        let out = wasm::run(&req.receipt_id)?;
        serde_json::to_vec(&out).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        Err("verify_receipt hanya berjalan pada target wasm32".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use crate::host::{interfaces::kv_store, tenant::tenant_context};

    pub fn run(receipt_id: &str) -> Result<Value, String> {
        let tid_hex = hex::encode(&tenant_context::tenant_did());
        let map = format!("z:{tid_hex}:receipts");

        let bytes = kv_store::get(&map, receipt_id.as_bytes())
            .map_err(|e| format!("verify-receipt: gagal membaca {map}: {e}"))?
            .ok_or_else(|| format!("verify-receipt: {receipt_id} tidak ada di {map}"))?;

        let env: Value = serde_json::from_slice(&bytes)
            .map_err(|e| format!("verify-receipt: baris tersimpan rusak: {e}"))?;

        Ok(report(receipt_id, check_envelope(&env)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::receipt::{self, CoreParams};

    fn sampul() -> Value {
        let core = receipt::build_core(&CoreParams {
            schema: "nullstamp.receipt.v1",
            contract_version: "0.1.0",
            tenant_did_hex: "aabb".to_string(),
            contract_id: 3,
            subject_did_hex: None,
            purpose: "kyc_check".to_string(),
            method: "POST".to_string(),
            target_url: "https://api.contoh.com/v1/verify".to_string(),
            target_host: "api.contoh.com".to_string(),
            fields_used: vec!["date_of_birth".to_string()],
            request_body_sha256: "aa".repeat(32),
            response_code: 200,
            response_body_sha256: "bb".repeat(32),
            extracted_pointers: vec![],
            issued_at_secs: 1_754_000_001,
            seq_no: 9,
        });
        let sealed = receipt::seal(core).unwrap();
        receipt::envelope(&sealed, None, None)
    }

    #[test]
    fn receipt_utuh_dinyatakan_sah() {
        let env = sampul();
        let d = check_envelope(&env).unwrap();
        assert_eq!(hex::encode(d), env["digest_sha256"].as_str().unwrap());
    }

    #[test]
    fn mengubah_isi_core_membuat_digest_tidak_cocok() {
        let mut env = sampul();
        env["core"]["response_code"] = json!(500);
        let err = check_envelope(&env).unwrap_err();
        assert!(matches!(err, Mismatch::DigestBerbeda { .. }));
    }

    #[test]
    fn menghapus_satu_field_yang_dipakai_terdeteksi() {
        let mut env = sampul();
        env["core"]["fields_used"] = json!([]);
        assert!(matches!(
            check_envelope(&env).unwrap_err(),
            Mismatch::DigestBerbeda { .. }
        ));
    }

    #[test]
    fn menukar_host_tujuan_terdeteksi() {
        let mut env = sampul();
        env["core"]["target_host"] = json!("api.penyerang.com");
        assert!(matches!(
            check_envelope(&env).unwrap_err(),
            Mismatch::DigestBerbeda { .. }
        ));
    }

    #[test]
    fn digest_yang_dipalsukan_agar_cocok_tetap_gagal_di_identitas() {
        let mut env = sampul();
        env["core"]["purpose"] = json!("tujuan_lain");
        let baru = canon::digest_of(&env["core"]).unwrap();
        env["digest_sha256"] = json!(hex::encode(baru));
        // Digest kini konsisten dengan core, tetapi receipt_id lama tidak lagi
        // turun dari digest itu.
        assert!(matches!(
            check_envelope(&env).unwrap_err(),
            Mismatch::IdentitasTidakSesuai { .. }
        ));
    }

    #[test]
    fn sampul_tanpa_core_ditolak() {
        let env = json!({ "digest_sha256": "00" });
        assert_eq!(check_envelope(&env).unwrap_err(), Mismatch::CoreHilang);
    }

    #[test]
    fn sampul_tanpa_digest_ditolak() {
        let mut env = sampul();
        env.as_object_mut().unwrap().remove("digest_sha256");
        assert_eq!(check_envelope(&env).unwrap_err(), Mismatch::DigestHilang);
    }

    #[test]
    fn laporan_memuat_alasan_saat_gagal() {
        let mut env = sampul();
        env["core"]["seq_no"] = json!(10);
        let out = report("rcpt_x", check_envelope(&env));
        assert_eq!(out["valid"], false);
        assert!(out["reason"].as_str().unwrap().contains("digest tidak cocok"));
    }

    #[test]
    fn laporan_memuat_digest_saat_sah() {
        let env = sampul();
        let id = env["receipt_id"].as_str().unwrap().to_string();
        let out = report(&id, check_envelope(&env));
        assert_eq!(out["valid"], true);
        assert!(out["reason"].is_null());
    }

    #[test]
    fn receipt_id_kosong_ditolak() {
        let input = serde_json::to_vec(&json!({ "receipt_id": "  " })).unwrap();
        assert!(verify_receipt(&input)
            .unwrap_err()
            .contains("tidak boleh kosong"));
    }
}
