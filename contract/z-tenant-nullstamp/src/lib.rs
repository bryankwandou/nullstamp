//! Nullstamp — bukti terverifikasi untuk panggilan agent yang menyentuh data
//! pribadi.
//!
//! Masalahnya begini. Agent yang mengurus hal nyata harus menyentuh nama,
//! tanggal lahir, dan alamat surel seseorang. Cara mencatat aktivitas itu hari
//! ini terjepit di antara dua kegagalan: catatan yang lengkap menyimpan data
//! mentah sehingga catatan itu sendiri menjadi risiko kebocoran, sementara
//! catatan yang diredaksi kehilangan kelengkapan sehingga tidak bisa dibuktikan
//! utuh saat diperiksa.
//!
//! Contract ini memilih jalan ketiga. Panggilan keluar dikirim lewat
//! `http-with-placeholders`, jadi nilai field diselesaikan host di dalam enclave
//! dan tidak pernah masuk memori WASM. Yang dicatat adalah nama field yang
//! dirujuk, host tujuan, sidik badan permintaan, dan hasil panggilannya. Semua
//! pernyataan itu diikat satu digest SHA-256 yang ditanam ke Merkle leaf
//! transaksi lewat `kv-store.set-claims-digest`, sehingga bisa diperiksa ulang
//! di luar node.
//!
//! # Kemampuan host yang diminta
//!
//! ```json
//! {
//!   "host_capabilities": [
//!     "kv_store", "logging", "tenant_context", "http_with_placeholders", "signing"
//!   ]
//! }
//! ```
//!
//! `signing` bersifat pelengkap. Bila tidak diberikan, receipt tetap terbit dan
//! tetap terikat lewat claims digest; alasan ketiadaan tanda tangan dicatat di
//! dalam receipt daripada disembunyikan.
//!
//! # Persiapan sebelum pemakaian pertama
//!
//! Tenant SDK harus membuat dua map lebih dulu, `secrets` dan `receipts`, lalu
//! menanam kredensial upstream ke `secrets`. Bila `readers` dikosongkan saat
//! pembuatan map, governor KV menolak pembacaan meskipun yang membaca adalah
//! contract pemilik map itu sendiri.
#![warn(clippy::style, missing_debug_implementations)]
#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

pub const CONTRACT_VERSION: &str = "0.1.0";

wit_bindgen::generate!({
    world: "tenant-nullstamp",
    path: "wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

pub mod canon;
pub mod issue;
pub mod list;
pub mod receipt;
pub mod verify;

struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::z::tenant_nullstamp::contracts::Guest for Component {
    fn issue_receipt(
        req: exports::z::tenant_nullstamp::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("issue-receipt: input tidak dikirim")?;
        issue::issue_receipt(&input)
    }

    fn verify_receipt(
        req: exports::z::tenant_nullstamp::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("verify-receipt: input tidak dikirim")?;
        verify::verify_receipt(&input)
    }

    fn list_receipts(
        req: exports::z::tenant_nullstamp::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        // Daftar boleh diminta tanpa payload; anggap sebagai permintaan bawaan.
        let input = req.input.unwrap_or_default();
        list::list_receipts(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);

#[cfg(test)]
mod tests {
    use super::CONTRACT_VERSION;

    #[test]
    fn versi_contract_berbentuk_semver() {
        let bagian: Vec<&str> = CONTRACT_VERSION.split('.').collect();
        assert_eq!(bagian.len(), 3, "CONTRACT_VERSION harus MAJOR.MINOR.PATCH");
        for b in bagian {
            assert!(b.parse::<u32>().is_ok(), "setiap bagian harus angka");
        }
    }
}
