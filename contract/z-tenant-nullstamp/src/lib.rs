//! Nullstamp — verifiable receipts for agent calls that touch personal data.
//!
//! The problem it addresses. An agent doing real work has to touch someone's
//! name, date of birth, and email address. Recording that activity today is
//! caught between two failures: a complete log stores raw data and becomes a
//! liability in its own right, while a redacted log loses completeness and cannot
//! be shown to be intact when audited.
//!
//! This contract takes a third route. Outbound calls go through
//! `http-with-placeholders`, so field values are substituted by the host inside
//! the enclave and never enter WASM memory. What gets recorded is the field names
//! referenced, the destination host, a digest of the request body, and the
//! outcome. All of those claims are bound by one SHA-256 digest, planted in the
//! transaction's Merkle leaf via `kv-store.set-claims-digest`, so they can be
//! recomputed outside the node.
//!
//! # Host capabilities requested
//!
//! ```json
//! {
//!   "host_capabilities": [
//!     "kv_store", "logging", "tenant_context", "http_with_placeholders"
//!   ]
//! }
//! ```
//!
//! `signing` is deliberately absent. Importing it prevents the contract from
//! being instantiated at all — see finding T-12 in docs/BUGS.md. Receipts remain
//! bound through the claims digest, and the reason no signature is present is
//! recorded inside the receipt rather than hidden.
//!
//! # Setup before first use
//!
//! The tenant SDK has to create two maps first, `secrets` and `receipts`, then
//! seed the upstream credential into `secrets`. If `readers` is left empty at map
//! creation the KV governor refuses reads, even when the reader is the very
//! contract that owns the map.
//!
//! Note also that map ACLs bind to the numeric contract id, and every
//! registration mints a new one, so the ACLs must be re-pointed after each
//! re-register (finding T-13). `scripts/src/04b-sync-map-acl.ts` does that.
#![warn(clippy::style, missing_debug_implementations)]
#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

pub const CONTRACT_VERSION: &str = "0.1.9";

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
        let input = req.input.ok_or("issue-receipt: no input supplied")?;
        issue::issue_receipt(&input)
    }

    fn verify_receipt(
        req: exports::z::tenant_nullstamp::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("verify-receipt: no input supplied")?;
        verify::verify_receipt(&input)
    }

    fn list_receipts(
        req: exports::z::tenant_nullstamp::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        // Listing may be requested with no payload; treat that as the defaults.
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
    fn contract_version_is_semver() {
        let parts: Vec<&str> = CONTRACT_VERSION.split('.').collect();
        assert_eq!(parts.len(), 3, "CONTRACT_VERSION must be MAJOR.MINOR.PATCH");
        for b in parts {
            assert!(b.parse::<u32>().is_ok(), "every part must be numeric");
        }
    }
}
