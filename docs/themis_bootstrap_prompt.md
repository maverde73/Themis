# PROMPT DI BOOTSTRAP — Progetto Themis

> **Istruzioni**: Incolla questo prompt in una nuova chat Claude, allegando il file `themis_technical_architecture_v2_with_WB.docx` come documento di riferimento. Questo prompt contiene tutto il contesto necessario per iniziare la progettazione e pianificazione dettagliata del progetto.

---

## CHI SONO

Sono il co-fondatore e technical lead di **Nexa Data srl**, un'azienda italiana di sviluppo software. Lavoro con un collega, **Maurizio Verde** (mverde@nexadata.it), su progetti che condividono la stessa infrastruttura. Il mio stack primario: Node.js/Express, Prisma, PostgreSQL, React (Webpack Module Federation microfrontend), Flutter/Dart, Python/FastAPI. Workstation Fedora Linux (Ryzen 5900X, RTX 4070 Ti, 32GB RAM). Preferisco comunicazione diretta, concisa e tecnica.

## IL CONTESTO AZIENDALE

Nexa Data sviluppa diversi prodotti software, tra cui:

- **Portaal**: portale aziendale interno (Node.js/Express/Prisma/PostgreSQL + React microfrontend). È il portale che usiamo internamente e che i nostri clienti usano. Ha dashboard dinamiche con role-based access, Apache ECharts, subagent CSS.
- **Moobee**: engine di allocazione staff per aziende project-based (80-300 dipendenti), algoritmo ILP/HiGHS con 5 modalità operative.
- **Styx**: libreria Dart/Flutter per ledger crittografici P2P — Ed25519, X25519, SPAKE2, SHA-256, BIP-39, Shamir SSS, Nostr transport, GDPR pruning. 389 test, 6 package. Monorepo con Melos.
- **Themis**: il nuovo prodotto SaaS per compliance UNI/PdR 125:2022 e D.Lgs. 24/2023 (Whistleblowing). **È l'oggetto di questa chat.**

Stack hosting EU: Hetzner/OVH (no AWS per scelta architetturale europea).

## IL PRODOTTO THEMIS — SINTESI

Themis è una piattaforma SaaS **zero-knowledge** per la gestione delle segnalazioni aziendali, costruita sulla libreria Styx. Il suo vantaggio competitivo unico: il contenuto delle segnalazioni è crittografato end-to-end tra segnalante e destinatario — **il server Themis non ha mai accesso ai contenuti**.

### Tre canali integrati in un'unica app

1. **Segnalazione Abusi/Molestie (PdR 125)**: canale anonimo, destinatario = RPG (Responsabile Parità di Genere), crittografato con chiave pubblica RPG.
2. **Whistleblowing (D.Lgs. 24/2023)**: canale con riservatezza + opzione identificazione volontaria, destinatario = OdV (Organismo di Vigilanza), crittografato con chiave pubblica OdV, SLA legali obbligatori (7gg avviso, 3 mesi riscontro), supporto allegati crittografati.
3. **Questionario Conciliazione Vita-Lavoro**: survey anonimo aggregato, dati transitano dal server (non E2E perché sono anonimi per natura e destinati all'analisi aggregata).

### Architettura dual-key

- L'app mobile (Flutter+Styx) genera chiavi locali, fa pairing via QR aziendale che contiene **due chiavi pubbliche** (RPG + OdV).
- Due bottoni nell'app: "Segnala molestia" (cripta con chiave RPG) e "Segnala illecito" (cripta con chiave OdV).
- I blob crittografati transitano sui relay Nostr (self-hosted EU + fallback pubblici).
- Le dashboard RPG e OdV sono crittograficamente isolate: l'RPG non può leggere il WB e viceversa.
- Il server Themis vede SOLO metadati aggregati: canale, tipo, stato, timestamp, SLA. Mai contenuti.
- Anti-spam: rate limiting crittografico per chiave pubblica (client-side + relay-side).

### Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| App segnalante | Flutter + Styx (iOS + Android) |
| Dashboard RPG | React (web) + Flutter (mobile) |
| Dashboard OdV | React (web) + Flutter (mobile) |
| Server Themis | Node.js / Express / Prisma / PostgreSQL (stack Portaal) |
| Relay Nostr | strfry (self-hosted) + relay pubblici fallback |
| Push notifications | push_bridge_server (Go) — 3 profili privacy |
| Storage locale | Drift + SQLCipher (AES-256) |
| Crittografia | Ed25519, X25519, ChaCha20-Poly1305, SPAKE2, SHA-256, HKDF, Shamir 2-of-3, BIP-39 |

## MERCATO E POSIZIONAMENTO

- **PdR 125**: 38.652 siti certificati (set. 2025), certificazione volontaria ma con forti incentivi (sgravio INPS fino a €50k/anno, punteggio premiale gare pubbliche).
- **Whistleblowing**: obbligatorio per legge per aziende 50+ dipendenti (~30.000-35.000 imprese in Italia). Sanzioni ANAC €10k-€50k per non conformità.
- **Competitor**: DigitalPA/Legality WB (da €468/anno, centralizzato, no E2E), Whistlelink (da €1.788/anno, centralizzato), ISWEB (PdR 125 ma no WB integrato). **Nessuno offre zero-knowledge E2E + PdR 125 + WB + Survey in un'unica soluzione.**
- **Pricing Themis**: Starter €1.490/anno (50-100 dip.), Professional €2.490 (100-250), Enterprise €4.490 (250+). WB incluso in tutti i piani.
- **Canali distribuzione**: 62 organismi di certificazione accreditati Accredia, consulenti PdR 125, associazioni datoriali, direct sales.

## NORMATIVA DI RIFERIMENTO (requisiti chiave implementati)

### UNI/PdR 125:2022
- Punto 6.3.2.6 lett. d): metodologia di segnalazione **anonima** per abusi/molestie
- KPI 5.2.2 (10 punti): esprimere opinioni in modalità anonima
- KPI 5.2.6 (20 punti): analisi percezione dipendenti (survey annuale)
- KPI 5.4.6 (10 punti): referenti e prassi tutela ambiente lavoro

### D.Lgs. 24/2023 (Whistleblowing)
- Art. 4: canale interno con crittografia, riservatezza identità
- Art. 5: avviso ricevimento 7gg, riscontro 3 mesi
- Art. 12: identità segnalante non rivelabile senza consenso
- Art. 13.6: DPIA obbligatoria
- Art. 14: conservazione 5 anni
- Art. 16.3: segnalazione in malafede sanzionabile
- Art. 17-21: tutele anti-ritorsione per segnalanti identificati
- Linee Guida ANAC 2025 (Del. 478/2025): piattaforme informatiche con crittografia, escluse email/PEC

### GDPR
- Art. 25: privacy by design (architettura zero-knowledge)
- Art. 32: sicurezza (E2E, hardware enclave, SQLCipher)
- Art. 35: DPIA semplificata (server non tratta dati personali dei contenuti)
- Art. 44-49: nessun trasferimento extra-UE (server EU, relay EU)

## DECISIONI ARCHITETTURALI GIÀ PRESE

1. **Styx è il core crittografico** — non si riscrive, si usa così com'è (389 test, 6 package maturi).
2. **Server Themis riusa lo stack Portaal** (Node.js/Express/Prisma/PostgreSQL) per minimizzare il tempo di sviluppo e condividere infrastruttura.
3. **Un'unica app Flutter** per i segnalanti (non due app separate PdR/WB).
4. **Dashboard web React** come interfaccia primaria per RPG e OdV (più Flutter mobile come companion).
5. **Relay Nostr self-hosted** (strfry) come primario, relay pubblici come fallback.
6. **Il WB è nel MVP** (Fase 1), non posticipato alla Fase 2 — il mercato WB è obbligatorio per legge e più grande del mercato PdR 125.
7. **Hosting EU** (Hetzner/OVH), niente cloud US.
8. **Il questionario conciliazione vita-lavoro transita dal server** (non è E2E) perché i dati sono anonimi e aggregati per natura.

## STRUTTURA PAYLOAD STYX (già specificata nel documento allegato)

### Evento segnalazione PdR 125
Tipo `segnalazione_pdr125`, crittografato con chiave RPG. Campi: category (array), description, when, where, frequency, people_involved, witnesses, previous_report, impact, wants_contact, contact_info.

### Evento segnalazione WB
Tipo `segnalazione_wb`, crittografato con chiave OdV. Campi: violation_type (array), description, when, where, people_involved, witnesses_evidence, attachment_event_ids, previous_report, identity_revealed (bool), identity_name/role/contact (condizionali), anonymous_contact.

### Evento allegato
Tipo `attachment`, collegato a parent via parent_event_id. File crittografato E2E individualmente.

### Metadato server (NON crittografato)
L'unica cosa che il server vede: org_id, channel (pdr125|whistleblowing), category, identity_revealed (solo flag bool), has_attachments, received_at.

## SCHEMA DB SERVER (già nel documento allegato)

Tabelle: `organizations` (con rpg_public_key + odv_public_key + SLA config), `report_metadata` (con stati, SLA deadlines, flag identity/attachments), `survey_results` (risposte aggregate questionario).

## ROADMAP

| Fase | Periodo | Focus |
|------|---------|-------|
| Fase 0 | Mar-Apr 2026 | Compliance interna Nexa Data con Microsoft Forms (in corso, per audit aprile) |
| **Fase 1 — MVP** | **Apr-Ott 2026** | **App Flutter dual-channel + Dashboard RPG web + Dashboard OdV web + Server metadati + Relay self-hosted + Pairing QR + Form PdR + Form WB + Allegati E2E + SLA alert + Rate limiting + Comunicazione bidirezionale** |
| Fase 2 | Nov 2026-Mar 2027 | + Survey + KPI dashboard 6 aree + Report audit PDF + Push (3 profili) + Shamir backup |
| Fase 3 | Apr-Dic 2027 | Scale: multi-sito, API, white-label, partnership OdC |
| Fase 4 | 2028 | Espansione EU, ISO 37002, marketplace |

Budget MVP: €95.000-140.000. Revenue Y1: €180k-370k. Break-even: mese 10-14.

## PROBLEMI EMERSI E RISOLTI DURANTE L'ANALISI

1. **Microsoft Forms "Solo persone dell'organizzazione" + Registra nome OFF**: l'anonimato NON è reale — un Global Admin può correlare timestamp login/risposta e re-identificare il segnalante. Per questo Themis usa E2E vero.
2. **Microsoft Forms "Chiunque può rispondere"**: anonimato reale ma ZERO protezione anti-spam e nessuna comunicazione bidirezionale. Motivo per cui serve una piattaforma dedicata.
3. **Email/PEC escluse** da ANAC come canali WB conformi.
4. **Il proprietario di un Microsoft Form non può rimuovere sé stesso dalle notifiche** — serve Power Automate come workaround.
5. **Rate limiting anti-spam**: impossibile su form anonimi web. Risolto in Themis con rate limiting crittografico per chiave pubblica.
6. **Separazione PdR 125 / WB**: obbligatoria per normativa (oggetto, destinatario, tutele, SLA diversi). Risolta con architettura dual-key.

## COSA CHIEDO IN QUESTA CHAT

Partendo dal documento architetturale allegato (che contiene 14 capitoli + 3 allegati con specifiche complete), ho bisogno di procedere con la **progettazione e pianificazione dettagliata** del progetto Themis.

In particolare, potrei chiederti di lavorare su:

- **Sprint plan del MVP** (Fase 1): breakdown in sprint bisettimanali, task per componente (app Flutter, dashboard React, server Node, relay), dipendenze, milestones, criteri di accettazione.
- **Spec tecnica di sviluppo**: struttura repository (monorepo?), API REST complete con OpenAPI spec, Prisma schema completo, struttura cartelle Flutter, architettura React dashboard.
- **Protocollo Styx personalizzato per Themis**: mapping preciso dei tipi evento Styx ai flussi Themis, configurazione relay, gestione pairing multi-chiave.
- **Mockup UI**: wireframe delle schermate principali dell'app segnalante e delle dashboard RPG/OdV.
- **Pitch deck**: presentazione per organismi di certificazione e potenziali partner/investitori.
- **Documentazione legale**: template DPIA, informativa privacy, procedura gestione segnalazioni da fornire ai clienti come parte dell'onboarding.
- **Test strategy**: piano di testing E2E, security audit checklist, test di conformità normativa.

Chiedi chiarimenti su qualsiasi aspetto prima di procedere. Hai accesso al documento architetturale completo in allegato.
