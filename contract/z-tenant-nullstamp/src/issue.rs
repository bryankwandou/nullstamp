//! `issue-receipt` — jalankan satu panggilan keluar yang membawa marker profil,
//! lalu terbitkan bukti atas panggilan itu.
//!
//! Urutannya disusun supaya tidak ada lalu lintas keluar sebelum semua aturan
//! terpenuhi: baca masukan, samakan pengakuan field dengan isi badan permintaan,
//! baru panggil host. Receipt terbit setelah tanggapan diterima, memuat kode
//! status dan sidik badan, bukan isinya.

use serde::Deserialize;
use serde_json::Value;

use crate::canon;

pub const SCHEMA: &str = "nullstamp.receipt.v1";

/// Kunci bawaan tempat kredensial upstream dicari di map `secrets`.
const DEFAULT_SECRET_HEADER: &str = "Authorization";
const DEFAULT_SECRET_PREFIX: &str = "Bearer ";

#[derive(Debug, Deserialize)]
pub struct IssueReq {
    /// Alasan panggilan ini dilakukan, dicatat apa adanya di receipt.
    pub purpose: String,
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: Vec<(String, String)>,
    /// Field profil yang pemanggil akui akan dipakai.
    #[serde(default)]
    pub declared_fields: Vec<String>,
    /// Badan permintaan, boleh memuat marker `{{profile.<field>}}`.
    #[serde(default)]
    pub body_template: Option<Value>,
    /// Kunci di map `secrets` yang nilainya dipasang sebagai kredensial.
    #[serde(default)]
    pub secret_key: Option<String>,
    #[serde(default)]
    pub secret_header: Option<String>,
    #[serde(default)]
    pub secret_prefix: Option<String>,
    /// Penunjuk JSON yang ingin ditarik dari tanggapan. Bawaannya kosong.
    #[serde(default)]
    pub extract: Vec<String>,
}

/// Hasil pemeriksaan masukan. Semua yang dibutuhkan tahap berikutnya sudah
/// berbentuk final di sini, jadi bagian yang menyentuh host tinggal mengeksekusi.
#[derive(Debug)]
pub struct Checked {
    pub purpose: String,
    pub method: String,
    pub url: String,
    pub host: String,
    pub headers: Vec<(String, String)>,
    pub fields_used: Vec<String>,
    pub body_bytes: Vec<u8>,
    pub body_sha256: String,
    pub secret_key: Option<String>,
    pub secret_header: String,
    pub secret_prefix: String,
    pub extract: Vec<String>,
}

/// Periksa masukan tanpa menyentuh host sama sekali.
///
/// Bagian ini yang menegakkan janji Nullstamp. Bila pengakuan field tidak sama
/// dengan marker yang benar-benar ada di badan permintaan, panggilan dibatalkan
/// di sini, sebelum satu bita pun keluar.
pub fn check(input: &[u8]) -> Result<Checked, String> {
    let req: IssueReq =
        serde_json::from_slice(input).map_err(|e| format!("issue-receipt: masukan tidak sah: {e}"))?;

    if req.purpose.trim().is_empty() {
        return Err("issue-receipt: purpose tidak boleh kosong".to_string());
    }

    let method = normalise_method(&req.method)?;
    let host = canon::host_of(&req.url)?;

    let body_bytes = match &req.body_template {
        Some(v) => canon::canonical_bytes(v)?,
        None => Vec::new(),
    };
    let body_text = core::str::from_utf8(&body_bytes)
        .map_err(|e| format!("issue-receipt: badan permintaan bukan UTF-8: {e}"))?;

    let found = canon::collect_profile_fields(body_text)
        .map_err(|e| format!("issue-receipt: {e}"))?;
    let fields_used = canon::reconcile_fields(&req.declared_fields, &found)
        .map_err(|e| format!("issue-receipt: {e}"))?;

    for (name, _) in &req.headers {
        if name.eq_ignore_ascii_case("authorization") {
            return Err(
                "issue-receipt: jangan kirim header Authorization sendiri; pakai secret_key supaya kredensial tetap di dalam enclave"
                    .to_string(),
            );
        }
    }

    let body_sha256 = hex::encode(canon::digest_bytes(&body_bytes));

    Ok(Checked {
        purpose: req.purpose,
        method,
        url: req.url,
        host,
        headers: req.headers,
        fields_used,
        body_bytes,
        body_sha256,
        secret_key: req.secret_key,
        secret_header: req
            .secret_header
            .unwrap_or_else(|| DEFAULT_SECRET_HEADER.to_string()),
        secret_prefix: req
            .secret_prefix
            .unwrap_or_else(|| DEFAULT_SECRET_PREFIX.to_string()),
        extract: req.extract,
    })
}

fn normalise_method(m: &str) -> Result<String, String> {
    let upper = m.trim().to_ascii_uppercase();
    match upper.as_str() {
        "GET" | "POST" | "PUT" | "PATCH" | "DELETE" => Ok(upper),
        other => Err(format!("issue-receipt: metode tidak dikenal: {other}")),
    }
}

/// Tarik penunjuk JSON yang diminta dari tanggapan. Penunjuk yang tidak ada
/// dicatat sebagai null, bukan menggagalkan penerbitan — receipt tetap perlu
/// terbit meski bentuk tanggapan upstream berubah.
pub fn extract_pointers(body: &[u8], pointers: &[String]) -> Value {
    if pointers.is_empty() {
        return Value::Object(serde_json::Map::new());
    }
    let parsed: Value = serde_json::from_slice(body).unwrap_or(Value::Null);
    let mut out = serde_json::Map::new();
    for p in pointers {
        let found = parsed.pointer(p).cloned().unwrap_or(Value::Null);
        out.insert(p.clone(), found);
    }
    Value::Object(out)
}

/// Titik masuk yang dipanggil `lib.rs`.
pub fn issue_receipt(input: &[u8]) -> Result<Vec<u8>, String> {
    let checked = check(input)?;

    #[cfg(target_arch = "wasm32")]
    {
        let env = wasm::run(checked)?;
        serde_json::to_vec(&env).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = checked;
        Err("issue_receipt hanya berjalan pada target wasm32".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use crate::host::{
        interfaces::{http_with_placeholders as hwp, kv_store, logging},
        tenant::tenant_context,
    };
    use crate::receipt::{self, CoreParams};

    pub fn run(c: Checked) -> Result<Value, String> {
        let tid = tenant_context::tenant_did();
        // Catatan: `tenant-did` mengembalikan bentuk mentah 20 bita menurut
        // WIT-nya, jadi harus di-hex dulu untuk menyusun nama map. Halaman
        // walkthrough menyatakan sebaliknya; lihat docs/BUGS.md.
        let tid_hex = hex::encode(&tid);

        let mut headers = c.headers.clone();
        if let Some(key) = &c.secret_key {
            let secret = read_secret(&tid_hex, key)?;
            headers.push((
                c.secret_header.clone(),
                format!("{}{}", c.secret_prefix, secret),
            ));
        }

        let _ = logging::info(&format!(
            "nullstamp: calling {} {} for {} with {} profile fields",
            c.method,
            c.host,
            c.purpose,
            c.fields_used.len()
        ));

        let resp = hwp::call(&hwp::Request {
            method: verb_of(&c.method),
            url: c.url.clone(),
            headers: Some(headers),
            payload: if c.body_bytes.is_empty() {
                None
            } else {
                Some(c.body_bytes.clone())
            },
        })
        .map_err(|e| format!("nullstamp: outbound call failed: {}", describe(e)))?;

        let core = receipt::build_core(&CoreParams {
            schema: SCHEMA,
            contract_version: crate::CONTRACT_VERSION,
            tenant_did_hex: tid_hex.clone(),
            contract_id: tenant_context::contract_id(),
            subject_did_hex: tenant_context::calling_user_did().map(hex::encode),
            purpose: c.purpose.clone(),
            method: c.method.clone(),
            target_url: c.url.clone(),
            target_host: c.host.clone(),
            fields_used: c.fields_used.clone(),
            request_body_sha256: c.body_sha256.clone(),
            response_code: resp.code,
            response_body_sha256: hex::encode(canon::digest_bytes(&resp.payload)),
            extracted_pointers: c.extract.clone(),
            issued_at_secs: tenant_context::cluster_timestamp_secs(),
            seq_no: tenant_context::seq_no(),
        });

        let sealed = receipt::seal(core)?;

        // Digest ditanam di Merkle leaf transaksi. Inilah yang membuat receipt
        // bisa diperiksa di luar node, terlepas dari ada atau tidaknya tanda
        // tangan.
        kv_store::set_claims_digest(&sealed.digest.to_vec())
            .map_err(|e| format!("nullstamp: could not plant claims digest: {e}"))?;

        let (signature, signing_error) = sign_core(&sealed.digest);
        let env = receipt::envelope(&sealed, signature, signing_error);

        let map = format!("z:{tid_hex}:receipts");
        let stored = serde_json::to_vec(&env).map_err(|e| e.to_string())?;
        kv_store::put(&map, sealed.receipt_id.as_bytes(), &stored)
            .map_err(|e| format!("nullstamp: could not store receipt in {map}: {e}"))?;

        let _ = logging::info(&format!(
            "nullstamp: receipt {} issued, upstream status {}",
            sealed.receipt_id, resp.code
        ));

        let mut env = env;
        env["extracted"] = extract_pointers(&resp.payload, &c.extract);
        Ok(env)
    }

    /// Tanda tangan cluster tidak diambil.
    ///
    /// Versi 0.1.0 meng-import `host:interfaces/signing@2.1.0`, dan akibatnya
    /// contract gagal diinstansiasi: setiap pemanggilan dijawab "Internal error"
    /// HTTP 500 tanpa satu baris pun masuk log contract, termasuk pemanggilan
    /// fungsi yang tidak menyentuh penandaan sama sekali. Antarmuka itu ada di
    /// `host-interfaces-2.1.0/package.wit` baris 159, tetapi tampaknya tidak
    /// diberikan kepada tenant contract. Repo acuan resmi juga tidak
    /// meng-import-nya. Rincian pada temuan T-12 di docs/BUGS.md.
    ///
    /// Keutuhan receipt tidak bergantung pada tanda tangan ini. Digest-nya
    /// ditambatkan lewat `kv-store.set-claims-digest`, yang menanamnya ke Merkle
    /// leaf transaksi, dan itulah dasar pemeriksaan di luar node.
    fn sign_core(_digest: &[u8; 32]) -> (Option<Value>, Option<String>) {
        (
            None,
            Some(
                "signing capability not imported; integrity rests on the claims digest"
                    .to_string(),
            ),
        )
    }

    fn read_secret(tid_hex: &str, key: &str) -> Result<String, String> {
        let map = format!("z:{tid_hex}:secrets");
        let bytes = kv_store::get(&map, key.as_bytes())
            .map_err(|e| format!("nullstamp: could not read {map}: {e}"))?
            .ok_or_else(|| {
                format!("nullstamp: key {key} is not in {map}; seed it via the tenant SDK first")
            })?;
        String::from_utf8(bytes).map_err(|e| format!("nullstamp: credential is not UTF-8: {e}"))
    }

    fn verb_of(m: &str) -> hwp::Verb {
        match m {
            "GET" => hwp::Verb::Get,
            "PUT" => hwp::Verb::Put,
            "PATCH" => hwp::Verb::Patch,
            "DELETE" => hwp::Verb::Delete,
            _ => hwp::Verb::Post,
        }
    }

    /// Terjemahkan galat host menjadi kalimat yang bisa dibaca, tanpa pernah
    /// menyertakan nilai profil.
    fn describe(e: hwp::HttpError) -> String {
        match e {
            hwp::HttpError::EgressDenied(host) => format!(
                "host {host} belum ada di grant pengguna; tambahkan lewat agent-auth-update"
            ),
            hwp::HttpError::PlaceholderDenied(marker) => {
                format!("marker {marker} tidak diizinkan")
            }
            hwp::HttpError::PlaceholderUnknown(field) => {
                format!("profil pengguna belum punya field {field}")
            }
            hwp::HttpError::PlaceholderNoUserContext => {
                "tidak ada sesi pengguna yang terikat, marker profil tidak bisa diselesaikan"
                    .to_string()
            }
            hwp::HttpError::UpstreamError(reason) => format!("upstream: {reason}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn masukan(v: Value) -> Vec<u8> {
        serde_json::to_vec(&v).unwrap()
    }

    #[test]
    fn masukan_yang_pas_lolos_pemeriksaan() {
        let c = check(&masukan(json!({
            "purpose": "flight_booking",
            "method": "post",
            "url": "https://api.duffel.com/air/orders",
            "declared_fields": ["first_name", "last_name"],
            "body_template": { "g": "{{profile.first_name}}", "f": "{{profile.last_name}}" },
            "secret_key": "duffel_api_key"
        })))
        .unwrap();

        assert_eq!(c.method, "POST");
        assert_eq!(c.host, "api.duffel.com");
        assert_eq!(c.fields_used, vec!["first_name", "last_name"]);
        assert_eq!(c.secret_header, "Authorization");
        assert_eq!(c.secret_prefix, "Bearer ");
        assert_eq!(c.body_sha256.len(), 64);
    }

    #[test]
    fn pengakuan_field_yang_kurang_membatalkan_sebelum_panggilan() {
        let err = check(&masukan(json!({
            "purpose": "flight_booking",
            "method": "POST",
            "url": "https://api.duffel.com/air/orders",
            "declared_fields": ["first_name"],
            "body_template": { "g": "{{profile.first_name}}", "e": "{{profile.verified_contacts.email.value}}" }
        })))
        .unwrap_err();
        assert!(err.contains("dipakai tapi tidak diakui"));
    }

    #[test]
    fn marker_ke_namespace_secrets_ditolak() {
        let err = check(&masukan(json!({
            "purpose": "x",
            "method": "POST",
            "url": "https://api.duffel.com/x",
            "declared_fields": [],
            "body_template": { "k": "{{secrets.duffel_api_key}}" }
        })))
        .unwrap_err();
        assert!(err.contains("di luar namespace profile"));
    }

    #[test]
    fn header_authorization_buatan_pemanggil_ditolak() {
        let err = check(&masukan(json!({
            "purpose": "x",
            "method": "GET",
            "url": "https://api.duffel.com/x",
            "headers": [["authorization", "Bearer bocor"]]
        })))
        .unwrap_err();
        assert!(err.contains("pakai secret_key"));
    }

    #[test]
    fn url_tanpa_tls_ditolak() {
        let err = check(&masukan(json!({
            "purpose": "x",
            "method": "GET",
            "url": "http://api.duffel.com/x"
        })))
        .unwrap_err();
        assert!(err.contains("https"));
    }

    #[test]
    fn metode_asing_ditolak() {
        let err = check(&masukan(json!({
            "purpose": "x",
            "method": "TRACE",
            "url": "https://api.duffel.com/x"
        })))
        .unwrap_err();
        assert!(err.contains("metode tidak dikenal"));
    }

    #[test]
    fn purpose_kosong_ditolak() {
        let err = check(&masukan(json!({
            "purpose": "   ",
            "method": "GET",
            "url": "https://api.duffel.com/x"
        })))
        .unwrap_err();
        assert!(err.contains("purpose tidak boleh kosong"));
    }

    #[test]
    fn masukan_bukan_json_ditolak() {
        assert!(check(b"bukan json").unwrap_err().contains("tidak sah"));
    }

    #[test]
    fn badan_permintaan_kosong_menghasilkan_daftar_field_kosong() {
        let c = check(&masukan(json!({
            "purpose": "ping",
            "method": "GET",
            "url": "https://api.duffel.com/ping"
        })))
        .unwrap();
        assert!(c.fields_used.is_empty());
        assert!(c.body_bytes.is_empty());
    }

    #[test]
    fn penunjuk_kosong_tidak_menarik_apa_pun() {
        let v = extract_pointers(br#"{"data":{"id":"ord_1"}}"#, &[]);
        assert_eq!(v, json!({}));
    }

    #[test]
    fn penunjuk_yang_ada_ditarik() {
        let v = extract_pointers(
            br#"{"data":{"id":"ord_1","booking_reference":"ABC123"}}"#,
            &["/data/id".to_string(), "/data/booking_reference".to_string()],
        );
        assert_eq!(v["/data/id"], "ord_1");
        assert_eq!(v["/data/booking_reference"], "ABC123");
    }

    #[test]
    fn penunjuk_yang_tidak_ada_menjadi_null_bukan_galat() {
        let v = extract_pointers(br#"{"data":{}}"#, &["/data/id".to_string()]);
        assert!(v["/data/id"].is_null());
    }

    #[test]
    fn tanggapan_bukan_json_tidak_menggagalkan_penarikan() {
        let v = extract_pointers(b"<html>error</html>", &["/data/id".to_string()]);
        assert!(v["/data/id"].is_null());
    }

    #[test]
    fn jalur_non_wasm_menolak_dengan_jelas() {
        let err = issue_receipt(&masukan(json!({
            "purpose": "x",
            "method": "GET",
            "url": "https://api.duffel.com/x"
        })))
        .unwrap_err();
        assert!(err.contains("wasm32"));
    }
}
