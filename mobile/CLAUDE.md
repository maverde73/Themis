# Themis Mobile — App Segnalante

Stack: Flutter 3.x, Dart 3.x, Riverpod, GoRouter
Run: flutter run | Test: flutter test | Build: flutter build apk
Dipendenza: styx (path dependency locale ../styx/packages/styx)

## Cosa fa questa app
I dipendenti la installano, scansionano un QR aziendale, e possono inviare
segnalazioni crittografate E2E a due destinatari distinti:
- "Segnala molestia" → cripta con chiave pubblica RPG (canale PdR 125)
- "Segnala illecito" → cripta con chiave pubblica OdV (canale WB)
Nessun account, nessun login, nessuna associazione chiave→identità.

## Flusso critico: Pairing dual-key
1. App genera coppia chiavi Ed25519/X25519 in hardware enclave (Keystore Android / Secure Enclave iOS)
2. Dipendente scansiona QR aziendale
3. QR contiene: org_id + pubkey RPG + pubkey OdV + relay URLs
4. Key exchange SPAKE2 (se remoto) o diretto (se QR)
5. App salva entrambe le chiavi pubbliche in storage crittografato (Drift + SQLCipher)
6. Da qui in poi: due bottoni in home, due canali, due ledger Styx indipendenti

## Form segnalazione PdR 125 (tipo evento: segnalazione_pdr125)
Payload crittografato con chiave RPG. Campi:
- category (array): molestia_sessuale|discriminazione_genere|mobbing|
  linguaggio_offensivo|microaggressione|disparita_retributiva|altro
- description (obbligatorio), when, where, frequency
- people_involved, witnesses, previous_report, impact
- wants_contact (bool), contact_info (se true)
- MAI campo identificazione — PdR 125 richiede anonimato

## Form segnalazione WB (tipo evento: segnalazione_wb)
Payload crittografato con chiave OdV. Campi:
- violation_type (array): penale|amministrativo|contabile|mog231|
  diritto_ue|corruzione|conflitto_interessi|danno_ambientale|frode|altro
- description (obbligatorio), when, where, people_involved
- witnesses_evidence, attachment_event_ids (array)
- previous_report: prima_volta|interno|anac|autorita_giudiziaria
- identity_revealed (obbligatorio): false=anonimo, true=identificato
- identity_name, identity_role, identity_contact (se revealed=true)
- anonymous_contact (se revealed=false, opzionale)

## Allegati crittografati (solo WB)
- Ogni file è un evento Styx tipo "attachment" con parent_event_id
- Crittografato individualmente con stessa chiave OdV
- Campi: filename, mime_type, size_bytes, data (base64 crittografato)
- Limiti: configurabili per azienda (default max 5 file, max 10MB ciascuno)

## Rate limiting anti-spam
- Lato app: max N segnalazioni per periodo per chiave pubblica (configurabile per canale)
- Lato relay: rate limiting per pubkey (es. max 5 eventi/ora)

## Comunicazione bidirezionale
- Il gestore (RPG o OdV) invia messaggio crittografato con pubkey segnalante
- L'app riceve via relay + push notification (push_bridge, 3 profili privacy)
- Il segnalante risponde — tutto anonimo, tutto E2E

## Architettura
lib/
├── main.dart
├── app/
│   ├── router.dart           # GoRouter: home, pairing, form pdr, form wb, chat, settings
│   ├── theme.dart
│   └── l10n/                 # Localizzazione IT (primaria) + EN
├── features/
│   ├── pairing/              # Scansione QR, key exchange, storage chiavi
│   │   ├── pages/
│   │   ├── providers/
│   │   └── services/
│   ├── report_pdr/           # Form segnalazione PdR 125
│   │   ├── pages/
│   │   ├── widgets/          # Form fields, validation
│   │   └── providers/
│   ├── report_wb/            # Form segnalazione WB
│   │   ├── pages/
│   │   ├── widgets/          # Form fields, attachments, identity toggle
│   │   └── providers/
│   ├── chat/                 # Comunicazione bidirezionale anonima
│   │   ├── pages/
│   │   └── providers/
│   ├── history/              # Storico segnalazioni inviate
│   └── settings/             # Profilo privacy push, rate limit info
├── core/
│   ├── styx/                 # Wrapper SovereignLedger
│   │   ├── styx_service.dart # Init, pairing, send, receive, history
│   │   └── event_types.dart  # Mapping tipi evento Themis → Styx
│   ├── crypto/               # Hardware enclave access, key management
│   ├── network/              # Connectivity check, relay status
│   └── constants.dart
└── shared/
    ├── widgets/              # Componenti UI condivisi
    └── utils/

## Pattern
- Riverpod per stato (un provider per feature)
- GoRouter per navigazione
- Styx SovereignLedger come singola istanza gestita da un provider Riverpod
- Due ledger Styx separati: uno per canale PdR, uno per canale WB
- Repository pattern per interazione con Styx

## Dopo modifiche a styx/
Lancia SEMPRE: cd styx && melos run test:all E flutter test qui.
