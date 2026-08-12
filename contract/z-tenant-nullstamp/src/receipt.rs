//! The shape of a Nullstamp receipt.
//!
//! A receipt has two layers. `core` holds every claim that the digest binds; the
//! outer layer adds that digest, the derived identity, and a signature when one is
//! available. Keeping them apart is what lets anyone recompute the digest from
//! `core` without having to guess which fields were included.
//!
//! No profile field value ever reaches this module. What gets recorded is field
//! names, the destination, a fingerprint of the request body, and the outcome.

use serde_json::{json, Value};

use crate::canon;

/// Inputs for assembling `core`. All of it is already free of PII: `fields_used`
/// holds field names, not their contents.
#[derive(Debug, Clone)]
pub struct CoreParams {
    pub schema: &'static str,
    pub contract_version: &'static str,
    pub tenant_did_hex: String,
    pub contract_id: u32,
    /// DID of the user whose session is making the call. Empty when the contract
    /// is invoked through `/api/dev/exec`, which carries no session.
    pub subject_did_hex: Option<String>,
    pub purpose: String,
    pub method: String,
    pub target_url: String,
    pub target_host: String,
    pub fields_used: Vec<String>,
    pub request_body_sha256: String,
    pub response_code: u16,
    pub response_body_sha256: String,
    /// JSON pointers the caller asked to have pulled out of the response.
    /// Empty by default: only the status code and the body fingerprint come back.
    /// Anything extracted is recorded here, so that exposure is itself bound into
    /// the digest.
    pub extracted_pointers: Vec<String>,
    pub issued_at_secs: u64,
    pub seq_no: u64,
}

/// Assemble the `core` layer. Keys are written as they come; the final ordering
/// is decided by `serde_json`, which lays object keys out ascending.
pub fn build_core(p: &CoreParams) -> Value {
    json!({
        "schema": p.schema,
        "contract_version": p.contract_version,
        "tenant_did": p.tenant_did_hex,
        "contract_id": p.contract_id,
        "subject_did": p.subject_did_hex,
        "purpose": p.purpose,
        "method": p.method,
        "target_url": p.target_url,
        "target_host": p.target_host,
        "fields_used": p.fields_used,
        "request_body_sha256": p.request_body_sha256,
        "response_code": p.response_code,
        "response_body_sha256": p.response_body_sha256,
        "extracted_pointers": p.extracted_pointers,
        "issued_at_secs": p.issued_at_secs,
        "seq_no": p.seq_no,
    })
}

/// The result of issuance: `core`, its digest, the derived identity, and the
/// signature status.
#[derive(Debug, Clone)]
pub struct Sealed {
    pub receipt_id: String,
    pub digest: [u8; 32],
    pub core: Value,
}

/// Compute the digest of `core`, then derive the receipt identity from it.
pub fn seal(core: Value) -> Result<Sealed, String> {
    let digest = canon::digest_of(&core)?;
    Ok(Sealed {
        receipt_id: canon::receipt_id_from(&digest),
        digest,
        core,
    })
}

/// The final shape stored in KV and returned to the caller.
///
/// `signature` is allowed to be absent, deliberately. This contract does not
/// import the `signing` interface, because doing so prevents it from being
/// instantiated at all (finding T-12). With no signature the receipt is still
/// bound by the digest planted in the transaction's Merkle leaf, and the reason
/// is recorded openly rather than hidden.
pub fn envelope(sealed: &Sealed, signature: Option<Value>, signing_error: Option<String>) -> Value {
    json!({
        "receipt_id": sealed.receipt_id,
        "digest_sha256": hex::encode(sealed.digest),
        "core": sealed.core,
        "signature": signature,
        "signing_error": signing_error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn contoh() -> CoreParams {
        CoreParams {
            schema: "nullstamp.receipt.v1",
            contract_version: "0.1.0",
            tenant_did_hex: "aabb".to_string(),
            contract_id: 7,
            subject_did_hex: Some("ccdd".to_string()),
            purpose: "flight_booking".to_string(),
            method: "POST".to_string(),
            target_url: "https://api.duffel.com/air/orders".to_string(),
            target_host: "api.duffel.com".to_string(),
            fields_used: vec!["first_name".to_string(), "last_name".to_string()],
            request_body_sha256: "11".repeat(32),
            response_code: 201,
            response_body_sha256: "22".repeat(32),
            extracted_pointers: vec!["/data/id".to_string()],
            issued_at_secs: 1_754_000_000,
            seq_no: 42,
        }
    }

    #[test]
    fn core_memuat_nama_field_bukan_nilainya() {
        let core = build_core(&contoh());
        let teks = serde_json::to_string(&core).unwrap();
        assert!(teks.contains("first_name"));
        // No profile value can appear here, because this function never receives
        // one.
        assert!(!teks.contains("{{"));
    }

    #[test]
    fn digest_stabil_untuk_core_yang_sama() {
        let a = seal(build_core(&contoh())).unwrap();
        let b = seal(build_core(&contoh())).unwrap();
        assert_eq!(a.digest, b.digest);
        assert_eq!(a.receipt_id, b.receipt_id);
    }

    #[test]
    fn perubahan_sekecil_apa_pun_menggeser_digest() {
        let a = seal(build_core(&contoh())).unwrap();
        let mut p = contoh();
        p.response_code = 200;
        let b = seal(build_core(&p)).unwrap();
        assert_ne!(a.digest, b.digest);
        assert_ne!(a.receipt_id, b.receipt_id);
    }

    #[test]
    fn menambah_field_yang_dipakai_menggeser_digest() {
        let a = seal(build_core(&contoh())).unwrap();
        let mut p = contoh();
        p.fields_used.push("date_of_birth".to_string());
        let b = seal(build_core(&p)).unwrap();
        assert_ne!(a.digest, b.digest);
    }

    #[test]
    fn sampul_tanpa_tanda_tangan_mencatat_alasannya() {
        let sealed = seal(build_core(&contoh())).unwrap();
        let env = envelope(&sealed, None, Some("signing capability absent".to_string()));
        assert!(env["signature"].is_null());
        assert_eq!(env["signing_error"], "signing capability absent");
        assert_eq!(env["receipt_id"], sealed.receipt_id);
        assert_eq!(env["digest_sha256"], hex::encode(sealed.digest));
    }

    #[test]
    fn digest_di_sampul_bisa_dihitung_ulang_dari_core() {
        let sealed = seal(build_core(&contoh())).unwrap();
        let env = envelope(&sealed, None, None);
        let ulang = canon::digest_of(&env["core"]).unwrap();
        assert_eq!(hex::encode(ulang), env["digest_sha256"].as_str().unwrap());
    }
}
