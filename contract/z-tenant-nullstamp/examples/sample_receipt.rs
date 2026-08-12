//! Cetak satu sampul receipt contoh ke keluaran standar.
//!
//! Gunanya membuktikan kesetaraan lintas bahasa. Sampul yang dicetak di sini
//! disusun oleh kode yang sama dengan yang berjalan di dalam enclave, lalu
//! diperiksa oleh `scripts/src/verify-offline.ts` yang tidak memakai Rust sama
//! sekali. Bila kedua sisi menghitung digest yang sama, bentuk kanoniknya memang
//! bisa diulang siapa pun.
//!
//! Jalankan:
//!   cargo run --example sample_receipt --target <host-triple>

use z_tenant_nullstamp::receipt::{self, CoreParams};

fn main() {
    let core = receipt::build_core(&CoreParams {
        schema: "nullstamp.receipt.v1",
        contract_version: z_tenant_nullstamp::CONTRACT_VERSION,
        tenant_did_hex: "9f2a4c7b1e5d8a3f6b0c2d4e6f8a1b3c5d7e9f00".to_string(),
        contract_id: 41,
        subject_did_hex: Some("3c5d7e9f001122334455667788990aabbccddeef".to_string()),
        purpose: "peragaan_penerbitan_bukti".to_string(),
        method: "POST".to_string(),
        target_url: "https://postman-echo.com/post".to_string(),
        target_host: "postman-echo.com".to_string(),
        fields_used: vec!["first_name".to_string(), "last_name".to_string()],
        request_body_sha256:
            "7d3a1f0c9b8e6d5a4c3b2a1908f7e6d5c4b3a2910f8e7d6c5b4a39281706f5e4d".to_string(),
        response_code: 200,
        response_body_sha256:
            "1a2b3c4d5e6f70819293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f7081".to_string(),
        extracted_pointers: vec!["/json/keperluan".to_string()],
        issued_at_secs: 1_786_457_685,
        seq_no: 10_482,
    });

    let sealed = receipt::seal(core).expect("penyusunan digest gagal");
    let env = receipt::envelope(
        &sealed,
        None,
        Some("capability signing tidak diberikan pada contract ini".to_string()),
    );

    println!(
        "{}",
        serde_json::to_string_pretty(&env).expect("penyusunan JSON gagal")
    );
}
