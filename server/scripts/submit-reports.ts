/**
 * Bulk-submit realistic PdR 125 reports via Nostr relay.
 * Replicates the same E2E crypto flow as the web form.
 *
 * Usage: cd server && npx tsx scripts/submit-reports.ts [count]
 */

import WebSocket from "ws";
import { schnorr } from "@noble/curves/secp256k1.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from "@noble/hashes/utils.js";
import { config } from "../src/utils/config";

const SURVEY_ID = "40285c8f-a39c-4167-80b8-2354e1b58318";
const ORG_ID = "7d4513c4-723f-4f0a-afd0-5d8c9dbed384";
const RELAY_URL = config.relayUrls[0];
const API_URL = `http://localhost:${config.port}/api/v1`;
const TARGET_COUNT = parseInt(process.argv[2] || "40", 10);

// ── Crypto helpers (same as web client) ────────────────────────────

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function encryptForRecipient(plaintext: string, recipientPubKeyHex: string): string {
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const sharedSecret = x25519.getSharedSecret(ephPriv, hexToBytes(recipientPubKeyHex));
  const encKey = hkdf(sha256, sharedSecret, utf8ToBytes("fidesvox-e2e"), undefined, 32);
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(encKey, nonce);
  const ct = cipher.encrypt(utf8ToBytes(plaintext));
  return bytesToHex(ephPub) + Buffer.from(concatBytes(nonce, ct)).toString("base64");
}

function countLeadingZeroBits(hash: Uint8Array): number {
  let count = 0;
  for (const byte of hash) {
    if (byte === 0) { count += 8; } else { count += Math.clz32(byte) - 24; break; }
  }
  return count;
}

interface NostrEvent {
  id: string; pubkey: string; created_at: number; kind: number;
  tags: string[][]; content: string; sig: string;
}

function minePoW(
  event: Omit<NostrEvent, "id" | "sig">,
  privKey: Uint8Array,
  difficulty: number,
): NostrEvent {
  let nonce = 0;
  while (true) {
    const tags = [...event.tags, ["nonce", String(nonce), String(difficulty)]];
    const candidate = { ...event, tags };
    const serialized = JSON.stringify([0, candidate.pubkey, candidate.created_at, candidate.kind, candidate.tags, candidate.content]);
    const hash = sha256(utf8ToBytes(serialized));
    if (countLeadingZeroBits(hash) >= difficulty) {
      return { ...candidate, id: bytesToHex(hash), sig: bytesToHex(schnorr.sign(hash, privKey)) };
    }
    nonce++;
  }
}

// ── Realistic data generation ──────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

const CATEGORIES = [
  ["molestia_sessuale"],
  ["discriminazione_genere"],
  ["mobbing"],
  ["linguaggio_offensivo"],
  ["microaggressioni"],
  ["molestia_sessuale", "linguaggio_offensivo"],
  ["discriminazione_genere", "mobbing"],
];

const DESCRIPTIONS = [
  "Durante una riunione di team il mio responsabile ha fatto commenti inappropriati sul mio aspetto fisico davanti ai colleghi, creando un forte disagio.",
  "Mi è stata negata una promozione nonostante risultati superiori ai colleghi maschi dello stesso livello. Il feedback ricevuto faceva riferimento alla mia 'situazione familiare'.",
  "Un collega senior mi invia messaggi insistenti fuori orario con toni ambigui e battute a sfondo sessuale. Ho chiesto di smettere ma continua.",
  "Vengo sistematicamente esclusa dalle riunioni strategiche del reparto. Quando ho chiesto spiegazioni mi è stato detto che 'non è il mio posto'.",
  "Il mio supervisore fa regolarmente battute denigratorie sulle capacità delle donne nel nostro settore, spesso rivolgendosi direttamente a me.",
  "Dopo aver annunciato la mia gravidanza, il mio carico di lavoro è stato ridotto senza consultarmi e sono stata rimossa da un progetto chiave.",
  "Un collega mi ha toccato ripetutamente la spalla e la schiena nonostante io abbia espresso chiaramente il mio disagio più volte.",
  "Durante un evento aziendale, un dirigente ha fatto commenti volgari e ha insistito per offrirmi da bere in modo pressante.",
  "Ricevo costantemente commenti sul mio modo di vestire da parte del team leader, con riferimenti espliciti al mio corpo.",
  "Sono stata oggetto di pettegolezzi diffamatori riguardo presunti 'favori' per ottenere la mia posizione. La voce è partita dal mio ex-responsabile.",
  "Mi vengono assegnati sistematicamente compiti amministrativi (prendere appunti, organizzare riunioni) nonostante il mio ruolo sia tecnico, a differenza dei colleghi maschi.",
  "Il responsabile HR ha minimizzato una mia precedente segnalazione verbale dicendo che dovrei 'essere meno sensibile'.",
  "Un collega ha condiviso nella chat di gruppo un meme sessista riferito esplicitamente a me. Nessuno è intervenuto.",
  "Vengo regolarmente interrotta durante le presentazioni dai colleghi maschi, che si attribuiscono poi le mie idee.",
  "Il mio responsabile ha commentato pubblicamente che le donne 'non reggono la pressione' dopo che ho chiesto un giorno di permesso per motivi familiari.",
  "Durante il colloquio di valutazione mi è stato chiesto se 'intendo avere figli a breve' e questo ha influito sul mio rating.",
  "Subisco commenti ricorrenti sulla mia età e sul fatto che 'a quest'età dovresti già avere una famiglia' da parte di colleghi senior.",
  "Un fornitore esterno ha fatto apprezzamenti non richiesti durante una call di lavoro. Il mio responsabile presente non è intervenuto.",
  "Mi è stato chiesto di partecipare a cene aziendali in contesti poco professionali con pressioni implicite sulla mia carriera.",
  "Ho scoperto che colleghi con la stessa mansione e anzianità percepiscono uno stipendio significativamente superiore al mio.",
  "Il mio team leader usa un tono aggressivo e intimidatorio esclusivamente con le colleghe donne del reparto.",
  "Dopo aver rifiutato un invito a cena del mio responsabile, ho notato un cambiamento nel trattamento lavorativo nei miei confronti.",
  "Un collega ha fatto circolare foto di una collega con commenti volgari nella chat privata del team. Ne sono venuta a conoscenza per caso.",
  "Vengo regolarmente chiamata con vezzeggiativi ('cara', 'tesoro') dal direttore di funzione durante le riunioni formali.",
  "Mi è stato detto che il mio ruolo non è 'adatto a una donna' quando ho chiesto di essere coinvolta in progetti internazionali.",
  "Il mio responsabile commenta abitualmente la vita privata delle colleghe in ufficio, facendo domande invasive.",
  "Durante una trasferta lavorativa un collega senior ha insistito per accompagnarmi in hotel nonostante il mio rifiuto.",
  "Sono stata esclusa da un percorso di formazione riservato ai 'talenti' del reparto senza motivazione, a differenza di colleghi meno esperti.",
  "Il clima nel reparto è diventato ostile dopo che ho chiesto il part-time per la maternità. Vengo trattata come se non fossi più affidabile.",
  "Un dirigente ha detto durante un evento aziendale che 'le quote rosa abbassano la qualità' guardando nella mia direzione.",
  "Mi vengono assegnate sistematicamente le trasferte meno interessanti mentre i colleghi maschi ottengono quelle strategiche.",
  "Ho subito pressioni per ritirare un reclamo formale con la promessa di 'sistemare le cose in modo informale'.",
  "Il mio collega fa battute ricorrenti sulla presunta incapacità delle donne di parcheggiare, guidare, o prendere decisioni rapide.",
  "Mi è stato negato l'accesso a dati e strumenti necessari per il mio lavoro dopo aver espresso disaccordo con il mio responsabile.",
  "Un membro del CDA ha fatto commenti sul mio abbigliamento durante una presentazione al board, deviando l'attenzione dal contenuto.",
  "Subisco isolamento sociale nel team: non vengo invitata a pranzi, pause caffè e attività informali da quando sono rientrata dalla maternità.",
  "Il mio responsabile ha distribuito i bonus annuali in modo palesemente sbilanciato a favore dei colleghi maschi, senza criteri oggettivi.",
  "Durante un workshop un formatore esterno ha fatto battute sessiste. Ho segnalato la cosa ma non è stato preso alcun provvedimento.",
  "Mi sono state attribuite responsabilità aggiuntive senza adeguamento contrattuale, cosa che non è avvenuta per i colleghi nella stessa situazione.",
  "Un collega ha creato un soprannome offensivo basato sul mio aspetto fisico che viene usato abitualmente nel reparto.",
];

const WHEN_OPTIONS = [
  "Settimana scorsa, durante la riunione del lunedì mattina",
  "Tre giorni fa, in pausa pranzo",
  "Ieri pomeriggio verso le 16",
  "La scorsa settimana, mercoledì 19 marzo",
  "Circa due settimane fa",
  "Venerdì 14 marzo, dopo la riunione di reparto",
  "Il 10 marzo durante un workshop",
  "Inizio marzo 2026",
  "Nell'ultima settimana, più episodi",
  "Lunedì 17 marzo, ore 11 circa",
  "Da circa un mese, episodi ricorrenti",
  "Durante l'ultimo trimestre, con frequenza crescente",
  "Il 5 marzo durante la cena aziendale",
  "Tra febbraio e marzo 2026, più occasioni",
  "Ieri mattina in ufficio",
];

const WHERE_OPTIONS = ["sede", "remoto", "trasferta", "comunicazione_scritta"];
const PEOPLE = [
  "Il responsabile di reparto, ruolo dirigenziale",
  "Un collega senior del team vendite",
  "Il direttore commerciale",
  "Un membro del team IT, stesso livello",
  "Il team leader del reparto operations",
  "Un fornitore esterno presente in azienda",
  "Preferisco non specificare in questa fase",
  "Due colleghi del reparto marketing",
  "Il responsabile HR",
  "Un dirigente di altra funzione",
];
const WITNESSES_OPTIONS = ["yes", "no", "not_sure"];
const PREVIOUS_REPORT_OPTIONS = ["trust_person", "hr", "first_report", "first_report", "first_report"];
const WANTS_CONTACT_OPTIONS = ["yes", "no", "no", "no"];

function generateReport(index: number) {
  const category = pick(CATEGORIES);
  const privateAnswers: Record<string, unknown> = {
    description: DESCRIPTIONS[index % DESCRIPTIONS.length],
    when: pick(WHEN_OPTIONS),
    people_involved: pick(PEOPLE),
  };
  // Some reports include optional fields
  if (Math.random() < 0.3) {
    privateAnswers.where_other = "Sala riunioni al terzo piano";
  }
  if (Math.random() < 0.2) {
    privateAnswers.contact_info = `segnalante${index}@protonmail.com`;
  }

  const publicAnswers: Record<string, unknown> = {
    category,
    where: pick(WHERE_OPTIONS),
    witnesses: pick(WITNESSES_OPTIONS),
    previous_report: pick(PREVIOUS_REPORT_OPTIONS),
    wants_contact: pick(WANTS_CONTACT_OPTIONS),
  };

  return { privateAnswers, publicAnswers };
}

// ── Fetch Nostr config ─────────────────────────────────────────────

async function getNostrConfig() {
  const res = await fetch(`${API_URL}/public/surveys/${SURVEY_ID}/nostr-config`);
  if (!res.ok) throw new Error(`Failed to get nostr config: ${res.status}`);
  return res.json() as Promise<{
    relayUrls: string[];
    serverPubKey: string;
    serverX25519PubKey: string;
    powDifficulty: number;
    recipientPubKey: string | null;
  }>;
}

// ── Submit one report via relay ────────────────────────────────────

function submitOneReport(
  privateAnswers: Record<string, unknown>,
  publicAnswers: Record<string, unknown>,
  nostrConfig: Awaited<ReturnType<typeof getNostrConfig>>,
): Promise<void> {
  const { serverPubKey, serverX25519PubKey, powDifficulty, recipientPubKey } = nostrConfig;
  const ephPrivKey = randomBytes(32);
  const ephPubKey = bytesToHex(schnorr.getPublicKey(ephPrivKey));
  const now = Math.floor(Date.now() / 1000);

  const privateEncKey = recipientPubKey || serverX25519PubKey;

  const privateContent = JSON.stringify({
    type: "survey_private_answers",
    survey_id: SURVEY_ID,
    org_id: ORG_ID,
    answers: privateAnswers,
  });
  const encryptedPrivate = encryptForRecipient(privateContent, privateEncKey);

  const ev4000 = minePoW({
    pubkey: ephPubKey,
    created_at: now,
    kind: 4000,
    tags: [
      ["p", serverPubKey],
      ...(recipientPubKey ? [["p", recipientPubKey]] : []),
      ["t", "fidesvox"],
      ["survey", SURVEY_ID],
    ],
    content: encryptedPrivate,
  }, ephPrivKey, powDifficulty);

  const publicContent = JSON.stringify({
    type: "survey_public_answers",
    survey_id: SURVEY_ID,
    org_id: ORG_ID,
    submitted_at: new Date().toISOString(),
    public_answers: publicAnswers,
  });
  const encryptedPublic = encryptForRecipient(publicContent, serverX25519PubKey);

  const ev4001 = minePoW({
    pubkey: ephPubKey,
    created_at: now,
    kind: 4001,
    tags: [
      ["p", serverPubKey],
      ["t", "fidesvox"],
      ["survey", SURVEY_ID],
      ["org", ORG_ID],
    ],
    content: encryptedPublic,
  }, ephPrivKey, powDifficulty);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_URL);
    let okCount = 0;

    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      if (okCount >= 2) resolve();
      else reject(new Error("Timeout waiting for relay OK"));
    }, 10000);

    ws.on("open", () => {
      ws.send(JSON.stringify(["EVENT", ev4000]));
      ws.send(JSON.stringify(["EVENT", ev4001]));
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === "OK" && msg[2] === true) {
          okCount++;
          if (okCount >= 2) {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        }
      } catch {}
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching Nostr config for survey ${SURVEY_ID}...`);
  const nostrConfig = await getNostrConfig();
  console.log(`  Relay: ${nostrConfig.relayUrls[0]}`);
  console.log(`  PoW difficulty: ${nostrConfig.powDifficulty}`);
  console.log(`  Recipient key: ${nostrConfig.recipientPubKey?.slice(0, 16) || "none"}...`);
  console.log(`\nSubmitting ${TARGET_COUNT} reports...\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < TARGET_COUNT; i++) {
    const { privateAnswers, publicAnswers } = generateReport(i);
    const category = (publicAnswers.category as string[]).join(", ");
    try {
      await submitOneReport(privateAnswers, publicAnswers, nostrConfig);
      ok++;
      process.stdout.write(`  [${ok}/${TARGET_COUNT}] ✓ ${category}\n`);
    } catch (err) {
      fail++;
      process.stdout.write(`  [${ok}/${TARGET_COUNT}] ✗ ${category} — ${err}\n`);
    }
  }

  console.log(`\nDone: ${ok} submitted, ${fail} failed`);

  // Wait a moment for server to process events
  console.log("Waiting 3s for server to process events...");
  await new Promise((r) => setTimeout(r, 3000));

  // Verify
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const count = await prisma.reportMetadata.count({ where: { orgId: ORG_ID } });
  console.log(`ReportMetadata count: ${count}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
