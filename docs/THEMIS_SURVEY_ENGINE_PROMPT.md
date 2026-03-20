# Themis Survey Engine — Implementation Spec for Claude Code

## Context

You are working on **Themis**, a zero-knowledge compliance platform built on the **Styx** cryptographic ledger library (Dart/Flutter). The project is a monorepo using Melos. Styx provides Ed25519 signatures, X25519 encryption, Nostr transport, and an append-only hash chain.

Themis has three channels:
1. **PdR 125** — abuse/harassment reports (E2E encrypted via Styx to the RPG)
2. **Whistleblowing** — illegal activity reports (E2E encrypted via Styx to the OdV)
3. **Survey** — anonymous questionnaires for workplace climate analysis ← **THIS TASK**

The survey channel is architecturally different from the other two: most responses go to the **server** (Node.js/Express/Prisma/PostgreSQL) as aggregate anonymous data. But some sensitive fields are routed **E2E via Styx** to the RPG. This is called **per-field privacy routing** and is the core innovation of this module.

---

## What to implement

A **dynamic survey engine** with three components:

1. **JSON Schema** — the data model that defines a questionnaire
2. **Flutter dynamic renderer** — renders any survey from its JSON schema in the mobile app
3. **Server API** — CRUD for surveys, collection of public responses, aggregation for dashboards

The Styx integration for private fields uses the existing `SovereignLedger.sendTransaction()` — no new Styx code is needed.

---

## 1. JSON Schema — `packages/themis_survey/lib/src/models/`

### 1.1 Survey root model — `survey_schema.dart`

```dart
class SurveySchema {
  final String id;              // UUID, generated server-side
  final String title;           // Shown to respondent
  final String? description;    // Subtitle/instructions
  final int version;            // Incremental, for tracking edits
  final String orgId;           // FK to organization
  final SurveyStatus status;    // draft | active | closed | archived
  final bool oneResponsePerDevice; // Default: true. Uses local storage flag.
  final bool showProgressBar;   // Default: true
  final bool shuffleSections;   // Default: false. Randomize section order (not questions within).
  final DateTime? activeFrom;   // null = immediately available
  final DateTime? activeUntil;  // null = no expiry
  final List<SurveyQuestion> questions; // Ordered list of questions and sections
}

enum SurveyStatus { draft, active, closed, archived }
```

### 1.2 Question model — `survey_question.dart`

```dart
class SurveyQuestion {
  final String id;              // Unique within the survey (e.g. "q1", "C3", "eta")
  final QuestionType type;      // See enum below
  final String label;           // Question text shown to respondent
  final String? subtitle;       // Helper text below the question (smaller font)
  final bool required;          // Default: false. Blocks submission if unanswered.
  final bool private;           // Default: false. If true → response goes E2E via Styx, NOT to server.
  final BranchCondition? showIf; // Branching: question visible only if condition is true.

  // Type-specific properties (nullable, used only for relevant types)
  final List<String>? options;         // choice, multi_choice, ranking
  final bool? otherEnabled;            // choice, multi_choice — adds "Other" free-text option
  final int? maxSelections;            // multi_choice — max checkboxes
  final int? levels;                   // rating — number of levels (2–10), default 5
  final String? symbol;                // rating — "number" | "star" | "smiley"
  final String? labelStart;            // rating — left-end label
  final String? labelEnd;              // rating — right-end label
  final List<String>? statements;      // likert — row labels (affirmations)
  final List<String>? columns;         // likert — column labels (scale options)
  final int? maxLength;                // text, long_text — character limit
  final String? restriction;           // text — "number" | "email" | "regex"
  final String? restrictionPattern;    // text — custom regex (if restriction == "regex")
  final String? labelDetractor;        // nps — label for 0–6
  final String? labelPassive;          // nps — label for 7–8
  final String? labelPromoter;         // nps — label for 9–10

  // Section-only properties
  final String? sectionTitle;          // section — displayed as a divider/header
  final String? sectionSubtitle;       // section — description text
}

enum QuestionType {
  choice,       // Radio buttons (single select)
  multiChoice,  // Checkboxes (multi select)
  text,         // Short text input (single line)
  longText,     // Multiline textarea
  rating,       // Numeric scale with symbols
  likert,       // Matrix: statements × scale
  date,         // Date picker
  nps,          // Net Promoter Score (0–10)
  ranking,      // Drag-and-drop reorder
  section,      // Visual separator (not a question)
}
```

### 1.3 Branch condition model — `branch_condition.dart`

```dart
/// A condition can be simple (single question check) or composite (AND/OR of sub-conditions).
class BranchCondition {
  // Simple condition
  final String? questionId;
  final BranchOperator? operator;
  final dynamic value; // String, num, List<String>, or null

  // Composite condition
  final List<BranchCondition>? conditions;
  final BranchLogic logic; // Default: AND
}

enum BranchOperator {
  equals,
  notEquals,
  contains,       // For multi_choice: selected options contain this value
  anyOf,          // Value matches any item in the provided list
  noneOf,         // Value matches none of the items
  greaterThan,    // For rating/nps numeric values
  lessThan,
  isAnswered,     // Question has any answer (value is ignored)
  isNotAnswered,  // Question is unanswered
}

enum BranchLogic { and, or }
```

### 1.4 JSON serialization

All models must have `fromJson(Map<String, dynamic>)` factory constructors and `toJson()` methods. Use `json_serializable` + `freezed` if already in the project, otherwise manual serialization is fine. The schema is stored as JSONB in PostgreSQL and transmitted as JSON over HTTP.

---

## 2. Flutter Dynamic Renderer — `packages/themis_survey/lib/src/widgets/`

### 2.1 Entry point — `survey_renderer.dart`

```dart
class SurveyRenderer extends StatefulWidget {
  final SurveySchema schema;
  final Future<void> Function(SurveySubmission submission) onSubmit;

  // SurveySubmission contains both public and private buckets (see 2.5)
}
```

The renderer must:

1. **Parse the schema** and build a list of visible questions
2. **Evaluate branching** reactively: when any answer changes, re-evaluate all `showIf` conditions and show/hide questions accordingly. Branching is evaluated **client-side only**. The server never sees branching logic execution.
3. **Validate required fields** before allowing submission
4. **Render each question type** with the appropriate widget (see 2.2)
5. **Show a progress bar** if `showProgressBar` is true (based on answered questions / total visible questions)
6. **Enforce `oneResponsePerDevice`** using a local flag in SharedPreferences keyed by survey_id. This is a UX guard, not a cryptographic guarantee — a determined user could clear app data.

### 2.2 Question widgets — one widget per type

Create a widget for each `QuestionType`. Each widget receives the `SurveyQuestion` model and a callback `onChanged(dynamic value)`.

| Type | Widget | Value type | Notes |
|------|--------|------------|-------|
| `choice` | `RadioListTile` group | `String` (selected option) | If `otherEnabled`, add a TextField that activates when "Altro" is selected. Value becomes `"other:user_typed_text"`. |
| `multiChoice` | `CheckboxListTile` group | `List<String>` | Respect `maxSelections`. If `otherEnabled`, same as above. |
| `text` | `TextField` | `String` | Apply `restriction` validation: if "number" → `TextInputType.number` + `num.tryParse` validation. If "email" → email regex. If "regex" → match against `restrictionPattern`. Show error below field on invalid input. Apply `maxLength` via `maxLength` property. |
| `longText` | `TextField` with `maxLines: 6` | `String` | Apply `maxLength`. |
| `rating` | Custom row of tappable symbols | `int` (1-based) | Render `levels` symbols of type `symbol`. Show `labelStart` on left, `labelEnd` on right. Highlight selected and all symbols to its left (filled vs outlined). |
| `likert` | `Table` / `DataTable` | `Map<String, String>` (statement → selected column) | Rows = `statements`, columns = `columns`. Each row has radio buttons. Required means ALL rows must be answered. |
| `date` | `showDatePicker` + display | `String` (ISO 8601 date) | Show a button "Seleziona data" that opens the platform date picker. |
| `nps` | Row of 11 buttons (0–10) | `int` (0-based) | Color-code: 0–6 red (detractor), 7–8 yellow (passive), 9–10 green (promoter). Show labels below. |
| `ranking` | `ReorderableListView` | `List<String>` (ordered) | User drags to reorder. Initial order = `options` order. |
| `section` | Styled divider | N/A (no value) | Display `sectionTitle` as heading, `sectionSubtitle` as body text. Add vertical spacing. |

### 2.3 Branching evaluation — `branch_evaluator.dart`

```dart
class BranchEvaluator {
  /// Given the current answers map and a condition, returns true if the question should be visible.
  static bool evaluate(BranchCondition condition, Map<String, dynamic> answers);
}
```

Implementation:
- For simple conditions: look up `answers[condition.questionId]` and apply the operator.
- `contains`: for multi_choice, check if the answer List contains the value.
- `anyOf`: check if the answer equals any item in the value list.
- `isAnswered`: check if the key exists in answers and value is not null/empty.
- For composite conditions: recursively evaluate `conditions` and combine with `logic` (AND = all true, OR = any true).

**Important**: when a question becomes hidden due to branching, its answer must be **removed** from the answers map. This prevents stale answers from leaking into the submission and from affecting downstream branching.

### 2.4 Privacy-aware submission — `survey_submission.dart`

```dart
class SurveySubmission {
  final String surveyId;
  final DateTime submittedAt;
  final Map<String, dynamic> publicAnswers;  // question_id → value (private: false)
  final Map<String, dynamic> privateAnswers; // question_id → value (private: true)
  final bool hasPrivateBucket;               // true if privateAnswers is non-empty
}
```

At submission time, the renderer partitions the answers:

```dart
final publicAnswers = <String, dynamic>{};
final privateAnswers = <String, dynamic>{};

for (final question in visibleQuestions) {
  if (question.type == QuestionType.section) continue;
  final answer = answers[question.id];
  if (answer == null) continue;

  if (question.private) {
    privateAnswers[question.id] = answer;
  } else {
    publicAnswers[question.id] = answer;
  }
}
```

The `onSubmit` callback receives the `SurveySubmission`. The calling code is responsible for:
1. Sending `publicAnswers` to the server via HTTPS POST
2. If `hasPrivateBucket`, packaging `privateAnswers` into a Styx event and sending via `SovereignLedger.sendTransaction()` encrypted with the RPG's public key

### 2.5 Styx integration for private bucket

The private bucket is sent as a Styx event with this payload structure:

```json
{
  "type": "survey_private_answers",
  "survey_id": "uuid-of-survey",
  "submitted_at": "2026-10-15T14:30:00Z",
  "answers": {
    "C3": "Il responsabile del reparto X durante la riunione del 15 marzo...",
    "C6": "maria.rossi.privata@gmail.com"
  }
}
```

This is serialized to `Uint8List` (UTF-8 encoded JSON) and passed to `styx.sendTransaction()`. Styx handles encryption with the RPG's X25519 public key, signing with the device's Ed25519 key, hash chain linking, and Nostr transport.

**No new Styx code is needed.** The survey engine calls the existing `sendTransaction` API.

---

## 3. Server API — Prisma models and Express routes

### 3.1 Prisma schema additions — add to existing `schema.prisma`

```prisma
model Survey {
  id                    String       @id @default(uuid())
  orgId                 String       @map("org_id")
  title                 String
  description           String?
  version               Int          @default(1)
  status                SurveyStatus @default(DRAFT)
  oneResponsePerDevice  Boolean      @default(true) @map("one_response_per_device")
  showProgressBar       Boolean      @default(true) @map("show_progress_bar")
  shuffleSections       Boolean      @default(false) @map("shuffle_sections")
  activeFrom            DateTime?    @map("active_from")
  activeUntil           DateTime?    @map("active_until")
  schema                Json         // The full SurveySchema JSON (questions array)
  createdAt             DateTime     @default(now()) @map("created_at")
  updatedAt             DateTime     @updatedAt @map("updated_at")

  organization Organization @relation(fields: [orgId], references: [id])
  responses    SurveyResponse[]

  @@map("surveys")
}

model SurveyResponse {
  id               String   @id @default(uuid())
  surveyId         String   @map("survey_id")
  submittedAt      DateTime @map("submitted_at")
  hasPrivateBucket Boolean  @default(false) @map("has_private_bucket")
  answers          Json     // Only public answers (private: false fields)
  createdAt        DateTime @default(now()) @map("created_at")

  survey Survey @relation(fields: [surveyId], references: [id])

  @@map("survey_responses")
}

enum SurveyStatus {
  DRAFT
  ACTIVE
  CLOSED
  ARCHIVED
}
```

### 3.2 API routes — `src/routes/surveys.ts` (or `.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/surveys` | RPG/Admin JWT | Create a new survey. Body: `{ title, description, schema }`. Returns created survey with `id`. |
| `GET` | `/api/v1/surveys` | RPG/Admin JWT | List surveys for the org. Query params: `?status=active`. |
| `GET` | `/api/v1/surveys/:id` | RPG/Admin JWT OR app device token | Get survey schema. The app needs this to render the form. |
| `PUT` | `/api/v1/surveys/:id` | RPG/Admin JWT | Update survey (title, description, schema, status). Increment `version` on schema changes. |
| `DELETE` | `/api/v1/surveys/:id` | RPG/Admin JWT | Soft-delete (set status = ARCHIVED). |
| `POST` | `/api/v1/surveys/:id/responses` | **No auth** (anonymous) | Submit public answers. Body: `{ submitted_at, has_private_bucket, answers }`. No device ID, no IP logging, no authentication. Returns `201`. |
| `GET` | `/api/v1/surveys/:id/results` | RPG/Admin JWT | Aggregated results. Returns per-question stats (counts, averages, distributions). |
| `GET` | `/api/v1/surveys/:id/results/export` | RPG/Admin JWT | Export as CSV or PDF for audit. |

### 3.3 Response endpoint — CRITICAL privacy rules

The `POST /api/v1/surveys/:id/responses` endpoint must:

1. **Accept requests without authentication**. No JWT, no API key, no device token. This ensures the server cannot correlate a response to a device or user.
2. **Not log the requester's IP address**. If your Express middleware logs IPs (e.g. morgan), exclude this route or sanitize the log.
3. **Validate that only public fields are present**: compare the submitted `answers` keys against the survey schema. If any key corresponds to a question with `private: true`, **reject the request with 400** and message "Private fields must not be sent to the server". This is a safety net against app bugs.
4. **Check survey status**: only accept responses for `ACTIVE` surveys within the `activeFrom`–`activeUntil` window.
5. **Return 201 with no body** (or minimal `{ "received": true }`). Do not echo back the submitted data.

### 3.4 Aggregation logic — `src/services/surveyAggregation.ts`

For the `/results` endpoint, aggregate by question type:

| Question type | Aggregation | Output |
|---|---|---|
| `choice` | Count per option | `{ "option_a": 42, "option_b": 31, "other": 5 }` |
| `multi_choice` | Count per option (each response can contribute to multiple) | Same as choice |
| `rating` | Average, median, distribution per level | `{ "average": 7.3, "median": 8, "distribution": { "1": 2, "2": 3, ... } }` |
| `likert` | Per-statement: average column index, distribution | `{ "stmt_1": { "avg": 3.8, "dist": {...} }, ... }` |
| `nps` | NPS score (% promoters - % detractors), counts per group | `{ "nps": 42, "promoters": 65, "passives": 20, "detractors": 15 }` |
| `ranking` | Average rank position per option | `{ "option_a": 1.3, "option_b": 2.1, ... }` |
| `text` / `long_text` | Count of responses (DO NOT return individual texts) | `{ "response_count": 47 }` |
| `date` | Min, max, distribution by month | `{ "earliest": "2026-01-15", "latest": "2026-03-20" }` |

**CRITICAL**: For `text` and `long_text` questions that are `private: false` (meaning they ARE stored on the server), the aggregation must NEVER return individual text responses. Only return the count. The RPG can review individual text responses in the raw response data from the dashboard, but the aggregation API returns only counts to prevent accidental exposure through cached API responses.

---

## 4. File structure

Create a new package in the monorepo:

```
packages/
  themis_survey/
    lib/
      src/
        models/
          survey_schema.dart          # SurveySchema model
          survey_question.dart         # SurveyQuestion model + QuestionType enum
          branch_condition.dart        # BranchCondition model + enums
          survey_submission.dart       # SurveySubmission model (public + private buckets)
        widgets/
          survey_renderer.dart         # Main StatefulWidget entry point
          question_widgets/
            choice_question.dart
            multi_choice_question.dart
            text_question.dart
            long_text_question.dart
            rating_question.dart
            likert_question.dart
            date_question.dart
            nps_question.dart
            ranking_question.dart
            section_divider.dart
          progress_bar.dart            # Survey progress indicator
        logic/
          branch_evaluator.dart        # Branching condition evaluator
          response_partitioner.dart    # Splits answers into public/private buckets
          survey_validator.dart        # Required field validation
        services/
          survey_api_client.dart       # HTTP client for server API (fetch schema, submit public)
          survey_styx_bridge.dart      # Sends private bucket via Styx
      themis_survey.dart              # Package barrel export
    test/
      models/
        survey_schema_test.dart
        branch_condition_test.dart
      logic/
        branch_evaluator_test.dart
        response_partitioner_test.dart
        survey_validator_test.dart
      widgets/
        survey_renderer_test.dart
        question_widgets_test.dart
    pubspec.yaml
```

Server-side additions (in the existing Portaal/Themis server):

```
src/
  routes/
    surveys.ts                        # Express routes
  services/
    surveyAggregation.ts             # Aggregation logic
  middleware/
    noIpLogging.ts                   # Middleware to strip IP for anonymous endpoints
prisma/
  schema.prisma                      # Add Survey + SurveyResponse models
```

---

## 5. Tests to write

### 5.1 Model tests
- `SurveySchema.fromJson()` / `toJson()` round-trip with all question types
- Validation: reject schema with duplicate question IDs
- Validation: reject `show_if` referencing non-existent question_id
- Validation: reject `show_if` that creates circular dependency (A depends on B depends on A)

### 5.2 Branch evaluator tests
- Simple: `equals`, `not_equals` with string value
- Simple: `any_of` with list value
- Simple: `contains` for multi_choice
- Simple: `greater_than`, `less_than` for rating
- Simple: `is_answered`, `is_not_answered`
- Composite: AND of two conditions (both true → visible)
- Composite: OR of two conditions (one true → visible)
- Cascading: A shows B, B shows C. When A becomes hidden, B and C also hide.
- Answer cleanup: when a question hides, its answer is removed from the map

### 5.3 Response partitioner tests
- All public fields → publicAnswers only, hasPrivateBucket = false
- Mixed → correct split, hasPrivateBucket = true
- Hidden questions (branching) → excluded from both buckets
- Section-type questions → excluded from both buckets

### 5.4 Validator tests
- Required field empty → validation fails
- Required field answered → passes
- Required field hidden by branching → passes (hidden fields are not validated)
- Likert with required: all statements must be answered

### 5.5 Widget tests
- Renderer shows only visible questions (branching)
- Toggling an answer updates downstream branching
- Submit button disabled until all required visible fields are answered
- Each question widget renders correctly for its type
- Rating widget: tapping level N selects it and highlights 1..N
- Likert widget: all rows must have a selection when required

### 5.6 Server tests
- POST /responses with private field key → 400 rejection
- POST /responses to non-ACTIVE survey → 403
- POST /responses outside activeFrom–activeUntil → 403
- GET /results returns correct aggregation per type
- GET /results for text/long_text returns ONLY count, never individual responses
- Aggregation with zero responses → empty results, no error

---

## 6. Important constraints

1. **No new Styx code.** The survey engine calls `SovereignLedger.sendTransaction()` for private fields. All Styx primitives (encryption, signing, transport) are already implemented.

2. **The server MUST NEVER see private field answers.** The `POST /responses` endpoint validates against the schema and rejects any key marked `private: true`. This is a defense-in-depth safeguard.

3. **No IP logging on the response endpoint.** Configure Express to skip IP logging for this specific route.

4. **Branching is client-side only.** The server stores the schema (including `show_if` conditions) but never evaluates them. The server doesn't even know which questions were visible to a given respondent.

5. **The `one_response_per_device` flag is a local UX guard, not a server enforcement.** The server has no way to identify devices (by design — no auth on the response endpoint). The app stores a `Set<String>` of completed survey IDs in SharedPreferences.

6. **All models must be JSON-serializable** for both Dart (app) and TypeScript (server). The schema is the shared contract between client and server.

7. **The survey package depends on the `styx` package** only for the private bucket submission. This dependency should be injected (pass a callback or interface) so the survey engine can be tested without a running Styx instance.

8. **Localization**: all UI strings in the widgets should be externalizable (pass through a `SurveyLocalization` object or use Flutter's built-in l10n). The schema content (labels, options) is already localized by the survey creator.
