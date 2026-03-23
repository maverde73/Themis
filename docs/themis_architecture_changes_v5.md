# Themis — Variazioni Architetturali v4 → v5

**Nexa Data srl — 20 marzo 2026**

*Riferimento: `docs/themis_technical_architecture_v4.md`*

---

## Sommario variazioni

| # | Variazione | Sezioni v4 impattate | Impatto |
|---|------------|---------------------|---------|
| 1 | Sistema Moduli Unificato | §7, §8, §9, All. C, All. D | Strutturale |
| 2 | Privacy Selettiva per Report | §9.1–9.2, All. C | Sicurezza/Compliance |
| 3 | Template Catalog e Import | §9.7 | Funzionale |
| 4 | Editor Strutturato i18n | §5.1C, §9.2, All. D | Funzionale |
| 5 | Anteprima/Test Form | Nuovo | Funzionale |
| 6 | Lifecycle Moduli | Nuovo | Operativo |
| 7 | Endpoint Pubblico Mobile | §9.2 | API |
| 8 | Flusso Submit Report Tripartito | §6.3, All. C | Sicurezza/Compliance |
| 9 | Schema JSON v2 | All. D | Strutturale |
| 10 | Diagramma Flusso Aggiornato | §5.1D, All. A | Documentale |

---

## 1. Sistema Moduli Unificato

**Sezioni v4 impattate:** §7 (Modulo Whistleblowing), §8 (PdR 125 vs WB), §9 (Survey Engine), Allegato C, Allegato D

### v4

- Form PdR 125 e WB sono strutture hardcoded con campi fissi definiti in §7.2 e §8.
- Il Survey Engine (§9) è un sistema separato, dedicato ai questionari conciliazione vita-lavoro.
- Tre sistemi distinti: form PdR 125, form WB, survey engine — ciascuno con logica propria.
- Tabella DB `survey_results` con schema semplificato (`question_id` + `response_value` intero).

### v5

- Un **unico JSON Schema** governa sia survey che report. L'entità `Survey` nel DB diventa il contenitore universale per qualsiasi modulo compilabile.
- Nuovi campi DB sulla tabella `surveys`:
  - `kind` — enum `SURVEY | REPORT`. Distingue questionari anonimi da segnalazioni.
  - `channel` — stringa opzionale (`PDR125`, `WHISTLEBLOWING`). Solo per `kind: REPORT`.
  - `icon` — stringa opzionale. Icona Material visualizzata nel mobile.
- I form PdR 125 e WB sono **template JSON** importabili (file `pdr125_template.json`, `wb_template.json`) con la stessa struttura di un survey.
- Il `SurveyResponse` ora archivia `answers` come JSON generico (`Record<string, unknown>`) anziché singole righe `question_id → integer`.

### Perché

- Riduce la duplicazione: un solo editor, un solo renderer mobile, un solo motore di branching.
- Permette personalizzazione: un RPG può importare il template PdR 125 e modificarlo per la propria azienda.
- Allinea i report alla stessa infrastruttura di privacy selettiva dei survey (vedi §2).

### Impatto sicurezza

Nessuno. Il vincolo zero-knowledge è preservato: il `kind` e il `channel` sono metadati che il server già conosceva (equivalenti al campo `channel` di `report_metadata`). Il contenuto delle domande con `private: true` continua a transitare esclusivamente via Styx.

---

## 2. Privacy Selettiva per Report

**Sezioni v4 impattate:** §9.1–9.2 (Routing privacy), Allegato C (Payload Styx)

### v4

- Il flag `private` esiste solo nel Survey Engine (§9.1–9.2).
- Le segnalazioni PdR 125 e WB crittografano **tutto** il payload E2E. Il server riceve solo 3 campi (TEMPO 1): `org_id`, `channel`, `received_at`.
- Nessuna analitica possibile sul contenuto dei report (il server non vede nulla).

### v5

- Il flag `private` è supportato anche nei form di tipo `REPORT`.
- Ogni domanda del report può essere marcata come:
  - `private: true` — la risposta è crittografata E2E via Styx (come in v4, nessun cambiamento).
  - `private: false` — la risposta è **categoriale/aggregabile** e viene inviata al server come dato anonimo.
- Lo stesso `ResponsePartitioner` (logica client-side) separa risposte pubbliche e private sia per survey che per report.
- Esempio concreto dal template PdR 125:
  - `category` (multi_choice, tipo di molestia) → `private: false` → server per analytics.
  - `description` (long_text, racconto episodio) → `private: true` → E2E via Styx → RPG.

### Perché

- Abilita analytics aggregate sui report senza violare zero-knowledge.
- L'RPG può vedere quante segnalazioni riguardano molestie sessuali vs. discriminazione di genere senza attendere la decriptazione.
- Compliance KPI 5.2.6 e 5.4.6 (UNI/PdR 125): i dati categoriali aggregati alimentano la dashboard.

### Impatto sicurezza

**Critico da verificare.** Le domande con `private: false` nei report devono essere esclusivamente categoriali (scelta singola/multipla con opzioni predefinite). Il server **rifiuta** con `400 Bad Request` qualsiasi risposta che includa un `question_id` marcato `private: true` nello schema. La validazione avviene in `surveyService.submitResponse()` confrontando i `question_id` delle risposte inviate con il set `privateFieldIds` estratto dallo schema.

### Garanzia zero-knowledge

Il server continua a non ricevere MAI:
- Testo libero (`long_text`, `text`)
- Dati identificativi (contatti, nomi)
- Risposte a domande con `private: true`

Riceve SOLO risposte a domande categoriali esplicitamente marcate `private: false` dal creatore del modulo.

---

## 3. Template Catalog e Import

**Sezione v4 impattata:** §9.7 (Template e marketplace)

### v4

- Template descritti come concept: lista di 5 template previsti con disponibilità per piano.
- Marketplace di template come obiettivo Fase 3 (apr–dic 2027).
- Nessun meccanismo tecnico di import implementato.

### v5

- Template JSON immutabili su disco (`server/src/templates/pdr125_template.json`, `wb_template.json`).
- Endpoint `POST /api/v1/organizations/:orgId/surveys/import-template` che:
  1. Accetta `templateId: "pdr125" | "wb"` (o array per importazione multipla).
  2. Legge il file JSON dal disco.
  3. Crea una copia come `Survey` con `status: DRAFT`, `kind: REPORT`, `channel` e `icon` precompilati.
- Il template originale non viene mai modificato — ogni import crea una copia DRAFT editabile.
- Catalogo visuale nella dashboard RPG: card con icona, titolo, descrizione per ogni template disponibile.

### Perché

- Permette onboarding immediato: l'RPG importa i template e ha subito form PdR 125 + WB pronti.
- I template importati come DRAFT possono essere personalizzati prima dell'attivazione.
- Prepara l'infrastruttura per il marketplace di template previsto in roadmap.

---

## 4. Editor Strutturato i18n

**Sezioni v4 impattate:** §5.1C (Dashboard Web), §9.2 (Architettura Survey Engine), Allegato D (JSON Schema)

### v4

- Editor drag-and-drop descritto come concept (§5.1C, §9.2).
- Tutte le label e testi sono `string` plain (§9.4, Allegato D).
- Nessun supporto i18n nello schema.

### v5

- Editor strutturato implementato nella dashboard web con:
  - **Language tabs** (schede lingua) anziché campi affiancati — scala a N lingue.
  - **Completion dots**: indicatore visuale di completamento traduzione per ogni domanda/lingua.
  - **Validazione traduzioni**: warning se una lingua ha campi non tradotti.
  - **JSON avanzato toggle**: possibilità di passare dalla vista strutturata al JSON raw.
- Schema i18n: tutti i testi sono `Record<langCode, string>` (es. `{ "it": "...", "en": "..." }`).
- Backwards compatibility: lo schema accetta anche `string` plain (interpretato come lingua default).

### Schema i18n — Tipi Zod

```typescript
// Accepts either a plain string or a locale→string map
const i18nString = z.union([z.string().min(1), z.record(z.string(), z.string())]);

// Option: either a plain string or { value, label }
const i18nOption = z.union([
  z.string(),
  z.object({ value: z.string(), label: i18nString }),
]);
```

### Perché

- Le aziende clienti hanno dipendenti multilingue (soprattutto nel manifatturiero con lavoratori stranieri).
- I template PdR 125 e WB sono già bilingue IT/EN.
- Le language tabs scalano meglio dei campi affiancati per 3+ lingue (cfr. feedback utente).

---

## 5. Anteprima/Test Form

**Sezione v4:** Non menzionato.

### v5

- Overlay di preview interattivo nella dashboard web.
- Rendering completo di tutti i 10 tipi domanda (`choice`, `multi_choice`, `text`, `long_text`, `rating`, `likert`, `date`, `nps`, `ranking`, `section`).
- Branching real-time: le condizioni `showIf` vengono valutate live durante la preview.
- Validazione: i campi `required` mostrano errori se non compilati.
- Switch lingua: possibilità di testare il form in ciascuna lingua configurata.
- Nessun dato viene inviato al server durante la preview.

### Perché

- L'RPG deve poter verificare il form prima di attivarlo, specialmente la logica di branching.
- Senza preview, l'unico modo per testare sarebbe attivare il form e compilarlo dal mobile.

---

## 6. Lifecycle Moduli

**Sezione v4:** Non dettagliato (menzionati gli stati in Allegato D ma senza regole di transizione).

### v5

- Stati lifecycle: `DRAFT → ACTIVE → CLOSED → ARCHIVED`.
- Regole:
  - Solo i moduli `ACTIVE` sono visibili all'app mobile.
  - Un modulo `ARCHIVED` non può essere modificato.
  - L'eliminazione è soft-delete: transizione a `ARCHIVED`.
  - I template importati entrano sempre come `DRAFT`.
- Enum Prisma `SurveyStatus` con valori `DRAFT | ACTIVE | CLOSED | ARCHIVED`.
- Enum Prisma `FormKind` con valori `SURVEY | REPORT`.

### Perché

- Evita che moduli in bozza siano visibili ai dipendenti.
- Permette di chiudere un survey senza perderlo (CLOSED: non accetta risposte, visibile per analisi).
- ARCHIVED: soft-delete per preservare i dati storici.

---

## 7. Endpoint Pubblico Mobile

**Sezione v4 impattata:** §9.2 (l'app scarica lo schema JSON dal server via HTTPS)

### v4

- Implicito che l'app mobile scarichi lo schema con autenticazione (il pairing con l'azienda implica un'identità).

### v5

- `GET /api/v1/surveys/active?org_id=<uuid>` — **senza autenticazione**. Restituisce solo moduli con `status: ACTIVE`.
- `GET /api/v1/surveys?org_id=<uuid>` — con autenticazione JWT. Restituisce tutti i moduli (DRAFT, ACTIVE, CLOSED). Per la dashboard.
- `GET /api/v1/surveys/:id` — senza autenticazione. Permette al mobile di scaricare lo schema completo di un modulo attivo.
- `POST /api/v1/surveys/:id/responses` — senza autenticazione, con rate limiting anonimo e no-IP-logging. Per submit risposte.

### Perché

- L'app mobile non ha un JWT: il dipendente non ha un account server (è anonimo by design).
- Il server conosce solo la chiave pubblica del dispositivo (pairing QR), non gestisce sessioni.
- Lo schema del questionario non è un dato sensibile — non contiene risposte.

### Impatto sicurezza

L'endpoint pubblico espone solo lo schema delle domande (non le risposte). Il rate limiter anonimo protegge da abuse. Il middleware `noIpLogging` garantisce che nessun IP venga registrato durante il submit delle risposte.

---

## 8. Flusso Submit Report Tripartito

**Sezioni v4 impattate:** §6.3 (Invio segnalazione), Allegato C (Struttura payload Styx)

### v4

Il flusso è bipartito:
1. **Payload E2E** → tutto il contenuto crittografato via Styx al destinatario (RPG o OdV).
2. **Metadati TEMPO 1** → 3 campi al server (`org_id`, `channel`, `received_at`).

Il server non riceve MAI nulla del contenuto. L'arricchimento (TEMPO 2) avviene manualmente dal gestore via PUT.

### v5

Il flusso è **tripartito**:
1. **Risposte private** (`private: true`) → crittografate E2E via Styx al destinatario (RPG o OdV). Invariato rispetto a v4.
2. **Risposte pubbliche** (`private: false`) → inviate al server come `answers` nel `POST /surveys/:id/responses`. Dati categoriali anonimi.
3. **Metadati** → `org_id`, `channel`, `received_at` + il `survey_id` del modulo compilato.

### Diagramma flusso tripartito

```
┌──────────────────┐
│   APP MOBILE     │
│ (Flutter + Styx) │
└────────┬─────────┘
         │
         ├──── private: true ───────► RELAY NOSTR ──► DASHBOARD RPG/OdV
         │     (E2E encrypted)         (blob opaco)    (decripta localmente)
         │
         ├──── private: false ──────► SERVER THEMIS
         │     (categorie anonime)     (SurveyResponse.answers)
         │
         └──── metadata ────────────► SERVER THEMIS
               (org_id, channel,       (ReportMetadata / Survey tracking)
                received_at)
```

### Validazione server-side

Il server verifica che le risposte inviate non contengano campi `private: true`:

```typescript
// surveyService.ts — submitResponse()
const privateFieldIds = new Set(
  schema.questions
    .filter((q) => q.private === true)
    .map((q) => q.id),
);
const rejectedKeys = submittedKeys.filter((key) => privateFieldIds.has(key));
if (rejectedKeys.length > 0) {
  throw new AppError(400, "Private fields must not be submitted to the server");
}
```

### Impatto sicurezza

Il vincolo zero-knowledge è **rafforzato** dalla validazione esplicita. In v4, il server rifiutava qualsiasi contenuto per policy. In v5, il server rifiuta attivamente i campi privati per codice — difesa in profondità.

---

## 9. Schema JSON v2 — Sostituzione Allegato D

Questo schema sostituisce integralmente l'Allegato D del documento v4.

### Differenze chiave rispetto ad Allegato D v4

| Aspetto | v4 (Allegato D) | v5 |
|---------|-----------------|-----|
| `label` | `string` | `i18nString` — `string \| Record<langCode, string>` |
| `subtitle` | `string \| null` | Rinominato `description`, tipo `i18nString` |
| `options` | `string[]` | `Array<string \| { value: string, label: i18nString }>` |
| `statements` (likert) | `string[]` | `Array<string \| { value: string, label: i18nString }>` |
| `show_if.question_id` | `string` | Rinominato `field` |
| `show_if.operator` | `equals \| not_equals \| contains \| any_of \| ...` | Rinominato `op`, valori: `eq \| neq \| gt \| lt \| gte \| lte \| in \| contains` |
| `show_if.logic` | `AND \| OR` (con `conditions[]`) | Sostituito da `all[]` / `any[]` (ricorsivo) |
| Schema root | `id`, `title`, `description`, `version`, `org_id`, `created_by`, `status`, + metadati | Solo `title`, `description`, `buttonLabel`, `buttonDescription`, `questions` (metadati in colonne DB) |
| Nuovi campi root | — | `buttonLabel`, `buttonDescription` (i18n, per il bottone nell'app mobile) |
| `label_start`/`label_end` | Su `rating` | Rinominati `minLabel`/`maxLabel`, tipo i18n |

### Schema root v5

```typescript
const surveySchemaDefinition = z.object({
  title:             i18nString,                    // Titolo del modulo
  description:       i18nStringOptional.optional(),  // Istruzioni generali
  buttonLabel:       i18nStringOptional.optional(),  // Label bottone nell'app mobile
  buttonDescription: i18nStringOptional.optional(),  // Sotto-label bottone nell'app
  questions:         z.array(questionSchema).min(1), // Array ordinato di domande
});
```

> **Nota:** I metadati `id`, `version`, `org_id`, `status`, `kind`, `channel`, `icon` non sono più nello schema JSON — sono colonne della tabella `surveys` in Prisma.

### Schema Question v5

```typescript
const questionSchema = z.object({
  id:          z.string().min(1),               // Identificativo univoco
  type:        questionTypeEnum,                 // choice | multi_choice | text | long_text | rating | likert | date | nps | ranking | section
  label:       i18nString,                       // Testo della domanda (i18n)
  description: i18nStringOptional.optional(),    // Istruzioni sotto la domanda (i18n)
  required:    z.boolean().optional(),           // Default: false
  private:     z.boolean().optional().default(false), // Se true → E2E via Styx
  options:     z.array(i18nOption).optional(),    // Per choice/multi_choice/ranking
  statements:  z.array(i18nOption).optional(),    // Per likert (righe matrice)
  min:         z.number().optional(),            // Per rating/nps
  max:         z.number().optional(),            // Per rating/nps
  minLabel:    i18nStringOptional.optional(),    // Etichetta estremo min (i18n)
  maxLabel:    i18nStringOptional.optional(),    // Etichetta estremo max (i18n)
  showIf:      branchConditionSchema.optional(), // Branching condizionale
});
```

### Schema Branching v5

```typescript
const branchConditionSchema = z.lazy(() =>
  z.object({
    field: z.string().optional(),   // ID della domanda da cui dipende
    op:    z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "in", "contains"]).optional(),
    value: z.unknown().optional(),  // Valore di confronto
    all:   z.array(branchConditionSchema).optional(), // AND ricorsivo
    any:   z.array(branchConditionSchema).optional(), // OR ricorsivo
  }),
);
```

La struttura ricorsiva `all`/`any` sostituisce il pattern `conditions[] + logic: AND|OR` del v4, permettendo condizioni composte a profondità arbitraria.

### Tipi domanda supportati (invariati)

`choice`, `multi_choice`, `text`, `long_text`, `rating`, `likert`, `date`, `nps`, `ranking`, `section` — 10 tipi, come in v4 §9.3.

### Enum DB aggiunti

```prisma
enum FormKind {
  SURVEY
  REPORT
  @@map("form_kind")
}

// SurveyStatus invariato: DRAFT | ACTIVE | CLOSED | ARCHIVED
```

---

## 10. Diagramma Flusso Aggiornato

Sostituisce l'Allegato A del documento v4.

```
┌─────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
│  APP SEGNALANTE     │       │    RELAY NOSTR     │       │   DASHBOARD RPG    │
│  (Flutter+Styx)     │       │  (self-hosted EU)  │       │  (React/Flutter)   │
│                     │       │                    │       │                    │
│ • Genera chiavi     │       │ • Trasporta blob   │       │ • Decripta con     │
│ • Scarica schema    │       │   crittografati    │       │   chiave privata   │
│ • Renderizza form   │       │ • Non legge nulla  │       │ • Editor moduli    │
│ • Partiziona answer │       │ • Effimero         │       │ • Preview/test     │
│ • Firma Ed25519     │       │                    │       │ • Template import  │
│ • Rate limiting     │       │                    │       │ • Report audit     │
└──────────┬──────────┘       └────────────────────┘       └──────────┬─────────┘
           │                                                         │
           │ ┌─ Flusso 1: private ────► Relay Nostr ───────────────► │
           │ │  (E2E encrypted)         (blob opaco)                 │
           │ │                                                       │
           │ ├─ Flusso 2: public ───────────────────┐                │ Solo metadati
           │ │  (categorie anonime)                  │                │ aggregati
           │ │                                       ▼                ▼
           │ └─ Flusso 3: metadata ─────────► ┌────────────────────┐
           │    (org_id, channel, timestamp)   │  SERVER THEMIS     │
           │                                  │  (Node.js + PG)    │
           │                                  │                    │
           │                                  │ • Multi-tenant     │
           │                                  │ • Dashboard KPI    │
           │                                  │ • Template catalog │
           │                                  │ • Analytics aggr.  │
           │                                  │ • ZERO contenuti   │
           │                                  │ • Rifiuta private  │
           └──────────────────────────────────└────────────────────┘
```

### Legenda flussi

| Flusso | Contenuto | Destinazione | Crittografia |
|--------|-----------|-------------|-------------|
| 1 — Private | Risposte `private: true` (testo libero, dati identificativi) | Relay Nostr → Dashboard RPG/OdV | E2E (X25519 + ChaCha20-Poly1305) |
| 2 — Public | Risposte `private: false` (scelte categoriali anonime) | Server Themis (`survey_responses`) | TLS (dati non sensibili) |
| 3 — Metadata | `org_id`, `channel`, `received_at`, `survey_id` | Server Themis (`report_metadata` / tracking) | TLS |

---

## Garanzia zero-knowledge — Verifica

Le variazioni v5 **preservano integralmente** il vincolo zero-knowledge architetturale:

| Principio | v4 | v5 | Stato |
|-----------|----|----|-------|
| Il server non riceve mai testo libero | ✅ | ✅ I campi `long_text`/`text` sono sempre `private: true` nei template | Preservato |
| Il server non riceve mai dati identificativi | ✅ | ✅ Validazione server-side rifiuta `private: true` answers | Preservato |
| Il server non conosce l'identità del segnalante | ✅ | ✅ Submit anonimo, no auth, no IP logging | Preservato |
| La decriptazione avviene solo lato client | ✅ | ✅ Styx E2E invariato | Preservato |
| I due canali sono crittograficamente isolati | ✅ | ✅ Chiavi RPG e OdV separate | Preservato |

### Nuova difesa in profondità (v5)

Il server ora **rifiuta attivamente** i campi privati con validazione esplicita nel codice (`surveyService.submitResponse()`). In v4, la protezione era puramente architetturale (il server non aveva un endpoint per riceverli). In v5, il server ha l'endpoint ma implementa un **guard esplicito**: se un client malformato o compromesso tentasse di inviare un campo `private: true`, riceverebbe `400 Bad Request`.

---

## Tabella riassuntiva impatto DB

| Tabella | Cambiamento | Migrazione |
|---------|-------------|-----------|
| `surveys` | +`kind` (enum `SURVEY\|REPORT`), +`channel` (string?), +`icon` (string?) | `20260320105053_add_form_kind_channel_icon` |
| `survey_responses` | `answers` è ora `Json` generico (era implicito `question_id → integer`) | Nessuna (era già Json in Prisma) |
| `report_metadata` | Invariata | — |
| `organizations` | Invariata | — |

---

## Endpoint API — Variazioni

| Endpoint | v4 | v5 | Auth |
|----------|----|----|------|
| `GET /surveys/active` | Non esisteva | Lista moduli ACTIVE per org | No (mobile) |
| `GET /surveys` | Implicito | Lista tutti i moduli per org | JWT |
| `POST /surveys` | Implicito | Crea modulo (survey o report) | JWT |
| `PUT /surveys/:id` | Implicito | Aggiorna modulo (schema, status, kind, channel, icon) | JWT |
| `POST /organizations/:orgId/surveys/import-template` | Non esisteva | Importa template come DRAFT | JWT |
| `POST /surveys/:id/responses` | `POST /surveys/results` (schema diverso) | Submit risposte JSON anonime | No + rate limit |
| `GET /surveys/:id/results` | Non esisteva | Analytics aggregate | JWT |
