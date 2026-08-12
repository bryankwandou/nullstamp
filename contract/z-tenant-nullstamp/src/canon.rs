//! The pure part of Nullstamp: profile-marker parsing, canonical-form rendering,
//! and digest computation. It touches no host interface, so every rule in here is
//! testable on an ordinary target without WASM.

use serde_json::Value;
use sha2::{Digest, Sha256};

/// The only namespace a marker may reference. The host refuses other namespaces
/// with `placeholder-denied`; the contract refuses them earlier so the message is
/// clear and no outbound call ever happens.
pub const PROFILE_NS: &str = "profile.";

#[derive(Debug, PartialEq, Eq)]
pub enum MarkerError {
    /// A `{{` with no closing `}}`.
    Unterminated,
    /// The marker names a namespace other than `profile`, e.g. `{{secrets.key}}`.
    ForeignNamespace(String),
    /// An empty marker, i.e. `{{}}`.
    Empty,
}

impl core::fmt::Display for MarkerError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            MarkerError::Unterminated => write!(f, "marker is not closed with }}}}"),
            MarkerError::ForeignNamespace(m) => {
                write!(f, "marker di luar namespace profile: {{{{{m}}}}}")
            }
            MarkerError::Empty => write!(f, "marker kosong"),
        }
    }
}

/// Collect the profile field names referenced by `text`, ascending and without
/// duplicates. The `profile.` prefix is stripped, so `{{profile.first_name}}`
/// yields `first_name`.
///
/// A marker outside the `profile` namespace is an error rather than something to
/// skip. Letting one through would mean a receipt could claim it used only profile
/// fields while the request body referenced something else.
pub fn collect_profile_fields(text: &str) -> Result<Vec<String>, MarkerError> {
    let bytes = text.as_bytes();
    let mut fields: Vec<String> = Vec::new();
    let mut i = 0usize;

    while i + 1 < bytes.len() {
        if bytes[i] != b'{' || bytes[i + 1] != b'{' {
            i += 1;
            continue;
        }
        let body_start = i + 2;
        let close = find_close(bytes, body_start).ok_or(MarkerError::Unterminated)?;
        let marker = text[body_start..close].trim();

        if marker.is_empty() {
            return Err(MarkerError::Empty);
        }
        let field = marker
            .strip_prefix(PROFILE_NS)
            .ok_or_else(|| MarkerError::ForeignNamespace(marker.to_string()))?;
        if field.is_empty() {
            return Err(MarkerError::Empty);
        }
        if !fields.iter().any(|f| f == field) {
            fields.push(field.to_string());
        }
        i = close + 2;
    }

    fields.sort();
    Ok(fields)
}

fn find_close(bytes: &[u8], from: usize) -> Option<usize> {
    let mut j = from;
    while j + 1 < bytes.len() {
        if bytes[j] == b'}' && bytes[j + 1] == b'}' {
            return Some(j);
        }
        j += 1;
    }
    None
}

/// Compare the fields the caller declared against the fields that actually appear
/// in the request body. The two must match exactly.
///
/// This is what stops a receipt from understating its own scope: declaring two
/// fields while the body references four is rejected before any traffic leaves.
pub fn reconcile_fields(declared: &[String], found: &[String]) -> Result<Vec<String>, String> {
    let mut declared_sorted: Vec<String> = declared.to_vec();
    declared_sorted.sort();
    declared_sorted.dedup();

    if declared_sorted == found {
        return Ok(declared_sorted);
    }

    let missing: Vec<&String> = found
        .iter()
        .filter(|f| !declared_sorted.contains(f))
        .collect();
    let extra: Vec<&String> = declared_sorted
        .iter()
        .filter(|f| !found.contains(f))
        .collect();

    let mut reason = String::from("declared_fields does not match body_template");
    if !missing.is_empty() {
        reason.push_str(&format!(" — used but not declared: {missing:?}"));
    }
    if !extra.is_empty() {
        reason.push_str(&format!(" — declared but not used: {extra:?}"));
    }
    Err(reason)
}

/// Extract the host name from a URL without pulling in a URL parser.
/// Only the authority part is taken; credentials and port are dropped.
pub fn host_of(url: &str) -> Result<String, String> {
    let rest = url
        .strip_prefix("https://")
        .ok_or_else(|| format!("url must use https: {url}"))?;
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
    let authority = authority.rsplit('@').next().unwrap_or(authority);
    let host = authority.split(':').next().unwrap_or("");
    if host.is_empty() {
        return Err(format!("url tanpa host: {url}"));
    }
    Ok(host.to_string())
}

/// Canonical form of a JSON value. `serde_json::Map` rests on `BTreeMap` as long
/// as the `preserve_order` feature is off, so object keys come out ascending and
/// the result is identical on any machine.
///
/// That property is what makes the digest recomputable outside the node.
pub fn canonical_bytes(value: &Value) -> Result<Vec<u8>, String> {
    serde_json::to_vec(value).map_err(|e| format!("could not render canonical form: {e}"))
}

/// SHA-256 digest over the canonical form. Exactly 32 bytes, which is what
/// `kv-store.set-claims-digest` requires.
pub fn digest_of(value: &Value) -> Result<[u8; 32], String> {
    let bytes = canonical_bytes(value)?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hasher.finalize().into())
}

/// Digest over raw bytes, used for the request-body and response-body
/// fingerprints.
pub fn digest_bytes(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

/// A receipt's identity derives from its own digest, so two issuances with
/// identical content cannot produce two different rows.
pub fn receipt_id_from(digest: &[u8; 32]) -> String {
    format!("rcpt_{}", hex::encode(&digest[..12]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn mengumpulkan_field_profil_urut_dan_unik() {
        let body = r#"{"a":"{{profile.last_name}}","b":"{{profile.first_name}}","c":"{{profile.last_name}}"}"#;
        let fields = collect_profile_fields(body).unwrap();
        assert_eq!(fields, vec!["first_name", "last_name"]);
    }

    #[test]
    fn menolak_marker_di_luar_namespace_profile() {
        let err = collect_profile_fields(r#"{"k":"{{secrets.duffel_api_key}}"}"#).unwrap_err();
        assert_eq!(
            err,
            MarkerError::ForeignNamespace("secrets.duffel_api_key".to_string())
        );
    }

    #[test]
    fn menolak_marker_tanpa_penutup() {
        let err = collect_profile_fields(r#"{"k":"{{profile.first_name"}"#).unwrap_err();
        assert_eq!(err, MarkerError::Unterminated);
    }

    #[test]
    fn menolak_marker_kosong() {
        assert_eq!(
            collect_profile_fields(r#"{"k":"{{}}"}"#).unwrap_err(),
            MarkerError::Empty
        );
    }

    #[test]
    fn teks_tanpa_marker_menghasilkan_daftar_kosong() {
        assert!(collect_profile_fields(r#"{"k":"biasa saja"}"#)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn pengakuan_yang_kurang_ditolak() {
        let found = vec!["email".to_string(), "first_name".to_string()];
        let declared = vec!["first_name".to_string()];
        let err = reconcile_fields(&declared, &found).unwrap_err();
        assert!(err.contains("used but not declared"));
        assert!(err.contains("email"));
    }

    #[test]
    fn pengakuan_yang_berlebih_ditolak() {
        let found = vec!["first_name".to_string()];
        let declared = vec!["first_name".to_string(), "date_of_birth".to_string()];
        let err = reconcile_fields(&declared, &found).unwrap_err();
        assert!(err.contains("declared but not used"));
    }

    #[test]
    fn pengakuan_yang_pas_diterima() {
        let found = vec!["email".to_string(), "first_name".to_string()];
        let declared = vec!["first_name".to_string(), "email".to_string()];
        assert_eq!(reconcile_fields(&declared, &found).unwrap(), found);
    }

    #[test]
    fn membaca_host_dari_url() {
        assert_eq!(host_of("https://api.duffel.com/air/orders").unwrap(), "api.duffel.com");
        assert_eq!(host_of("https://api.duffel.com:443/x?y=1").unwrap(), "api.duffel.com");
        assert!(host_of("http://api.duffel.com").is_err());
    }

    #[test]
    fn bentuk_kanonik_tidak_bergantung_urutan_penulisan() {
        let a = json!({ "b": 1, "a": 2 });
        let b = json!({ "a": 2, "b": 1 });
        assert_eq!(canonical_bytes(&a).unwrap(), canonical_bytes(&b).unwrap());
        assert_eq!(digest_of(&a).unwrap(), digest_of(&b).unwrap());
    }

    #[test]
    fn digest_panjangnya_tiga_puluh_dua_bita() {
        assert_eq!(digest_of(&json!({ "x": 1 })).unwrap().len(), 32);
    }

    #[test]
    fn identitas_receipt_berasal_dari_digest() {
        let d = digest_bytes(b"apa saja");
        let id = receipt_id_from(&d);
        assert!(id.starts_with("rcpt_"));
        assert_eq!(id.len(), 5 + 24);
        assert_eq!(id, receipt_id_from(&d));
    }
}
