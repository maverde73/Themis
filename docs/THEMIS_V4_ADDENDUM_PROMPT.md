# Themis v4 Addendum — Corrections & New Features

## This addendum supersedes conflicting information in the original prompt.

---

## 1. RESOLVED: identity_revealed contradiction (Section 7.4 vs Allegato B/C)

**Section 7.4 is correct. The server never learns anything from the reporter's app.**

The metadata flow is **two-phase**:

### PHASE 1 — Automatic, from reporter's app at send time
The app sends ONLY three fields to the server via `POST /api/v1/reports/metadata`:
```json
{ "org_id": "...", "channel": "whistleblowing", "received_at": "2026-10-15T14:30:00Z" }
```
The server creates a `report_metadata` row with `status: "received"` and ALL other fields NULL.

### PHASE 2 — Manual, from the manager's app/dashboard after decryption
The RPG/OdV decrypts the report on their mobile device, reads it, then **consciously chooses** to enrich the server metadata via `PUT /api/v1/reports/metadata/:id`:
```json
{ "category": "corruzione", "identity_revealed": true, "has_attachments": true, "status": "acknowledged" }
```

### Implementation rules:

**POST endpoint** (`POST /api/v1/reports/metadata`):
- Accepts ONLY: `org_id`, `channel`, `received_at`
- If the request body contains ANY other field (`identity_revealed`, `has_attachments`, `category`, `status`, or anything else) → **reject with 400 Bad Request** and message: `"Only org_id, channel, received_at accepted at creation time"`
- No authentication required (anonymous, like the survey response endpoint)
- No IP logging

**PUT endpoint** (`PUT /api/v1/reports/metadata/:id`):
- Requires OdV/RPG JWT authentication
- Accepts: `category`, `status`, `identity_revealed`, `has_attachments`, `acknowledged_at`, `response_given_at`, `closed_at`
- Automatically computes `sla_ack_met` and `sla_response_met` booleans based on deadlines

**Prisma schema** for report_metadata:
```prisma
model ReportMetadata {
  id                  String    @id @default(uuid())
  orgId               String    @map("org_id")
  channel             ReportChannel
  receivedAt          DateTime  @map("received_at")

  // Phase 2 fields — nullable, populated via PUT by manager
  category            String?
  status              ReportStatus @default(RECEIVED)
  identityRevealed    Boolean?  @map("identity_revealed")
  hasAttachments      Boolean?  @map("has_attachments")
  acknowledgedAt      DateTime? @map("acknowledged_at")
  responseGivenAt     DateTime? @map("response_given_at")
  closedAt            DateTime? @map("closed_at")

  // Computed SLA fields
  slaAckDeadline      DateTime  @map("sla_ack_deadline")
  slaResponseDeadline DateTime  @map("sla_response_deadline")
  slaAckMet           Boolean?  @map("sla_ack_met")
  slaResponseMet      Boolean?  @map("sla_response_met")

  createdAt           DateTime  @default(now()) @map("created_at")

  organization Organization @relation(fields: [orgId], references: [id])

  @@map("report_metadata")
}

enum ReportChannel {
  PDR125
  WHISTLEBLOWING
}

enum ReportStatus {
  RECEIVED
  ACKNOWLEDGED
  INVESTIGATING
  RESPONSE_GIVEN
  CLOSED_FOUNDED
  CLOSED_UNFOUNDED
  CLOSED_BAD_FAITH
}
```

---

## 2. Three-app architecture

Themis has **three client applications**, not two:

### A) App Themis (Flutter, iOS + Android) — for reporters/employees
- Generates device keypair in hardware enclave
- Scans company QR (receives RPG pubkey + OdV pubkey + relay URLs)
- Two buttons: "Report harassment" (encrypts with RPG key) / "Report misconduct" (encrypts with OdV key)
- Fills surveys (dynamic renderer from JSON schema)
- Rate limiting per-key
- **No account, no login, no identity**

### B) App Themis Gestione (Flutter, iOS + Android) — for RPG and OdV
- **Same codebase as App A**, but with a role switch after authentication
- Generates the manager's keypair in hardware enclave — **this is where the private key lives**
- Receives encrypted reports via Nostr relay, decrypts locally
- Two-way anonymous communication with reporters
- Workflow management (acknowledge, investigate, close)
- Push notifications for new reports
- **Shamir backup (2-of-3) at onboarding** — mandatory, cannot be skipped
- **Bridge QR generation** for connecting to the web dashboard (WhatsApp Web pattern)

### C) Dashboard Web Themis (React) — companion desktop for RPG/OdV
- Statistics, KPIs, audit reports, PDF export, survey editor
- **Does NOT have the private key** — cannot decrypt reports on its own
- **Bridge mode**: shows a QR, the manager scans it with their mobile app, a secure WebSocket channel is established via relay, the mobile app decrypts events and streams plaintext to the browser in real-time
- **Without bridge**: shows only aggregate metadata, KPIs, workflow states without content
- Metadata enrichment: after reading a report (via bridge or mobile), the manager can update category, status, flags on the server
- Survey JSON editor (does not require bridge — survey schemas are not encrypted)

### Implementation note for the bridge:
The bridge reuses existing Styx primitives:
- QR generation → same as company pairing QR but for app↔browser
- Key exchange → SPAKE2 (already in crypto_core)
- Transport → WebSocket over Nostr relay (already in transport package)
- The mobile app acts as a "decryption proxy": browser sends "decrypt event X", app decrypts and returns plaintext over the encrypted channel
- **The private key NEVER leaves the phone** — the browser receives plaintext, not the key

For the MVP, the bridge is **optional** (Phase 2). The MVP ships with:
- Mobile app: full decryption + workflow
- Web dashboard: metadata only + survey editor + KPI charts + audit export

---

## 3. Key Recovery — Shamir Secret Sharing

### 3.1 Onboarding (mandatory, cannot be skipped)

When the RPG/OdV first sets up the App Themis Gestione, after key generation:

1. The app performs **Shamir 2-of-3 split** of the private key using `styx.createIdentityBackup()` (already implemented)
2. The app guides the manager through distributing the 3 shares:

| Share | Custodian | Storage | How |
|-------|-----------|---------|-----|
| Share 1 | The RPG/OdV themselves | Printed on paper, stored in personal safe / safety deposit box | App displays the share as a base64 string or BIP-39 mnemonic with print button. Screen: "Print this and store it in a safe place separate from your phone." |
| Share 2 | The CEO / Legal Representative | Sealed envelope in company safe or with notary | App generates a printable PDF. Screen: "Hand this sealed envelope to the CEO. They cannot use it alone." |
| Share 3 | Themis server (encrypted escrow) | Server database, encrypted with a passphrase only the RPG/OdV knows | App asks for a passphrase (min 12 chars), encrypts the share with AES-256-GCM locally, sends the encrypted blob to `POST /api/v1/organizations/:id/escrow-share`. Server stores the opaque blob. Screen: "Remember this passphrase — you'll need it if you lose your phone." |

3. The app tracks share distribution status. **Onboarding is NOT complete until all 3 shares are confirmed distributed.** The app shows a checklist:
   - ☐ Share 1: printed and stored
   - ☐ Share 2: PDF generated and delivered to CEO
   - ☐ Share 3: passphrase set and escrow uploaded
   
   Until all three are checked, the app shows a persistent banner: "Complete your key backup to protect your reports."

### 3.2 Recovery flow

When the RPG/OdV installs the app on a new device and selects "Recover identity":

```dart
// The app needs any 2 of the 3 shares
final share1 = await promptUserForShare("Enter Share 1 (from your printed backup)");
final share2 = await promptUserForShare("Enter Share 2 (from the CEO's sealed envelope)");
// OR
final share3Encrypted = await api.getEscrowShare(orgId);
final passphrase = await promptUserForPassphrase();
final share3 = decrypt(share3Encrypted, passphrase);

// Reconstruct using Styx
final privateKey = ShamirSecretSharing.reconstruct([shareA, shareB]);

// Import into hardware enclave
await keyStore.importPrivateKey(privateKey);

// Generate new Shamir shares (old ones are compromised)
final newShares = ShamirSecretSharing.split(privateKey, threshold: 2, shares: 3);
// Guide user through redistribution...
```

### 3.3 Server API additions

```
POST   /api/v1/organizations/:id/escrow-share    # Upload encrypted share (RPG/OdV JWT)
GET    /api/v1/organizations/:id/escrow-share     # Download encrypted share (RPG/OdV JWT)
DELETE /api/v1/organizations/:id/escrow-share     # Delete after re-sharing (RPG/OdV JWT)
```

Prisma addition:
```prisma
model EscrowShare {
  id             String   @id @default(uuid())
  orgId          String   @unique @map("org_id")
  role           String   // "rpg" | "odv"
  encryptedShare Bytes    @map("encrypted_share") // AES-256-GCM encrypted blob
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, role])
  @@map("escrow_shares")
}
```

### 3.4 Re-keying (last resort)

If recovery is impossible (fewer than 2 shares available):

1. Manager generates new keypair on new device
2. If old device is accessible: old device signs a **Blessing Event** (`styx.blessNewKey(newPublicKey)`) — already implemented in Styx
3. If old device is gone: Nexa Data admin updates the org's public key after out-of-band identity verification (video call + ID document + CEO confirmation)
4. New company QR is generated and redistributed
5. **Historical reports encrypted with the old key become permanently unreadable** — but the hash chain (audit trail proving their existence and integrity) is preserved

### 3.5 Tests to write

- Shamir split → reconstruct round-trip with all 3 share combinations (1+2, 1+3, 2+3)
- Escrow share upload → download → decrypt round-trip
- Recovery flow with wrong passphrase → clear error message
- Recovery with only 1 share → clear error: "Need at least 2 shares"
- Onboarding blocks report reception until all 3 shares are distributed
- Re-keying: blessing event from old device validates on new device
- Re-keying: old reports unreadable with new key (expected behavior, not a bug)

---

## 4. Updated component diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  App Segnalante  │  E2E  │   Relay Nostr    │  E2E  │  App Gestione    │
│  (Flutter+Styx)  │─────▶│  (self-hosted)   │─────▶│  (Flutter+Styx)  │
│                  │       │                  │       │                  │
│ • 2 buttons      │       │ • Only ciphertext│       │ • HW enclave key │
│ • No account     │       │ • Ephemeral      │       │ • Decrypts here  │
│ • Rate limiting  │       │                  │       │ • Shamir backup  │
└──────┬───────────┘       └──────────────────┘       │ • Bridge QR gen  │
       │                                              └────────┬─────────┘
       │ POST (3 fields only)                                  │
       │ org_id + channel + received_at                        │ Bridge (WebSocket)
       │                                                       │ Phone decrypts,
       ▼                                                       │ streams plaintext
┌──────────────────────────────────────────┐                   │
│           Server Themis                  │                   ▼
│  (Node.js + PostgreSQL)                  │         ┌──────────────────┐
│                                          │◀───────│  Dashboard Web   │
│  • Multi-tenant                          │  PUT    │  (React)         │
│  • Metadata only (Phase 1: 3 fields)     │ (JWT)   │                  │
│  • Enriched by manager (Phase 2: PUT)    │         │ • Stats, KPIs    │
│  • SLA alerts                            │         │ • No private key │
│  • ZERO report content                   │         │ • Survey editor  │
│  • Escrow share (encrypted blob)         │         └──────────────────┘
└──────────────────────────────────────────┘
```

---

## 5. Summary of what changed from v3

| Area | v3 (wrong/incomplete) | v4 (correct) |
|---|---|---|
| Metadata flow | App sends identity_revealed to server | App sends only 3 fields. Manager enriches via PUT after decryption. |
| POST endpoint | Accepted all metadata fields | Accepts ONLY org_id, channel, received_at. Rejects everything else with 400. |
| Client apps | "Dashboard Gestori (React web + Flutter mobile)" — vague | Three explicit apps: Reporter App, Manager App (mobile, has key), Web Dashboard (no key, bridge) |
| Decryption | Implied the web dashboard could decrypt | Only the mobile app decrypts. Web uses bridge (WhatsApp Web pattern). MVP: web is metadata-only. |
| Key recovery | Mentioned Shamir backup briefly | Full spec: 3-share distribution policy, recovery flows, escrow API, re-keying as last resort |
| Onboarding | Manager could skip backup | Backup is mandatory. Onboarding is blocked until all 3 shares are distributed. |
