# Themis

Piattaforma SaaS zero-knowledge per compliance UNI/PdR 125:2022 (parità di genere)
e D.Lgs. 24/2023 (whistleblowing). Il contenuto delle segnalazioni è crittografato E2E
tra segnalante e destinatario — il server Themis non ha MAI accesso ai contenuti.

## Struttura
- `server/` — Server metadati Node.js (Express + Prisma + PostgreSQL). ZERO contenuti.
- `web/` — Tre app React: Dashboard RPG, Dashboard OdV, Portale onboarding aziende
- `mobile/` — App Flutter segnalante (dual-channel PdR125 + WB) + usa Styx
- `styx/` — Libreria P2P crittografica (Dart monorepo, 6 pacchetti, 389 test)

## Architettura zero-knowledge — VINCOLO INVIOLABILE
Il server vede SOLO metadati: org_id, channel, category, identity_revealed (flag),
has_attachments, received_at, stati, SLA. MAI testo, nomi, descrizioni, allegati.
La decrittazione avviene SOLO lato client (app mobile, dashboard RPG, dashboard OdV).
Ogni violazione di questo principio è un bug critico di sicurezza.

## Flusso dati
```
App segnalante → [E2E cripta con pubkey RPG o OdV] → Relay Nostr → [E2E] → Dashboard RPG/OdV
                                                                                    │
                                                                        Solo metadati aggregati
                                                                                    ↓
                                                                            Server Themis
```

## Due canali, due destinatari, due chiavi
- PdR 125 (abusi/molestie) → cripta con chiave pubblica RPG → Dashboard RPG decripta
- Whistleblowing (illeciti) → cripta con chiave pubblica OdV → Dashboard OdV decripta
- Le due dashboard sono crittograficamente isolate: RPG non legge WB e viceversa

## Navigazione codebase — OBBLIGATORIO
NON usare MAI Glob, Grep o Read per trovare o esplorare codice.
Usa ESCLUSIVAMENTE i tool di codebase-memory-mcp.
Usa Read SOLO dopo che codebase-memory ha indicato il file esatto.

## Verifica frontend
Dopo modifiche a componenti React, usa playwright MCP per verificare
su http://localhost:3000. Non dichiarare completato senza aver testato nel browser.

## Relazione mobile ↔ styx
L'app mobile/ importa styx come path dependency locale.
Modifiche a styx/ possono rompere mobile/ — testa entrambi.

## Convenzioni globali
- Lingua codice e commit: inglese
- Commit: Conventional Commits (feat:, fix:, chore:)
- TypeScript strict in server/ e web/
- Dart strong mode in mobile/ e styx/
- Validazione input a ogni boundary
- Mai hardcodare secrets, sempre env variables
- Test per ogni feature nuova
