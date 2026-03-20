  
**THEMIS**

Zero-Knowledge Compliance Platform

Segnalazioni · Whistleblowing · Survey · KPI Dashboard

**Documento Tecnico-Architetturale**

Nexa Data srl — Marzo 2026 — v1.0

*RISERVATO — Distribuzione controllata*

# **Indice**

1\. Executive Summary

2\. Il problema di mercato

3\. La soluzione: architettura zero-knowledge

4\. Stack tecnologico — Styx al centro

5\. Architettura della piattaforma

6\. Flussi operativi dettagliati

7\. Il modulo Whistleblowing — specifiche

8\. Il modulo PdR 125 vs WB: differenze operative

9\. Survey Engine — questionari dinamici con privacy selettiva

10\. Modello di sicurezza e crittografia

    10.3 Recovery chiave RPG/OdV (Shamir \+ Re-keying)

11\. Compliance normativa

12\. Confronto competitivo

13\. Modello SaaS e pricing

14\. Roadmap di sviluppo

15\. Rischi e mitigazioni

ALLEGATO A — Diagramma architetturale

ALLEGATO B — Schema dati del server Themis

ALLEGATO C — Struttura payload Styx per canale

ALLEGATO D — Survey JSON Schema completo

# **1\. Executive Summary**

Themis è una piattaforma SaaS per la compliance alla UNI/PdR 125:2022 (Parità di Genere) e al D.Lgs. 24/2023 (Whistleblowing) che risolve un paradosso fondamentale del mercato: **come offrire un servizio centralizzato di gestione delle segnalazioni mantenendo un anonimato crittograficamente garantito**.

La risposta è un’architettura **zero-knowledge** costruita sulla libreria Styx, un ledger crittografico peer-to-peer sviluppato internamente da Nexa Data. Il contenuto delle segnalazioni è crittografato end-to-end tra il segnalante e il destinatario autorizzato (Responsabile Parità di Genere per PdR 125, Organismo di Vigilanza per Whistleblowing): il server Themis gestisce metadati aggregati, dashboard e fatturazione, ma **non ha mai accesso al contenuto** delle segnalazioni.

Themis integra nativamente **tre canali** in un’unica app con flussi separati: segnalazione abusi/molestie (PdR 125), segnalazione illeciti (Whistleblowing D.Lgs. 24/2023) e questionario conciliazione vita-lavoro. Un’unica installazione, un unico onboarding aziendale, due destinatari distinti con garanzie crittografiche indipendenti.

Questo posizionamento è **unico sul mercato italiano ed europeo**. I competitor WB (DigitalPA, Whistlelink, EQS) sono piattaforme centralizzate senza E2E; i competitor PdR 125 (ISWEB) non hanno WB integrato; nessuno offre entrambi in architettura zero-knowledge.

| Metrica | Valore |
| :---- | :---- |
| Mercato PdR 125 (volontario) | 38.652 siti certificati (set. 2025), crescita \>200% CAGR |
| Mercato WB D.Lgs. 24/2023 (obbligatorio) | \~30.000–35.000 imprese con 50+ dipendenti \+ aziende con MOG 231 \+ settori sensibili |
| Gap competitivo | Nessun competitor offre E2E zero-knowledge \+ PdR 125 \+ WB \+ Survey |
| Tempo al MVP | 5–7 mesi (PdR 125 \+ WB integrati dal giorno 1\) |
| Investimento MVP | €95.000–140.000 |
| Revenue Y1 (conservativa) | €150.000–300.000 (75–150 clienti) |
| Revenue Y3 (target) | €900.000–1.500.000 (450–750 clienti) |
| Break-even | Mese 10–14 |

# **2\. Il problema di mercato**

## **2.1 Il trilemma della segnalazione anonima**

Ogni sistema di segnalazione deve bilanciare tre requisiti in tensione reciproca:

* **Anonimato reale** — il segnalante non deve essere identificabile né dal datore di lavoro, né dall’admin IT, né dal fornitore della piattaforma.

* **Integrità e anti-abuso** — le segnalazioni devono essere autentiche, non manipolabili, e lo spam/malafede deve essere prevenibile.

* **Gestione strutturata** — il destinatario deve poter tracciare, classificare, gestire e rendicontare le segnalazioni per l’audit.

Le soluzioni attuali sacrificano sempre almeno uno dei tre:

| Soluzione | Anonimato | Anti-abuso | Gestione |
| :---- | :---- | :---- | :---- |
| Microsoft/Google Forms | ⚠️ Parziale (provider vede i dati) | ❌ Nessuno in modalità anonima | ❌ Foglio Excel, nessun workflow |
| DigitalPA / Whistlelink / EQS | ⚠️ Il fornitore SaaS ha accesso tecnico | ✅ Rate limiting, CAPTCHA | ✅ Dashboard, workflow, SLA |
| Email dedicata (PEC) | ❌ Il mittente è identificabile | ❌ Nessuno | ❌ Manuale |
| Themis (Styx) | ✅ E2E: nessuno tranne il destinatario | ✅ Rate limiting crittografico | ✅ Dashboard zero-knowledge |

## **2.2 I limiti specifici di Microsoft Forms**

Come emerso dall’analisi operativa per Nexa Data, Microsoft Forms presenta limiti strutturali per un canale di segnalazione abusi:

* Con **«Chiunque può rispondere»**: anonimato reale, ma nessuna protezione anti-spam, nessun limite invii, nessuna comunicazione bidirezionale anonima.

* Con **«Solo persone dell’organizzazione»** \+ Registra nome OFF: un Global Admin del tenant può correlare timestamp di login e risposta, re-identificando il segnalante. L’anonimato è funzionale, non crittografico.

* **Nessuna crittografia E2E**: Microsoft come responsabile del trattamento ha accesso tecnico ai contenuti.

* **Nessun workflow**: le risposte finiscono in un foglio Excel senza tracking, SLA, stati di gestione.

* **Nessun audit trail immutabile**: le risposte possono essere cancellate dal proprietario senza traccia.

# **3\. La soluzione: architettura zero-knowledge**

Themis ribalta il paradigma delle piattaforme di segnalazione tradizionali. Invece di centralizzare i dati e proteggerli con policy di accesso (trust-based security), Themis garantisce che **i dati sensibili non esistano mai sul server** (zero-knowledge security).

## **3.1 Principio architetturale**

| Layer | Cosa vede | Dove vive |
| :---- | :---- | :---- |
| App segnalante | Solo le proprie segnalazioni (crittografate localmente) | Dispositivo mobile del dipendente |
| Relay Nostr | Blob crittografati opachi (ciphertext) | Relay pubblici o self-hosted |
| Server Themis | Metadati aggregati: conteggi, tipologie, SLA, stati | Cloud EU (Nexa Data) |
| App/Dashboard RPG | Segnalazioni decriptate con la propria chiave privata | Dispositivo della RPG |
| Admin IT dell’azienda cliente | NIENTE — né contenuti, né identità dei segnalanti | N/A |

## **3.2 Il vantaggio zero-knowledge**

* **Data breach sul server Themis**: nessuna segnalazione esposta (il server non le ha).

* **Admin IT malevolo dell’azienda cliente**: non può leggere le segnalazioni né identificare i segnalanti.

* **Richiesta giudiziaria a Nexa Data**: Nexa Data può certificare di non possedere i contenuti (impossibilità tecnica di compliance a richieste di disclosure indiscriminato).

* **Audit GDPR**: la DPIA è radicalmente semplificata — il server tratta solo dati aggregati non personali.

# **4\. Stack tecnologico — Styx al centro**

Themis è costruita su **Styx**, una libreria Dart/Flutter per ledger crittografici peer-to-peer sviluppata internamente da Nexa Data. Styx fornisce le primitive crittografiche e di trasporto su cui Themis costruisce la logica di business.

## **4.1 Mapping Styx → Themis**

| Componente Styx | Uso in Themis | Beneficio |
| :---- | :---- | :---- |
| Ed25519 signatures | Firma di ogni segnalazione | Non ripudio, integrità, catena immutabile |
| X25519 key exchange | Crittografia E2E segnalante → RPG | Solo la RPG può decriptare |
| SPAKE2 | Pairing dispositivo → azienda via codice numerico | Nessun server coinvolto nel key exchange |
| SHA-256 hash chain | Audit trail crittografico | Ogni evento è collegato al precedente, immutabile |
| Hybrid Logical Clocks | Ordinamento causale delle segnalazioni | Coerenza anche offline |
| Nostr transport | Trasporto dei blob crittografati | Nessun server proprietario, relay intercambiabili |
| GDPR pruning | Cancellazione payload preservando hash | Art. 17 GDPR senza rompere la catena |
| Shamir backup (2-of-3) | Recovery chiave RPG | Nessun single point of failure |
| BIP-39 mnemonic | Seed frase per il pairing remoto | UX familiare, sicurezza matematica |
| Vector clocks | Merge deterministico post-offline | Nessuna perdita di dati dopo disconnessione |

## **4.2 Stack completo**

| Layer | Tecnologia | Note |
| :---- | :---- | :---- |
| App Mobile (segnalante) | Flutter \+ Styx | iOS \+ Android da singolo codebase |
| App/Dashboard RPG | Flutter (mobile) \+ React (web) | Decripta segnalazioni lato client |
| Server Themis | Node.js / Express / Prisma / PostgreSQL | Stack Portaal esistente, riuso infrastruttura |
| Relay Nostr | Self-hosted (strfry) \+ relay pubblici | Fallback multi-relay per resilienza |
| Push notifications | push\_bridge\_server (Go) | 3 profili privacy già implementati in Styx |
| Storage locale | Drift \+ SQLCipher (AES-256) | DB crittografato su dispositivo |
| Hosting EU | Hetzner / OVH (stack europeo no-AWS) | Coerenza con architettura Nexa Data |

# **5\. Architettura della piattaforma**

## **5.1 Componenti e responsabilità**

**A) App Themis (Flutter)** — installata dai dipendenti

* Generazione chiavi Ed25519/X25519 in hardware enclave (Keystore Android / Secure Enclave iOS)

* Pairing con l’azienda via QR code (scansione in sede) o codice BIP-39 (remoto)

* **Doppio pairing**: l’app riceve dal QR due chiavi pubbliche — quella della RPG (canale PdR 125\) e quella dell’OdV (canale WB)

* Due bottoni distinti in home: **«Segnala molestia/discriminazione»** (crittografa con chiave RPG) e **«Segnala illecito»** (crittografa con chiave OdV)

* Compilazione questionario conciliazione vita-lavoro (terzo canale, aggregato)

* Ricezione feedback anonimi dal destinatario (comunicazione bidirezionale su entrambi i canali)

* Rate limiting locale: max N segnalazioni per periodo dalla stessa chiave, configurabile per canale

**B) App Themis Gestione (Flutter mobile)** — per RPG e OdV, canale primario di decriptazione

* Stessa app base di A, ma con **switch di ruolo** dopo autenticazione (RPG o OdV)

* Genera la coppia di chiavi Ed25519/X25519 del gestore in **hardware enclave** (Secure Enclave iOS / Keystore Android)

* La chiave privata **non esce mai dal dispositivo** — è l’unico posto dove le segnalazioni vengono decriptate

* Riceve segnalazioni crittografate via relay Nostr, le decripta localmente

* Comunicazione bidirezionale anonima con il segnalante

* Workflow di gestione: presa in carico, indagine, chiusura

* Push notification per nuove segnalazioni

* **Shamir backup (2-of-3)** della chiave privata all’onboarding — vedi Sezione 10.3

* **Bridge QR** per collegare la dashboard web (pattern WhatsApp Web) — il telefono fa da proxy di decriptazione

**C) Dashboard Web Themis (React)** — companion desktop per RPG/OdV

* Per lavorare comodamente su desktop: statistiche, KPI, report audit, export PDF, editor survey

* **Non ha la chiave privata** — per leggere le segnalazioni decriptate serve il bridge con l’app mobile

* Bridge pattern WhatsApp Web: la dashboard mostra un QR, la RPG/OdV lo scansiona con l’app mobile, si stabilisce un canale cifrato (WebSocket via relay), l’app mobile decripta gli eventi e li invia al browser in tempo reale

* Senza bridge attivo: la dashboard mostra solo metadati aggregati, KPI, statistiche, workflow con stati ma senza contenuti

* Arricchimento metadati: dopo aver letto una segnalazione (via bridge o su mobile), il gestore può aggiornare categoria, stato, flag sul server

* Editor questionari drag-and-drop (non richiede bridge — i survey schema non sono crittografati)

**D) Server Themis (Node.js)** — gestito da Nexa Data

* Registrazione e onboarding aziende clienti (multi-tenant)

* Archivia **due chiavi pubbliche** per azienda: pubkey RPG \+ pubkey OdV

* Generazione QR / link di pairing contenente entrambe le chiavi \+ URL relay

* **Flusso metadati a due tempi** (principio architetturale chiave):

* TEMPO 1 (automatico, dall’app segnalante): riceve solo \`org\_id\` \+ \`channel\` \+ \`received\_at\`. Tre campi. Nient’altro.

* TEMPO 2 (manuale, dal gestore via PUT dopo decriptazione): il gestore arricchisce con \`category\`, \`status\`, \`identity\_revealed\`, \`has\_attachments\`. Atto umano deliberato, non leak automatico.

* Alert automatici per scadenze SLA WB (7gg avviso, 3 mesi riscontro)

* Dashboard analytics aggregata per l’azienda cliente

* Gestione abbonamenti, fatturazione, limiti piano

* **NON riceve, NON transita, NON archivia** il contenuto di nessuna segnalazione

**E) Relay Nostr** — infrastruttura di trasporto

* Relay self-hosted (strfry) come primario \+ relay pubblici come fallback

* Trasporta solo blob crittografati (ciphertext opaco)

* Nessuna persistenza a lungo termine: i messaggi sono effimeri

* Intercambiabile: se un relay cade, il failover Styx passa al successivo

# **6\. Flussi operativi dettagliati**

## **6.1 Onboarding azienda cliente**

1. L’azienda si registra sul portale Themis (web). Inserisce: ragione sociale, email RPG, settore, n. dipendenti.

2. La RPG riceve un invito email, installa l’app Themis RPG (o accede alla dashboard web).

3. L’app RPG genera la **coppia di chiavi Ed25519/X25519** sul dispositivo della RPG.

4. La chiave pubblica della RPG viene registrata sul server Themis (solo la pubblica, mai la privata).

5. Il server genera un **QR code aziendale** che contiene: ID azienda \+ chiave pubblica RPG \+ URL relay.

6. L’azienda distribuisce il QR ai dipendenti (poster in ufficio, intranet, email).

## **6.2 Onboarding dipendente (segnalante)**

1. Il dipendente installa l’app Themis (gratuita, dagli store).

2. L’app genera una **coppia di chiavi locale** (Ed25519/X25519) in hardware enclave. **Nessun account, nessuna email, nessun nome.**

3. Il dipendente scansiona il QR aziendale.

4. L’app esegue il key exchange (SPAKE2 se remoto, diretto se QR) e ottiene la chiave pubblica della RPG.

5. Da questo momento il dipendente può inviare segnalazioni crittografate alla RPG.

| ✅ Il server Themis non è coinvolto nel pairing. Il dipendente non ha un account. Non esiste alcuna associazione tra chiave pubblica e identità reale. L’unica informazione sul server è: «una chiave pubblica X si è associata all’azienda Y». |
| :---- |

## **6.3 Invio segnalazione**

1. Il dipendente compila la segnalazione nell’app (tipo, descrizione, luogo, frequenza — stessi campi del form Microsoft ma in-app).

2. L’app costruisce un **evento Styx** di tipo \`segnalazione\` con: payload JSON crittografato con la chiave pubblica della RPG (X25519 \+ ChaCha20-Poly1305), firma Ed25519 del segnalante, hash SHA-256 collegato all’evento precedente della stessa chiave, timestamp HLC.

3. L’evento viene inviato al relay Nostr (come blob opaco).

4. Il relay lo inoltra alla dashboard/app RPG.

5. La RPG decripta con la sua chiave privata, legge la segnalazione.

6. Il server Themis riceve dalla dashboard RPG **solo un metadato**: «nuova segnalazione ricevuta, tipo: molestia, stato: aperta». Mai il contenuto.

## **6.4 Comunicazione bidirezionale anonima**

Questo è un vantaggio enorme rispetto a Microsoft Forms, dove il segnalante anonimo non può ricevere feedback.

1. La RPG vuole chiedere chiarimenti al segnalante.

2. Dalla dashboard, compone un messaggio e lo invia come evento Styx crittografato con la chiave pubblica del segnalante.

3. Il messaggio transita sul relay Nostr.

4. L’app del segnalante riceve una notifica push (via push\_bridge, con profilo privacy configurabile).

5. Il segnalante legge il messaggio e può rispondere — il tutto senza che nessuna delle due parti conosca l’identità dell’altra.

## **6.5 Anti-spam: rate limiting crittografico**

Ogni dispositivo ha una chiave pubblica unica. Il rate limiting opera su due livelli:

* **Lato app (client-side)**: l’app rifiuta di creare più di N eventi di tipo \`segnalazione\` per periodo (es. max 3 segnalazioni aperte contemporaneamente, max 1 nuova segnalazione al giorno). Configurabile dall’azienda.

* **Lato relay (server-side)**: il relay Nostr può implementare rate limiting per chiave pubblica (es. max 5 eventi/ora dalla stessa pubkey). Questo blocca anche tentativi di bypass con app modificate.

Per fare spam, un malintenzionato dovrebbe reinstallare l’app e rigenerare le chiavi ogni volta, riscansionare il QR aziendale, e aggirare il rate limiting del relay. L’attrito è ordini di grandezza superiore rispetto a un form web.

# **7\. Il modulo Whistleblowing — specifiche**

Il modulo WB è un canale nativo di Themis, non un add-on. Condivide l’infrastruttura Styx (crittografia, trasporto, storage) ma ha flussi, destinatari, SLA e requisiti legali propri.

## **7.1 Requisiti legali D.Lgs. 24/2023 e come Themis li implementa**

| Requisito di legge | Articolo | Implementazione Themis |
| :---- | :---- | :---- |
| Canale interno con crittografia | Art. 4 \+ Linee Guida ANAC 2025 | E2E con X25519/ChaCha20-Poly1305. Il contenuto è accessibile solo all’OdV. |
| Riservatezza identità segnalante | Art. 4, c. 1 | Il segnalante PUÒ scegliere di identificarsi (campo opzionale nel payload crittografato). Se non lo fa, è anonimo by design. |
| Riservatezza persona coinvolta | Art. 4, c. 1 | Tutto il payload è crittografato E2E. Il server e l’admin IT non vedono nulla. |
| Avviso ricevimento entro 7 giorni | Art. 5, c. 1, lett. a) | Notifica automatica via canale Styx bidirezionale. Timer SLA con alert alla dashboard OdV. |
| Riscontro entro 3 mesi | Art. 5, c. 1, lett. d) | Timer SLA con escalation automatica: alert a 60gg, 75gg, 85gg, scadenza a 90gg. |
| Gestore autonomo e formato | Art. 4, c. 2 | L’OdV ha la propria coppia di chiavi. Separazione crittografica dalla RPG e dall’admin IT. |
| Documentazione e conservazione 5 anni | Art. 14 | Hash chain immutabile. GDPR pruning dopo 5 anni (payload rimosso, hash preservato). |
| Segnalazione anche anonima | Art. 16, c. 4 | Anonimato è il default. Identificazione è opzionale e volontaria. |
| Canale accessibile a dipendenti, ex-dipendenti, collaboratori, fornitori | Art. 3, c. 3 | L’app è scaricabile liberamente. Il pairing QR può essere condiviso anche con esterni. |
| DPIA obbligatoria | Art. 13, c. 6 | DPIA semplificata: il server non tratta dati personali delle segnalazioni. |
| Divieto di ritorsione | Art. 17 | Nessuna associazione chiave→identità. L’azienda non può sapere chi ha segnalato. |
| Email e PEC escluse come canali | Linee Guida ANAC 2025 | Themis è una piattaforma informatica dedicata con crittografia, non email. |

## **7.2 Form segnalazione WB — campi dell’app**

Quando il dipendente tocca **«Segnala illecito»** nell’app, viene presentato il seguente form. Ogni campo è crittografato nel payload E2E — il server non vede nulla.

| \# | Campo | Tipo | Obbligatorio | Opzioni / Note |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Tipo di violazione | Scelta multipla | SÌ | Illecito penale / Illecito amministrativo / Illecito contabile / Violazione MOG 231 / Violazione diritto UE / Corruzione / Conflitto di interessi / Danno ambientale / Frode / Altro |
| 2 | Descrizione dei fatti | Testo lungo | SÌ | Placeholder: «Descrivi i fatti in modo dettagliato: cosa è successo, quando, dove, chi è coinvolto, come ne sei venuto a conoscenza.» |
| 3 | Quando sono avvenuti i fatti | Testo breve | NO | Placeholder: «Data o periodo approssimativo» |
| 4 | Dove sono avvenuti | Scelta \+ Altro | NO | In sede / Da remoto / In trasferta / Presso terzi / Altro |
| 5 | Persone coinvolte | Testo lungo | NO | «Indica ruoli, reparti o nomi delle persone coinvolte. Se non conosci i nomi, descrivi il ruolo.» |
| 6 | Testimoni o prove | Testo lungo \+ Allegati | NO | Campo testo \+ possibilità di allegare file (documenti, screenshot, foto). I file sono crittografati E2E. |
| 7 | Hai già segnalato altrove? | Scelta singola | NO | No, è la prima segnalazione / Sì, internamente / Sì, ad ANAC / Sì, all’autorità giudiziaria |
| 8 | Vuoi identificarti? (facoltativo) | Scelta singola | SÌ | Preferisco restare anonimo/a / Sì, desidero identificarmi |
| 9 | Dati identificativi (condizionale) | Testo breve ×2 | NO | Visibile solo se campo 8 \= «Sì». Campi: Nome e Cognome \+ Ruolo/Qualifica \+ Recapito (email/telefono). Il segnalante identificato gode delle tutele anti-ritorsione complete. |
| 10 | Recapito per feedback (se anonimo) | Testo breve | NO | Visibile solo se campo 8 \= «Anonimo». «Se desideri ricevere aggiornamenti pur restando anonimo/a, inserisci un’email non aziendale o altro recapito sicuro.» |

| ⚠️ La differenza chiave con il form PdR 125: il campo 8 (identificazione volontaria) è specifico del WB. Nel canale PdR 125 non si chiede mai di identificarsi perché la norma richiede anonimato. Nel WB la legge prevede che il segnalante identificato goda di tutele rafforzate (art. 17-21 D.Lgs. 24/2023). |
| :---- |

## **7.3 Workflow di gestione WB (Dashboard OdV)**

La dashboard OdV gestisce le segnalazioni WB con un workflow a stati rigidi e SLA legali:

| Stato | SLA | Azione | Alert automatico |
| :---- | :---- | :---- | :---- |
| RICEVUTA | Immediato | La segnalazione arriva alla dashboard OdV. Notifica push. | Push \+ email al gestore WB |
| PRESA IN CARICO | Entro 7 giorni | L’OdV conferma la ricezione. Messaggio automatico al segnalante via canale Styx. | Alert a 5gg se non presa in carico. Alert rosso a 7gg. |
| IN ISTRUTTORIA | Entro 3 mesi dalla ricezione | L’OdV indaga: raccolta evidenze, audizioni, analisi. Può comunicare con il segnalante via canale anonimo. | Alert a 60gg, 75gg, 85gg. Scadenza a 90gg. |
| RISCONTRO DATO | Al termine dell’istruttoria | L’OdV comunica l’esito al segnalante (fondata/infondata/archiviata) e le azioni intraprese o previste. | Automatico: messaggio Styx al segnalante |
| CHIUSA — Fondata | Post-riscontro | Avvio azioni correttive/disciplinari. Documentazione per il CdA. | Report generato per audit |
| CHIUSA — Infondata | Post-riscontro | Archiviazione motivata. Nessuna azione. | Report generato per audit |
| CHIUSA — Malafede | Post-riscontro | Procedimento disciplinare verso il segnalante (art. 16, c. 3). | Report generato per audit |
| ARCHIVIATA (5 anni) | 5 anni da chiusura | GDPR pruning automatico: payload rimosso, hash chain preservata. | Notifica al gestore prima della cancellazione |

## **7.4 Gestione identità rivelata**

Quando il segnalante sceglie di identificarsi (campo 8 \= «Sì»), i suoi dati sono crittografati E2E nel payload della segnalazione. Solo l’OdV può decriptarli. A livello applicativo:

* L’identità è un campo crittografato **separato** nel payload JSON, marcato come \`identity\_revealed: true\`

* La dashboard OdV mostra un badge **«Segnalante identificato»** sulla segnalazione

* L’OdV può verificare l’identità e attivare le tutele anti-ritorsione nominative (art. 17-21)

* L’identità non può essere rivelata a terzi senza il consenso espresso del segnalante (art. 12\)

* Nemmeno il server Themis sa se il segnalante si è identificato o meno — il metadato \`identity\_revealed\` è dentro il payload crittografato

## **7.5 Allegati crittografati**

Il D.Lgs. 24/2023 prevede la possibilità di allegare documentazione a supporto della segnalazione. In Themis:

* Ogni file allegato è crittografato **individualmente** con la chiave pubblica dell’OdV (stessa crittografia X25519+ChaCha20)

* I file sono inviati come eventi Styx separati di tipo \`attachment\`, collegati alla segnalazione principale via \`parent\_event\_id\`

* Limite configurabile per azienda (default: max 5 file, max 10 MB per file)

* Tipi supportati: PDF, immagini (JPG/PNG), documenti Office, audio (per segnalazioni vocali)

* Il relay Nostr trasporta i blob crittografati; per file grandi si usa un relay con storage esteso o upload diretto crittografato

# **8\. Il modulo PdR 125 vs WB: differenze operative**

Questa tabella riassume le differenze tra i due canali. Dal punto di vista dell’utente, sono due bottoni diversi nella stessa app. Dal punto di vista crittografico, sono due ledger indipendenti con destinatari diversi.

| Aspetto | Canale PdR 125 (Abusi/Molestie) | Canale WB (Whistleblowing) |
| :---- | :---- | :---- |
| Normativa di riferimento | UNI/PdR 125:2022 punto 6.3.2.6 | D.Lgs. 24/2023 \+ Direttiva UE 2019/1937 |
| Obbligatorietà | Obbligatorio per aziende certificate PdR 125 (volontario) | Obbligatorio per legge per aziende 50+ dipendenti o MOG 231 |
| Oggetto segnalazioni | Molestie, discriminazioni, abusi, mobbing, microaggressioni | Illeciti penali/amministrativi/contabili, violazioni MOG 231, violazioni diritto UE, corruzione, frodi |
| Destinatario | RPG (Responsabile Parità di Genere) | OdV (Organismo di Vigilanza) o gestore WB designato |
| Chiave crittografica | Chiave pubblica RPG | Chiave pubblica OdV (separata e indipendente) |
| Anonimato vs Riservatezza | Anonimato obbligatorio (la norma dice «metodologia anonima») | Riservatezza obbligatoria. Anonimato possibile ma il segnalante può identificarsi per tutele rafforzate |
| Identificazione segnalante | Mai richiesta, campo non presente | Campo opzionale: il segnalante SCEGLIE se identificarsi |
| SLA avviso di ricezione | Non previsto dalla norma (best practice: 3-5gg) | 7 giorni (obbligatorio per legge, art. 5\) |
| SLA riscontro | Non previsto dalla norma (best practice: 30-45gg) | 3 mesi (obbligatorio per legge, art. 5\) |
| Allegati | Non previsti (descrizione testuale sufficiente) | Previsti e consigliati (documentazione a supporto) |
| Conservazione | 5 anni (best practice allineata al WB) | 5 anni dalla comunicazione esito (art. 14\) |
| Sanzioni per non conformità | Perdita certificazione PdR 125 (sgravio INPS, punteggio gare) | ANAC: €10.000–€50.000. Garante Privacy: fino a €20M o 4% fatturato |
| Autorità di vigilanza | Accredia / Organismo di Certificazione | ANAC \+ Garante Privacy |
| Tipo evento Styx | segnalazione\_pdr125 | segnalazione\_wb |
| Dashboard destinazione | Dashboard RPG | Dashboard OdV |

| ✅ L’architettura Styx è identica per entrambi i canali. La differenza è solo nel layer applicativo: form diverso, destinatario diverso (chiave pubblica diversa), workflow diverso (SLA diversi), e tipo di evento diverso (per separare i flussi nel metadato server). |
| :---- |

# **9\. Survey Engine — questionari dinamici con privacy selettiva**

Il terzo canale di Themis è un motore di questionari configurabili via JSON, con una caratteristica unica: **routing per-campo della privacy**. Ogni domanda può essere marcata come pubblica (risposta aggregata sul server) o privata (risposta crittografata E2E via Styx). Questo risolve il problema fondamentale dei survey sulla parità di genere: raccogliere dati statistici aggregati per i KPI mantenendo la riservatezza assoluta sui dettagli sensibili.

## **9.1 Il problema del routing privacy nei questionari**

Un questionario PdR 125 contiene domande di natura radicalmente diversa in termini di sensibilità:

| Domanda | Tipo di dato | Rischio re-identificazione | Routing corretto |
| :---- | :---- | :---- | :---- |
| «Fascia di età?» | Demografico aggregabile | Basso (se azienda \>30 dip.) | Server (aggregato) |
| «La retribuzione è equa?» (scala 1-10) | Opinione quantitativa | Nullo | Server (aggregato) |
| «Hai subito discriminazioni? Sì/No» | Flag binario | Basso (conteggio aggregato) | Server (aggregato) |
| «Descrivi l’episodio» | Testo libero narrativo | ALTO (nomi, date, dettagli) | E2E via Styx → RPG |
| «Inserisci un recapito» | Dato identificativo diretto | CRITICO | E2E via Styx → RPG |
| «Suggerimenti per l’azienda» | Testo libero | Medio (stile riconoscibile) | E2E via Styx → RPG |

Nessuna piattaforma survey oggi offre questa granularità. Microsoft Forms manda tutto al proprietario del form. Google Forms idem. Le piattaforme WB non hanno survey integrate. Themis è la prima a implementare **crittografia selettiva per-campo** in un contesto di compliance.

## **9.2 Architettura del Survey Engine**

Il flusso completo del questionario:

1. La RPG (o il consulente) accede alla **Dashboard web** e crea un questionario con l’editor visuale drag-and-drop, oppure importa uno schema JSON.

2. Il server salva lo schema JSON e genera un \`survey\_id\`.

3. Il dipendente apre l’app Themis, sezione **«Questionari»**. L’app scarica lo schema JSON dal server via HTTPS.

4. L’app **renderizza il form dinamicamente** dallo schema: tipi di campo, opzioni, branching, validazione.

5. Il dipendente compila e tocca **«Invia»**.

6. L’app partiziona le risposte in due bucket:

* **Bucket pubblico** (domande con \`private: false\`): le risposte vanno al server via HTTPS POST come dati aggregati anonimi. Nessun identificativo del rispondente. Il server le usa per grafici, KPI, report audit.

* **Bucket privato** (domande con \`private: true\`): le risposte vengono impacchettate in un evento Styx, crittografate con la chiave pubblica della RPG, e inviate via relay Nostr. Il server riceve solo il metadato «questa risposta al survey X include campi privati».

7. La RPG nella dashboard vede **entrambi**: i grafici aggregati (dal server) e i messaggi privati (decriptati localmente). L’evento Styx contiene il \`survey\_id\` per correlazione.

| ✅ Il principio è la minimizzazione dell’art. 5 GDPR: il server riceve solo i dati che deve aggregare. Tutto ciò che potrebbe identificare una persona non ci arriva mai. |
| :---- |

## **9.3 Tipi di domanda supportati**

| Tipo (\`type\`) | Rendering | Proprietà specifiche | Può essere \`private\`? |
| :---- | :---- | :---- | :---- |
| choice | Radio button (scelta singola) | \`options\`: string\[\], \`other\_enabled\`: boolean | Sì |
| multi\_choice | Checkbox (scelta multipla) | \`options\`: string\[\], \`other\_enabled\`: boolean, \`max\_selections\`: int (opz.) | Sì |
| text | Campo di testo breve (1 riga) | \`max\_length\`: int (opz.), \`restriction\`: «number» | «email» | «regex» (opz.) | Sì |
| long\_text | Area di testo multi-riga | \`max\_length\`: int (opz.) | Sì (consigliato) |
| rating | Scala numerica / stelle / faccine | \`levels\`: int (2–10), \`symbol\`: «number» | «star» | «smiley», \`label\_start\`: string, \`label\_end\`: string | Sì |
| likert | Matrice affermazioni × scala | \`statements\`: string\[\], \`columns\`: string\[\] | No (aggregazione per riga) |
| date | Selettore data calendario | Nessuna | Sì |
| nps | Net Promoter Score (0–10) | \`label\_detractor\`: string, \`label\_passive\`: string, \`label\_promoter\`: string | No |
| ranking | Drag-and-drop per ordinare | \`options\`: string\[\] | No |
| section | Separatore visuale (non una domanda) | \`title\`: string, \`subtitle\`: string | N/A |

| ⚠️ Il flag \`private\` è consigliato su \`true\` per: long\_text, text con restriction «email», qualsiasi campo che possa contenere dati identificativi. L’editor visuale mostrerà un warning se un campo long\_text non è marcato come private. |
| :---- |

## **9.4 Proprietà comuni a tutte le domande**

| Proprietà | Tipo | Default | Descrizione |
| :---- | :---- | :---- | :---- |
| id | string | (obbligatorio) | Identificativo univoco della domanda (es. «C1», «q\_eta») |
| type | string | (obbligatorio) | Uno dei tipi nella tabella 9.3 |
| label | string | (obbligatorio) | Testo della domanda mostrato al rispondente |
| subtitle | string | null | null | Istruzioni aggiuntive sotto la domanda (testo più piccolo) |
| required | boolean | false | Se true, il rispondente non può procedere senza rispondere |
| private | boolean | false | Se true, la risposta va E2E via Styx alla RPG. Se false, va al server per aggregazione. |
| show\_if | object | null | null | Condizione di branching. La domanda è visibile solo se la condizione è soddisfatta. |
| show\_if.question\_id | string | — | ID della domanda da cui dipende la visibilità |
| show\_if.operator | string | — | «equals» | «not\_equals» | «contains» | «any\_of» | «greater\_than» | «less\_than» |
| show\_if.value | any | — | Valore o array di valori per il confronto |
| show\_if.logic | string | «AND» | Per condizioni multiple: «AND» | «OR» (con array di condizioni) |

## **9.5 Branching: logica condizionale**

Il branching è valutato **interamente lato app** (client-side). Il server non ha bisogno di conoscere la logica condizionale per funzionare — la riceve come parte dello schema JSON ma non la esegue. Questo garantisce che la logica di navigazione non riveli informazioni sulle risposte date.

Esempi di branching:

| Domanda target | Condizione \`show\_if\` | Significato |
| :---- | :---- | :---- |
| «Descrivi l’episodio» | { question\_id: «C1», operator: «any\_of», value: \[«subiti», «testimone»\] } | Visibile solo se C1 \= «Sì, li ho subiti» o «Sì, ne sono stato testimone» |
| «Recapito per ricontatto» | { question\_id: «C3», operator: «equals», value: «sì» } | Visibile solo se C3 \= «Sì, desidero essere ricontattato/a» |
| «Specifica Altro» | { question\_id: «q1», operator: «contains», value: «altro» } | Visibile solo se tra le scelte di q1 c’è «Altro» |
| «Sezione D (Genitorialità)» | { question\_id: «A5», operator: «not\_equals», value: «non\_applicabile» } | Intera sezione visibile solo se A5 ≠ «Non applicabile» |

Il branching supporta condizioni composte con \`logic: «AND»\` o \`logic: «OR»\` per scenari avanzati (es. mostra una domanda solo se il rispondente è donna E ha subito discriminazioni).

## **9.6 Esempio completo: sezione «Esperienze di discriminazione»**

Questo esempio mostra come branching e privacy routing lavorano insieme in una sezione reale del questionario PdR 125:

| ID | Tipo | Label | required | private | show\_if | Note |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| C0 | section | Esperienze personali | — | — | — | Separatore di sezione |
| C1 | choice | Negli ultimi 12 mesi, hai subito o assistito a comportamenti discriminatori? | SÌ | false | — | Dato aggregabile per KPI 5.2.6. Opzioni: Subiti / Testimone / No / Preferisco non rispondere |
| C2 | multi\_choice | Di che tipo? | No | true | C1 any\_of \[subiti, testimone\] | PRIVATE: il dettaglio potrebbe identificare. Opzioni: Commenti inappropriati / Esclusione / Disparità compiti / Battute sessiste / Pressioni / Altro |
| C3 | long\_text | Descrivi l’episodio (facoltativo) | No | true | C1 any\_of \[subiti, testimone\] | PRIVATE: testo libero → rischio re-identificazione alto |
| C4 | choice | Hai segnalato l’episodio? | No | false | C1 any\_of \[subiti, testimone\] | Aggregabile per KPI. Opzioni: Sì gestita / Sì senza seguito / No, non sapevo a chi / No, timore ritorsioni |
| C5 | choice | Desideri essere ricontattato/a? | No | true | C1 any\_of \[subiti, testimone\] | PRIVATE: la scelta stessa è sensibile |
| C6 | text | Recapito sicuro | No | true | C5 equals sì | PRIVATE \+ CONDIZIONALE: restriction «email». Questo dato NON tocca mai il server. |

Al submit, l’app invia al server: \`{ C1: «subiti», C4: «no\_timore\_ritorsioni» }\` (dati aggregabili). Al relay Styx: \`{ C2: \[«battute\_sessiste», «esclusione»\], C3: «Il responsabile del reparto X durante la riunione del 15 marzo...», C5: «sì», C6: «maria.rossi.privata@gmail.com» }\` (crittografato E2E per la RPG).

| ⚠️ Il server NON sa nemmeno che C2, C3, C5, C6 esistono nelle risposte — non riceve i field ID dei campi privati. Sa solo che «questa risposta ha un bucket privato associato». |
| :---- |

## **9.7 Template e marketplace**

Themis include **template pre-costruiti** pronti all’uso:

| Template | Contenuto | Disponibilità |
| :---- | :---- | :---- |
| PdR 125 Standard | Questionario completo 6 aree (demografici \+ pari opportunità \+ discriminazione \+ genitorialità \+ conciliazione \+ suggerimenti). \~25 domande. | Tutti i piani (incluso Starter) |
| PdR 125 Manifattura | Variante per aziende manifatturiere: domande su turni, lavoro fisico, spogliatoi, DPI. | Professional+ |
| PdR 125 IT/Servizi | Variante per aziende di servizi: focus su smart working, videocall, comunicazione digitale. | Professional+ |
| Clima aziendale generico | Survey breve (10 domande) su benessere organizzativo, non specifico PdR 125\. | Tutti i piani |
| Custom (editor visuale) | Il consulente/RPG crea il questionario da zero o modifica un template. | Professional+ |

In Fase 3 (Scale), apertura del **marketplace di template**: i consulenti PdR 125 potranno pubblicare i propri questionari personalizzati per settore, rendendoli disponibili (gratis o a pagamento) alle aziende clienti Themis. Questo crea un effetto rete che rafforza la piattaforma.

# **10\. Modello di sicurezza e crittografia**

## **10.1 Threat model**

| Minaccia | Mitigazione Themis | Mitigazione Forms/competitor |
| :---- | :---- | :---- |
| Admin IT legge le segnalazioni | ✅ Impossibile: E2E, admin non ha la chiave RPG | ❌ Possibile: admin ha accesso al tenant |
| Fornitore SaaS legge le segnalazioni | ✅ Impossibile: server ha solo metadati aggregati | ❌ Possibile: il fornitore ha accesso tecnico |
| Data breach sul server | ✅ Nessun dato sensibile esposto | ⚠️ Tutte le segnalazioni esposte |
| Re-identificazione via timestamp | ✅ Nessun login, nessun log correlabile | ⚠️ Correlazione login/risposta possibile |
| Segnalazione falsificata | ✅ Firma Ed25519 su ogni evento | ❌ Nessuna firma crittografica |
| Manomissione storico | ✅ Hash chain: modifica \= rottura catena | ❌ Proprietario può cancellare risposte |
| Spam / malafede | ✅ Rate limiting per chiave \+ relay-side | ❌ Nessun controllo in modalità anonima |
| Intercettazione in transito | ✅ E2E \+ TLS sul relay | ⚠️ Solo TLS (provider vede in chiaro) |
| Perdita chiave RPG | ✅ Shamir 2-of-3 backup | ❌ N/A (non c’è chiave) |
| Dispositivo RPG perso/distrutto | ✅ Shamir recovery \+ re-keying via Blessing | ❌ N/A |
| Ritorsione post-segnalazione | ✅ Nessuna associazione chiave→identità | ⚠️ Dipende dalla configurazione |

## **10.2 Primitivi crittografici**

| Funzione | Algoritmo | Dimensione chiave | Standard |
| :---- | :---- | :---- | :---- |
| Firma digitale | Ed25519 | 256 bit | RFC 8032 |
| Key exchange | X25519 | 256 bit | RFC 7748 |
| Crittografia simmetrica | ChaCha20-Poly1305 | 256 bit | RFC 8439 |
| Hashing | SHA-256 | 256 bit | FIPS 180-4 |
| Key derivation | HKDF-SHA-256 | 256 bit | RFC 5869 |
| PAKE (pairing) | SPAKE2 | 256 bit | RFC 9382 |
| Backup identità | Shamir SSS (2-of-3) | N/A | Shamir 1979 |
| Seed phrase | BIP-39 | 128–256 bit | BIP-39 |
| Storage locale | AES-256 (SQLCipher) | 256 bit | FIPS 197 |

## **10.3 Recovery chiave RPG/OdV — il problema del dispositivo perso**

La chiave privata della RPG/OdV vive nell’hardware enclave del dispositivo mobile. Se il dispositivo viene perso, distrutto, rubato o formattato, la chiave privata è persa. Senza mitigazione, **tutte le segnalazioni crittografate con quella chiave diventano illeggibili per sempre**. Questo è inaccettabile per un sistema di compliance.

Styx fornisce due meccanismi complementari già implementati: **Shamir Secret Sharing** per il backup della chiave e **Re-keying via Blessing Events** per la migrazione a un nuovo dispositivo.

**Fase 1 — Backup Shamir all’onboarding (preventivo)**

Al momento della creazione delle chiavi RPG/OdV (prima installazione dell’app Themis Gestione), l’app esegue automaticamente il **Shamir Secret Sharing 2-of-3**: la chiave privata viene suddivisa in 3 share. Due share qualsiasi sono sufficienti a ricostruirla. Una singola share è crittograficamente inutile.

| Share | Custode | Dove viene conservata | Come |
| :---- | :---- | :---- | :---- |
| Share 1 | La RPG/OdV stessa | Stampata su carta e conservata in luogo sicuro personale (cassaforte personale, cassetta di sicurezza) | L’app mostra la share come stringa codificata (base64 o BIP-39 mnemonic) con istruzioni: «Stampa questo foglio e conservalo in un luogo sicuro separato dal telefono» |
| Share 2 | L’Amministratore Delegato / Legale Rappresentante | Busta chiusa sigillata nella cassaforte aziendale o presso il notaio/commercialista dell’azienda | L’app genera un PDF stampabile con la share \+ istruzioni di recovery. La RPG/OdV consegna la busta chiusa all’AD. |
| Share 3 | Server Themis (escrow crittografato) | Database Themis, crittografata con una passphrase nota solo alla RPG/OdV | La share viene crittografata localmente sull’app con una passphrase scelta dalla RPG/OdV (AES-256), poi inviata al server. Il server archivia il blob opaco. Senza la passphrase, il server non può usarla. |

| ⚠️ Il server Themis possiede la Share 3 ma non può usarla (non conosce la passphrase). L’AD possiede la Share 2 ma non può usarla da solo (serve un’altra share). Nessun singolo soggetto può ricostruire la chiave unilateralmente. Servono almeno 2 dei 3 custodi che cooperano. |
| :---- |

**Fase 2 — Recovery (quando il dispositivo è perso)**

1. La RPG/OdV installa l’app Themis Gestione su un **nuovo dispositivo**.

2. Seleziona **«Recupera identità»** anziché «Nuova configurazione».

3. Inserisce **2 delle 3 share** (le combinazioni possibili sono: Share 1 \+ 2, Share 1 \+ 3, Share 2 \+ 3).

| Scenario | Share disponibili | Azione |
| :---- | :---- | :---- |
| Telefono perso/rotto, RPG ha il foglio stampato | Share 1 (foglio) \+ Share 3 (server, con passphrase) | La RPG inserisce la share dal foglio \+ la passphrase per sbloccare la share sul server. Recovery completato. |
| Telefono perso \+ foglio perso, RPG ricorda la passphrase | Share 2 (busta AD) \+ Share 3 (server, con passphrase) | La RPG chiede all’AD di aprire la busta sigillata. Inserisce la share dall’AD \+ la passphrase per il server. Recovery completato. |
| Telefono perso \+ passphrase dimenticata | Share 1 (foglio) \+ Share 2 (busta AD) | La RPG usa il foglio stampato \+ la busta dell’AD. Non serve il server. Recovery completato. |
| Tutto perso (telefono \+ foglio \+ passphrase dimenticata) | Solo Share 2 (busta AD) | Recovery IMPOSSIBILE con una sola share. Necessario re-keying completo (vedi Fase 3). |

4. L’app ricostruisce la chiave privata dalle 2 share e la importa nell’hardware enclave del nuovo dispositivo.

5. La RPG/OdV può ora decriptare **tutte le segnalazioni storiche** (la chiave è la stessa).

6. L’app genera **nuove share Shamir** (le vecchie sono compromesse perché usate) e la RPG/OdV le distribuisce nuovamente ai 3 custodi.

**Fase 3 — Re-keying (ultima risorsa, se il recovery è impossibile)**

Se tutte e 3 le share sono perse (scenario catastrofico: telefono distrutto \+ foglio perso \+ passphrase dimenticata \+ busta AD smarrita), la chiave originale è irrecuperabile. In questo caso:

1. La RPG/OdV genera una **nuova coppia di chiavi** sul nuovo dispositivo.

2. Se il vecchio dispositivo è ancora accessibile (es. formattato ma recuperabile, o semplicemente cambiato telefono), il vecchio dispositivo firma un **Blessing Event** Styx: «la vecchia chiave X certifica che la nuova chiave Y è il suo successore». Questo preserva la continuità della catena crittografica.

3. Se il vecchio dispositivo è completamente perso, un **amministratore del server Themis** (Nexa Data) può aggiornare la chiave pubblica dell’organizzazione, previa verifica dell’identità della RPG/OdV tramite procedura out-of-band (videocall \+ documento identità \+ conferma AD).

4. Il QR aziendale viene rigenerato con la nuova chiave pubblica e ridistribuito ai dipendenti.

5. Le segnalazioni future saranno crittografate con la nuova chiave. Le segnalazioni storiche crittografate con la vecchia chiave restano **illeggibili** — il contenuto è perso, ma la hash chain (l’audit trail che dimostra l’esistenza e l’integrità delle segnalazioni) è preservata.

| ⚠️ Il re-keying senza blessing è lo scenario peggiore: le segnalazioni storiche diventano illeggibili. Per questo il backup Shamir è OBBLIGATORIO all’onboarding. L’app non deve permettere di saltare questo passaggio. L’onboarding non è completo finché le 3 share non sono state distribuite. |
| :---- |

**Riepilogo garanzie di recovery**

| Scenario | Recovery possibile? | Segnalazioni storiche leggibili? |
| :---- | :---- | :---- |
| Telefono perso, 2+ share disponibili | ✅ Sì (Shamir) | ✅ Sì (stessa chiave ricostruita) |
| Telefono cambiato, vecchio accessibile | ✅ Sì (Blessing Event) | ✅ Sì (il blessing trasferisce l’accesso) |
| Tutto perso, solo 1 share | ❌ No → Re-keying obbligatorio | ❌ No (chiave irrecuperabile, audit trail preservato) |
| Furto dispositivo (attaccante ha il telefono) | ✅ Hardware enclave protegge la chiave (PIN/biometria) | ✅ Sì dopo recovery su nuovo dispositivo |

# **11\. Compliance normativa**

## **11.1 UNI/PdR 125:2022**

| Requisito norma | Come Themis lo soddisfa |
| :---- | :---- |
| 6.3.2.6 lett. d) — Metodologia di segnalazione anonima | Anonimato crittografico: nessun account, nessun login, nessuna associazione chiave→identità |
| 6.3.2.6 — Piano prevenzione e gestione molestie | Workflow strutturato: ricezione → presa in carico → indagine → chiusura con SLA configurabili |
| 6.4.6 — Gestione non conformità | Registro segnalazioni con audit trail crittografico immutabile (hash chain) |
| KPI 5.2.2 — Esprimere opinioni in modalità anonima | Questionario integrato con anonimato garantito |
| KPI 5.2.6 — Analisi percezione dipendenti (annuale) | Survey configurabile con report aggregati automatici |
| KPI 5.4.6 — Referenti e prassi tutela ambiente lavoro | Dashboard KPI con le 6 aree della norma, report pronti per audit |
| 6.4.7 — Revisione della Direzione | Export report annuale con tutti gli indicatori per la revisione |

## **11.2 D.Lgs. 24/2023 (Whistleblowing)**

| Requisito | Come Themis lo soddisfa |
| :---- | :---- |
| Canale interno di segnalazione | Canale dedicato con flusso separato da PdR 125 ma stessa infrastruttura |
| Riservatezza identità segnalante | Superato: anonimato crittografico (nemmeno il gestore conosce l’identità) |
| Avviso ricevimento entro 7 giorni | Notifica automatica via canale Styx bidirezionale |
| Riscontro entro 3 mesi | SLA configurabili con alert automatici alla RPG/OdV |
| Crittografia | E2E (ChaCha20-Poly1305 \+ X25519) — conforme Linee Guida ANAC |
| Conservazione 5 anni | Configurabile. GDPR pruning per rimozione payload post-termine |
| DPIA obbligatoria | Radicalmente semplificata: il server non tratta dati personali |

## **11.3 GDPR**

| Principio GDPR | Implementazione |
| :---- | :---- |
| Art. 5 — Minimizzazione | Il server raccoglie solo metadati aggregati. Nessun dato personale. |
| Art. 17 — Diritto alla cancellazione | GDPR pruning bilaterale: payload rimosso, hash preservato per integrità catena |
| Art. 25 — Privacy by design | Architettura zero-knowledge: la protezione è strutturale, non basata su policy |
| Art. 32 — Sicurezza del trattamento | E2E encryption, hardware enclave, SQLCipher, Shamir backup |
| Art. 35 — DPIA | Semplificata: il server Themis non è responsabile del trattamento dei contenuti |
| Art. 44-49 — Trasferimenti extra-UE | Server EU (Hetzner/OVH). Relay Nostr self-hosted in EU. Nessun dato su cloud US. |

# **12\. Confronto competitivo**

| Feature | Themis | DigitalPA | Whistlelink | MS Forms |
| :---- | :---- | :---- | :---- | :---- |
| Crittografia E2E | ✅ | ❌ | ❌ | ❌ |
| Zero-knowledge server | ✅ | ❌ | ❌ | ❌ |
| Anonimato crittografico | ✅ | ⚠️ Pseudonimo | ⚠️ Pseudonimo | ⚠️ Parziale |
| Anti-spam anonimo | ✅ | ✅ | ✅ | ❌ |
| Comunicazione bidirezionale | ✅ | ✅ | ✅ | ❌ |
| Audit trail immutabile | ✅ Hash chain | ❌ DB | ❌ DB | ❌ |
| Segnalazioni PdR 125 | ✅ | ✅ | ❌ | ⚠️ Manuale |
| Whistleblowing D.Lgs. 24/2023 | ✅ | ✅ | ✅ | ❌ |
| Survey conciliazione | ✅ | ❌ | ❌ | ⚠️ Separato |
| Dashboard KPI 6 aree | ✅ | ❌ | ❌ | ❌ |
| Report automatici per audit | ✅ | ⚠️ Parziale | ❌ | ❌ |
| Offline-first | ✅ | ❌ | ❌ | ❌ |
| Self-hosted option | ✅ Relay | ❌ | ❌ | ❌ |
| Prezzo/anno (PMI) | da €1.490 | da €468 | da €1.788 | Gratis (ma incompleto) |

# **13\. Modello SaaS e pricing**

|  | Starter | Professional | Enterprise |
| :---- | :---- | :---- | :---- |
| Target | 50–100 dipendenti | 100–250 dipendenti | 250–500+ dipendenti |
| Prezzo/anno | €1.490 | €2.490 | €4.490 |
| Segnalazioni PdR 125 | ✅ | ✅ | ✅ |
| Whistleblowing D.Lgs. 24/2023 | ✅ | ✅ | ✅ |
| Survey conciliazione | ✅ (1/anno) | ✅ (illimitati) | ✅ (illimitati) |
| Dashboard RPG | ✅ | ✅ | ✅ |
| Dashboard OdV (separata) | ✅ | ✅ | ✅ \+ multi-OdV |
| SLA alert automatici WB | ✅ (7gg \+ 3 mesi) | ✅ \+ personalizzabili | ✅ \+ escalation custom |
| Dashboard KPI | Base (3 aree PdR 125\) | Completa (6 aree \+ metriche WB) | Completa \+ custom |
| Report audit PDF | ✅ (PdR 125 \+ WB separati) | ✅ | ✅ \+ white-label |
| Comunicazione bidirezionale | ✅ (entrambi i canali) | ✅ | ✅ |
| Allegati crittografati (WB) | ✅ (max 3 file) | ✅ (max 10 file) | ✅ (illimitati) |
| Multi-sito | ❌ | ✅ (fino a 3\) | ✅ (illimitati) |
| Relay dedicato | ❌ | ❌ | ✅ (self-hosted) |
| API integrazione | ❌ | Read-only | Full CRUD |
| Supporto | Email | Email \+ chat | Dedicato \+ SLA |
| Onboarding | Self-service | Guidato | Consulenza inclusa |

## **13.1 Canali di distribuzione**

* **Organismi di certificazione** (62 accreditati Accredia): partnership di referral/reselling. L’OdC propone Themis alle aziende durante il percorso di certificazione.

* **Consulenti PdR 125**: gli studi di consulenza che accompagnano le PMI alla certificazione possono integrare Themis nella propria offerta.

* **Associazioni datoriali**: Confindustria, CNA, Confcommercio — canale per raggiungere le PMI associate.

* **Direct sales**: portale web, content marketing su compliance PdR 125, SEO su keyword specifiche.

* **Marketplace**: eventuale listing su Azure Marketplace / Portale Innovazione PA.

# **14\. Roadmap di sviluppo**

| Fase | Periodo | Deliverable | Investimento |
| :---- | :---- | :---- | :---- |
| Fase 0 — Compliance interna Nexa Data | Mar–Apr 2026 | Form Microsoft \+ procedure \+ documenti per audit aprile (in corso) | €0 (effort interno) |
| Fase 1 — MVP Themis (PdR 125 \+ WB) | Apr–Ott 2026 | App segnalante Flutter con doppio canale (PdR 125 \+ WB) \+ Dashboard RPG (web) \+ Dashboard OdV (web) \+ Pairing QR con doppia chiave \+ Form WB con identificazione opzionale \+ Allegati crittografati \+ SLA 7gg/3mesi con alert \+ Rate limiting \+ Comunicazione bidirezionale \+ Server metadati multi-tenant \+ 1 relay self-hosted | €95.000–140.000 |
| Fase 2 — v1.0 Feature-complete | Nov 2026–Mar 2027 | \+ Survey conciliazione vita-lavoro \+ Dashboard KPI 6 aree PdR 125 \+ Report audit automatici (PDF) \+ Push notifications (3 profili privacy) \+ Shamir backup chiavi RPG/OdV \+ Dashboard analytics aggregata | €50.000–70.000 |
| Fase 3 — Scale | Apr–Dic 2027 | \+ Multi-sito \+ API integrazione \+ White-label per OdC \+ Relay dedicato Enterprise \+ App store optimization \+ Partnership OdC/consulenti | €40.000–60.000 |
| Fase 4 — Espansione EU | 2028 | \+ Localizzazione (DE, FR, ES) \+ Compliance ISO 37002 \+ Marketplace Azure | Da revenue |

## **14.1 Proiezioni finanziarie**

| Anno | Clienti (cumulativi) | Revenue annua | Costi (dev \+ infra \+ sales) | EBITDA |
| :---- | :---- | :---- | :---- | :---- |
| Y1 (2027) | 75–150 | €180.000–370.000 | €200.000–240.000 | \-€20.000 → \+€130.000 |
| Y2 (2028) | 250–400 | €620.000–1.000.000 | €280.000–340.000 | \+€340.000 → \+€660.000 |
| Y3 (2029) | 450–750 | €1.100.000–1.870.000 | €380.000–480.000 | \+€720.000 → \+€1.390.000 |

# **15\. Rischi e mitigazioni**

| Rischio | Probabilità | Impatto | Mitigazione |
| :---- | :---- | :---- | :---- |
| La norma PdR 125 viene sostituita o modificata | Bassa | Alto | L’architettura è generica; il modulo PdR 125 è configurazione, non codice core |
| Microsoft/Google lanciano un form E2E | Molto bassa | Alto | Non è nel loro modello di business (vogliono i dati). Vantaggio first-mover di 18+ mesi |
| Competitor italiano copia l’architettura | Media | Medio | Styx è un vantaggio proprietario difficile da replicare (389 test, 6 package). Brevetto su architettura? |
| Adozione lenta (le PMI preferiscono il form gratuito) | Media | Alto | Go-to-market via OdC/consulenti che «prescrivono» la soluzione. Offerta freemium per acquisizione |
| Problemi di UX (l’app è più complessa di un form) | Media | Medio | UX research intensiva in Fase 1\. Il pairing QR è già uno standard (WhatsApp Web, Signal) |
| Relay Nostr inaffidabili | Bassa | Medio | Self-hosted primario \+ fallback multi-relay \+ email/IMAP come ultimo fallback (già in Styx) |
| Perdita chiave RPG | Bassa | Critico | Shamir backup 2-of-3 \+ re-keying via Blessing Events (già in Styx) |
| Evoluzione normativa WB richiede identificazione segnalante | Molto bassa | Alto | L’app può supportare opzionalmente il reveal volontario dell’identità (scelta del segnalante, non obbligo) |

# **ALLEGATO A — Diagramma architetturale**

Rappresentazione testuale del flusso dati (da tradurre in diagramma grafico per il pitch deck):

┌─────────────────────┐       ┌────────────────────┐       ┌────────────────────┐  
│  APP SEGNALANTE   │       │    RELAY NOSTR     │       │   DASHBOARD RPG    │  
│  (Flutter+Styx)   │       │  (self-hosted EU)  │       │  (React/Flutter)   │  
│                   │       │                    │       │                    │  
│ • Genera chiavi   │  E2E  │ • Trasporta blob   │  E2E  │ • Decripta con     │  
│ • Cripta payload  │─────▶│   crittografati    │─────▶│   chiave privata   │  
│ • Firma Ed25519   │       │ • Non legge nulla  │       │ • Workflow gestione│  
│ • Rate limiting   │       │ • Effimero         │       │ • Report audit     │  
└─────────────────────┘       └────────────────────┘       └──────────┬─────────┘  
                                                                  │ Solo metadati  
                                                                  │ aggregati  
                                                                  ▼  
                                                          ┌────────────────────┐  
                                                          │  SERVER THEMIS     │  
                                                          │  (Node.js \+ PG)    │  
                                                          │                    │  
                                                          │ • Multi-tenant     │  
                                                          │ • Dashboard KPI    │  
                                                          │ • Fatturazione     │  
                                                          │ • ZERO contenuti   │  
                                                          └────────────────────┘

# **ALLEGATO B — Schema dati del server Themis**

Il server Themis archivia **solo** i seguenti dati. Nessuno di questi contiene il contenuto delle segnalazioni.

**Tabella: organizations**

| Campo | Tipo | Descrizione |
| :---- | :---- | :---- |
| id | UUID | Identificativo azienda |
| name | VARCHAR | Ragione sociale |
| plan | ENUM | starter | professional | enterprise |
| rpg\_public\_key | VARCHAR | Chiave pubblica Ed25519 della RPG (canale PdR 125\) |
| odv\_public\_key | VARCHAR | Chiave pubblica Ed25519 dell’OdV (canale WB) |
| relay\_urls | JSONB | URL dei relay Nostr configurati |
| pairing\_qr\_data | JSONB | Dati QR: id \+ pubkey RPG \+ pubkey OdV \+ relay URLs |
| wb\_sla\_ack\_days | INTEGER | SLA avviso ricezione WB (default: 7\) |
| wb\_sla\_response\_days | INTEGER | SLA riscontro WB (default: 90\) |
| pdr\_sla\_ack\_days | INTEGER | SLA presa in carico PdR 125 (default: 3, best practice) |
| pdr\_sla\_response\_days | INTEGER | SLA chiusura PdR 125 (default: 45, best practice) |
| created\_at | TIMESTAMP | Data registrazione |
| subscription\_expires | TIMESTAMP | Scadenza abbonamento |

**Tabella: report\_metadata** (flusso a due tempi)

I campi sono divisi in due gruppi: quelli popolati automaticamente dall’app del segnalante al momento dell’invio (TEMPO 1), e quelli aggiornati manualmente dal gestore dopo la decriptazione (TEMPO 2).

| Campo | Tipo | Tempo | Descrizione |
| :---- | :---- | :---- | :---- |
| id | UUID | Auto | ID metadato (NON è l’ID della segnalazione Styx) |
| org\_id | UUID | TEMPO 1 | FK → organizations. Inviato dall’app segnalante. |
| channel | ENUM | TEMPO 1 | pdr125 | whistleblowing. Inviato dall’app segnalante. |
| received\_at | TIMESTAMP | TEMPO 1 | Quando la segnalazione è arrivata. Inviato dall’app segnalante. |
| \--- Campi sotto: NULL al TEMPO 1, popolati via PUT dal gestore (TEMPO 2\) \--- |  |  |  |
| category | ENUM | NULL | TEMPO 2 | PdR: molestia|discriminazione|mobbing|micro|altro. WB: penale|amministrativo|contabile|mog231|ue|corruzione|frode|altro. Default: NULL. |
| status | ENUM | TEMPO 2 | received (auto) | acknowledged | investigating | response\_given | closed\_founded | closed\_unfounded | closed\_bad\_faith |
| identity\_revealed | BOOLEAN | NULL | TEMPO 2 | Solo WB. True se il segnalante si è identificato. Il gestore lo imposta DOPO aver decriptato. Default: NULL. |
| has\_attachments | BOOLEAN | NULL | TEMPO 2 | True se ci sono allegati. Il gestore lo imposta DOPO aver decriptato. Default: NULL. |
| acknowledged\_at | TIMESTAMP | NULL | TEMPO 2 | Quando il gestore ha preso in carico (SLA WB: 7gg) |
| response\_given\_at | TIMESTAMP | NULL | TEMPO 2 | Quando il gestore ha dato riscontro (SLA WB: 90gg) |
| closed\_at | TIMESTAMP | NULL | TEMPO 2 | Chiusura procedimento |
| sla\_ack\_deadline | TIMESTAMP | Auto | Calcolata: received\_at \+ org.wb\_sla\_ack\_days |
| sla\_response\_deadline | TIMESTAMP | Auto | Calcolata: received\_at \+ org.wb\_sla\_response\_days |
| sla\_ack\_met | BOOLEAN | NULL | Auto | Calcolato quando acknowledged\_at viene impostato |
| sla\_response\_met | BOOLEAN | NULL | Auto | Calcolato quando response\_given\_at viene impostato |

| ⚠️ DIFESA IN PROFONDITÀ: il POST /api/v1/reports/metadata accetta SOLO org\_id, channel, received\_at. Se la richiesta contiene identity\_revealed, has\_attachments, category o qualsiasi altro campo → risposta 400 Bad Request. Questi campi sono accettati SOLO via PUT con JWT del gestore autenticato. |
| :---- |

**Tabella: survey\_results**

| Campo | Tipo | Descrizione |
| :---- | :---- | :---- |
| id | UUID | ID risultato aggregato |
| org\_id | UUID | FK → organizations |
| survey\_id | VARCHAR | Identificativo del questionario |
| question\_id | VARCHAR | Identificativo della domanda |
| response\_value | INTEGER | Valore numerico della risposta (1–10) |
| submitted\_at | TIMESTAMP | Timestamp (nessuna associazione a identità) |

| ℹ️ I dati del questionario possono transitare dal server (non sono E2E) perché sono anonimi per natura e destinati all’analisi aggregata. Solo le segnalazioni abusi/WB sono E2E. |
| :---- |

# **ALLEGATO C — Struttura payload Styx per canale**

Ogni segnalazione è un evento Styx con payload JSON crittografato E2E. Il server non vede mai il contenuto. Di seguito la struttura per ciascun canale.

**Payload segnalazione PdR 125** (crittografato con chiave pubblica RPG)

| Campo JSON | Tipo | Obbligatorio | Note |
| :---- | :---- | :---- | :---- |
| type | string | SÌ | Fisso: «segnalazione\_pdr125» |
| category | string\[\] | SÌ | Array: molestia\_sessuale | discriminazione\_genere | mobbing | linguaggio\_offensivo | microaggressione | disparita\_retributiva | altro |
| category\_other | string | NO | Se category include «altro» |
| description | string | SÌ | Testo libero descrizione accaduto |
| when | string | NO | Data/periodo approssimativo |
| where | string\[\] | NO | sede | remoto | trasferta | comunicazione\_scritta | social | altro |
| frequency | string | NO | singolo | ripetuto | sistematico |
| people\_involved | string | NO | Ruoli/reparti coinvolti |
| witnesses | string | NO | presenti | soli | non\_sicuro |
| previous\_report | string | NO | fiducia | hr | prima\_volta |
| impact | string\[\] | NO | disagio | lavoro | lasciare | salute | nessuno |
| wants\_contact | boolean | NO | Se true, campo contact\_info presente |
| contact\_info | string | NO | Email/telefono non aziendale |

**Payload segnalazione Whistleblowing** (crittografato con chiave pubblica OdV)

| Campo JSON | Tipo | Obbligatorio | Note |
| :---- | :---- | :---- | :---- |
| type | string | SÌ | Fisso: «segnalazione\_wb» |
| violation\_type | string\[\] | SÌ | Array: penale | amministrativo | contabile | mog231 | diritto\_ue | corruzione | conflitto\_interessi | danno\_ambientale | frode | altro |
| violation\_other | string | NO | Se violation\_type include «altro» |
| description | string | SÌ | Descrizione dettagliata dei fatti |
| when | string | NO | Data/periodo |
| where | string | NO | sede | remoto | trasferta | terzi | altro |
| people\_involved | string | NO | Nomi, ruoli, reparti |
| witnesses\_evidence | string | NO | Descrizione testimoni e prove disponibili |
| attachment\_event\_ids | string\[\] | NO | Array di event\_id degli allegati crittografati |
| previous\_report | string | NO | prima\_volta | interno | anac | autorita\_giudiziaria |
| identity\_revealed | boolean | SÌ | false \= anonimo, true \= identificato |
| identity\_name | string | COND | Solo se identity\_revealed \= true |
| identity\_role | string | COND | Solo se identity\_revealed \= true |
| identity\_contact | string | COND | Solo se identity\_revealed \= true |
| anonymous\_contact | string | NO | Solo se identity\_revealed \= false. Recapito sicuro opzionale. |

**Evento allegato** (crittografato con stessa chiave del parent)

| Campo JSON | Tipo | Note |
| :---- | :---- | :---- |
| type | string | Fisso: «attachment» |
| parent\_event\_id | string | ID dell’evento segnalazione a cui è collegato |
| filename | string | Nome originale del file |
| mime\_type | string | application/pdf | image/jpeg | image/png | ... |
| size\_bytes | integer | Dimensione del file originale |
| data | base64 | Contenuto del file crittografato E2E |

**Metadato TEMPO 1 — POST automatico dall’app segnalante (3 campi, nessun contenuto)**

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| org\_id | string | ID azienda |
| channel | string | pdr125 | whistleblowing |
| received\_at | timestamp | Quando l’evento è stato inviato |

Il server crea una riga in report\_metadata con status: «received» e tutti gli altri campi NULL.

**Metadato TEMPO 2 — PUT manuale dal gestore dopo decriptazione (arricchimento)**

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| category | string | Tipo di violazione/molestia. Il gestore lo legge dal contenuto decriptato e lo riporta. |
| status | string | acknowledged | investigating | response\_given | closed\_\* |
| identity\_revealed | boolean | Solo WB. Il gestore sa se il segnalante si è identificato perché ha decriptato il payload. |
| has\_attachments | boolean | Il gestore sa se ci sono allegati perché ha decriptato il payload. |

| ⚠️ Il metadato TEMPO 1 (3 campi) è l’UNICA informazione che l’app segnalante invia al server. Il server POST rifiuta con 400 qualsiasi campo aggiuntivo. Il metadato TEMPO 2 arriva solo dal gestore autenticato (JWT) via PUT, dopo aver decriptato la segnalazione sul proprio dispositivo. Il server non impara nulla dal segnalante — impara dal gestore, che sceglie consapevolmente cosa condividere. |
| :---- |

# **ALLEGATO D — Survey JSON Schema completo**

Questo è lo schema JSON che definisce un questionario nell’editor Themis. Il server lo archivia così com’è; l’app Flutter lo renderizza dinamicamente.

**Schema root**

| Campo | Tipo | Obbligatorio | Descrizione |
| :---- | :---- | :---- | :---- |
| id | string | Sì | UUID generato dal server alla creazione |
| title | string | Sì | Titolo del questionario mostrato al rispondente |
| description | string | No | Sottotitolo/istruzioni generali |
| version | integer | Sì | Versione dello schema (incrementale per tracciare modifiche) |
| org\_id | string | Sì | FK azienda proprietaria |
| created\_by | string | Sì | «rpg» | «consulente» | «template» |
| status | string | Sì | «draft» | «active» | «closed» | «archived» |
| one\_response\_per\_device | boolean | No (default: true) | Se true, l’app impedisce invii multipli dalla stessa installazione |
| show\_progress\_bar | boolean | No (default: true) | Mostra barra di avanzamento |
| shuffle\_sections | boolean | No (default: false) | Randomizza ordine sezioni (non domande dentro le sezioni) |
| active\_from | datetime | null | No | Data inizio raccolta risposte (null \= subito) |
| active\_until | datetime | null | No | Data fine raccolta (null \= permanente) |
| questions | Question\[\] | Sì | Array ordinato di domande e sezioni |

**Schema Question (oggetto nell’array \`questions\`)**

| Campo | Tipo | Default | Descrizione |
| :---- | :---- | :---- | :---- |
| id | string | (obbligatorio) | Identificativo unico (es. «q1», «C3», «eta») |
| type | enum | (obbligatorio) | choice | multi\_choice | text | long\_text | rating | likert | date | nps | ranking | section |
| label | string | (obbligatorio) | Testo della domanda |
| subtitle | string | null | null | Istruzioni/placeholder sotto la domanda |
| required | boolean | false | Impedisce proseguimento senza risposta |
| private | boolean | false | Se true: risposta crittografata E2E via Styx, non va al server |
| show\_if | Condition | null | null | Branching: visibile solo se la condizione è vera |
| \--- Proprietà tipo \`choice\` \--- |  |  |  |
| options | string\[\] | — | Array di opzioni per choice / multi\_choice / ranking |
| other\_enabled | boolean | false | Aggiunge opzione «Altro» con campo testo libero |
| \--- Proprietà tipo \`rating\` \--- |  |  |  |
| levels | integer | 5 | Numero di livelli (2–10) |
| symbol | enum | number | number | star | smiley |
| label\_start | string | null | null | Etichetta estremo sinistro (es. «Per niente») |
| label\_end | string | null | null | Etichetta estremo destro (es. «Completamente») |
| \--- Proprietà tipo \`likert\` \--- |  |  |  |
| statements | string\[\] | — | Array di affermazioni (righe della matrice) |
| columns | string\[\] | — | Array di opzioni di risposta (colonne della matrice) |
| \--- Proprietà tipo \`text\` \--- |  |  |  |
| max\_length | integer | null | null | Limite caratteri |
| restriction | enum | null | null | number | email | regex (validazione input) |
| restriction\_pattern | string | null | null | Regex custom (se restriction \= «regex») |
| \--- Proprietà tipo \`multi\_choice\` \--- |  |  |  |
| max\_selections | integer | null | null | Limite massimo di opzioni selezionabili |
| \--- Proprietà tipo \`nps\` \--- |  |  |  |
| label\_detractor | string | Per nulla probabile | Etichetta 0–6 |
| label\_passive | string | Neutro | Etichetta 7–8 |
| label\_promoter | string | Molto probabile | Etichetta 9–10 |

**Schema Condition (oggetto \`show\_if\`)**

| Campo | Tipo | Descrizione |
| :---- | :---- | :---- |
| question\_id | string | ID della domanda da cui dipende la visibilità |
| operator | enum | equals | not\_equals | contains | any\_of | none\_of | greater\_than | less\_than | is\_answered | is\_not\_answered |
| value | string | number | string\[\] | null | Valore di confronto. Per any\_of/none\_of: array. Per is\_answered: null. |
| \--- Condizioni composte \--- |  |  |
| conditions | Condition\[\] | Array di sotto-condizioni (alternativa a question\_id+operator+value) |
| logic | enum (AND | OR) | Operatore logico tra le sotto-condizioni. Default: AND. |

**Schema risposta inviata al server (bucket pubblico)**

| Campo | Tipo | Descrizione |
| :---- | :---- | :---- |
| survey\_id | string | ID del questionario |
| submitted\_at | datetime | Timestamp di invio |
| has\_private\_bucket | boolean | True se ci sono risposte private inviate via Styx |
| answers | object | Mappa question\_id → valore. SOLO domande con private:false. Es: { «C1»: «subiti», «B3»: 8 } |

**Schema risposta inviata via Styx (bucket privato, crittografato E2E)**

| Campo | Tipo | Descrizione |
| :---- | :---- | :---- |
| type | string | Fisso: «survey\_private\_answers» |
| survey\_id | string | ID del questionario (per correlazione con il bucket pubblico) |
| submitted\_at | datetime | Stesso timestamp del bucket pubblico |
| answers | object | Mappa question\_id → valore. SOLO domande con private:true. Es: { «C3»: «Il responsabile...», «C6»: «maria@gmail.com» } |

| ⚠️ Il server non riceve MAI i question\_id dei campi privati. Non sa quante domande private ci sono, né quali. Sa solo has\_private\_bucket: true/false. La RPG nella dashboard può correlare i due bucket perché condividono survey\_id \+ submitted\_at, ma il server non può fare la stessa operazione inversa (non ha il bucket privato). |
| :---- |

