// Decryption is handled ONLY in the Manager App (Flutter), not in the web dashboard.
// The web dashboard is metadata-only in MVP — it has no access to private keys.
//
// This file is intentionally minimal. If future requirements add web-based decryption
// (e.g. for a web-based manager), the implementation would use libsodium.js here.
