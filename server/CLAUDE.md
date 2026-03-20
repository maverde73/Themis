# Themis Server — Metadati Zero-Knowledge

Stack: Node.js 22, Express, TypeScript strict, Prisma, PostgreSQL
Run: npm run dev | Test: npm test | Build: npm run build
API prefix: /api/v1
Auth: JWT Bearer + refresh token
Multi-tenancy: tenant_id su ogni tabella

## VINCOLO FONDAMENTALE
Questo server NON riceve, NON transita, NON archivia il contenuto di nessuna
segnalazione. Gestisce SOLO metadati aggregati, onboarding aziende, SLA,
fatturazione, dashboard analytics. Se una modifica introduce la ricezione di
testo/nomi/descrizioni/allegati dal contenuto delle segnalazioni, è un bug
critico di sicurezza.

## Schema DB (Prisma)

### organizations
- id (UUID), name, plan (starter|professional|enterprise)
- rpg_public_key (Ed25519 della RPG, canale PdR 125)
- odv_public_key (Ed25519 dell'OdV, canale WB)
- relay_urls (JSONB: URL relay Nostr configurati)
- pairing_qr_data (JSONB: id + pubkey RPG + pubkey OdV + relay URLs)
- wb_sla_ack_days (default 7), wb_sla_response_days (default 90)
- pdr_sla_ack_days (default 3), pdr_sla_response_days (default 45)
- subscription_expires, created_at

### report_metadata
- id (UUID, NON è l'ID segnalazione Styx)
- org_id (FK organizations)
- channel (pdr125 | whistleblowing)
- category (PdR: molestia|discriminazione|mobbing|micro|altro.
            WB: penale|amministrativo|contabile|mog231|ue|corruzione|frode|altro)
- status (received|acknowledged|investigating|response_given|
          closed_founded|closed_unfounded|closed_bad_faith)
- identity_revealed (bool, solo flag — server NON conosce l'identità)
- has_attachments (bool)
- received_at, acknowledged_at, response_given_at, closed_at
- sla_ack_deadline, sla_response_deadline
- sla_ack_met (bool), sla_response_met (bool)

### survey_results
- id (UUID), org_id, survey_id, question_id
- response_value (1-10), submitted_at
- Nessuna associazione a identità (dati anonimi aggregati)

## Architettura
src/
├── routes/           # Endpoint API
├── controllers/      # Request/response handling
├── services/         # Business logic (SLA calculation, alerts, analytics)
├── repositories/     # Data access via Prisma
├── middleware/        # Auth JWT, validation zod, error handling, tenant
├── jobs/             # SLA alert scheduler (7gg ack, 60/75/85/90gg response)
├── types/            # TypeScript types/interfaces
└── utils/

## Endpoint principali
- POST /api/v1/organizations — Registrazione azienda
- POST /api/v1/organizations/:id/pairing-qr — Genera QR con dual-key
- POST /api/v1/reports/metadata — Ricezione metadato (dalla dashboard, NON contenuto)
- GET /api/v1/reports/metadata?org_id=&channel= — Lista metadati per dashboard analytics
- GET /api/v1/reports/sla-status?org_id= — Stato SLA per alert
- POST /api/v1/surveys/results — Ricezione risposta survey (anonima aggregata)
- GET /api/v1/analytics/:org_id — Dashboard KPI aggregata

## SLA Alert automatici (Whistleblowing)
- Ack: alert a 5gg, alert rosso a 7gg
- Response: alert a 60gg, 75gg, 85gg, scadenza a 90gg
- Implementare come cron job o scheduler che controlla sla_*_deadline vs now()
