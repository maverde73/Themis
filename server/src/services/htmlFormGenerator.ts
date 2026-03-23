import * as fs from "fs";
import * as path from "path";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { getX25519Pubkey } from "../utils/nostrKeys";
import { AppError } from "../middleware/errorHandler";

interface SurveyQuestion {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  private?: boolean;
  accessLevel?: number;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  placeholder?: string;
}

interface SurveySchema {
  title?: string;
  description?: string;
  questions: SurveyQuestion[];
}

let styxJsBundle: string | null = null;

function getStyxJsBundle(): string {
  if (styxJsBundle) return styxJsBundle;
  const bundlePath = path.resolve(__dirname, "../dist/styx-js.min.js");
  if (!fs.existsSync(bundlePath)) {
    throw new AppError(500, "styx-js bundle not built. Run: npm run build:styx-js");
  }
  styxJsBundle = fs.readFileSync(bundlePath, "utf-8");
  return styxJsBundle;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderQuestion(q: SurveyQuestion): string {
  const effectiveLevel = q.accessLevel ?? (q.private ? 0 : 5);
  const privateAttr = `data-private="${effectiveLevel < 5 ? "true" : "false"}" data-access-level="${effectiveLevel}"`;
  const requiredAttr = q.required ? "required" : "";
  const label = `<label for="${q.id}" class="fv-label">${escapeHtml(q.label)}${q.required ? ' <span class="fv-required">*</span>' : ""}</label>`;

  switch (q.type) {
    case "text":
      return `<div class="fv-field">${label}<input type="text" id="${q.id}" name="${q.id}" ${privateAttr} ${requiredAttr} placeholder="${escapeHtml(q.placeholder || "")}" class="fv-input"></div>`;
    case "textarea":
      return `<div class="fv-field">${label}<textarea id="${q.id}" name="${q.id}" ${privateAttr} ${requiredAttr} rows="4" placeholder="${escapeHtml(q.placeholder || "")}" class="fv-textarea"></textarea></div>`;
    case "select":
      const options = (q.options || [])
        .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
        .join("");
      return `<div class="fv-field">${label}<select id="${q.id}" name="${q.id}" ${privateAttr} ${requiredAttr} class="fv-select"><option value="">-- Seleziona --</option>${options}</select></div>`;
    case "radio":
      const radios = (q.options || [])
        .map(
          (o) =>
            `<label class="fv-radio-label"><input type="radio" name="${q.id}" value="${escapeHtml(o.value)}" ${privateAttr}> ${escapeHtml(o.label)}</label>`,
        )
        .join("");
      return `<div class="fv-field">${label}<div class="fv-radio-group">${radios}</div></div>`;
    case "checkbox":
      return `<div class="fv-field"><label class="fv-checkbox-label"><input type="checkbox" id="${q.id}" name="${q.id}" ${privateAttr}> ${escapeHtml(q.label)}</label></div>`;
    case "range":
      return `<div class="fv-field">${label}<div class="fv-range-wrap"><input type="range" id="${q.id}" name="${q.id}" ${privateAttr} min="${q.min ?? 1}" max="${q.max ?? 10}" value="${Math.floor(((q.min ?? 1) + (q.max ?? 10)) / 2)}" class="fv-range" oninput="document.getElementById('${q.id}_val').textContent=this.value"><span id="${q.id}_val" class="fv-range-val">${Math.floor(((q.min ?? 1) + (q.max ?? 10)) / 2)}</span></div></div>`;
    case "number":
      return `<div class="fv-field">${label}<input type="number" id="${q.id}" name="${q.id}" ${privateAttr} ${requiredAttr} min="${q.min ?? ""}" max="${q.max ?? ""}" class="fv-input"></div>`;
    default:
      return `<div class="fv-field">${label}<input type="text" id="${q.id}" name="${q.id}" ${privateAttr} ${requiredAttr} class="fv-input"></div>`;
  }
}

export async function generateFormHtml(surveyId: string): Promise<string> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { org: { select: { id: true, name: true, relayUrls: true, rpgPublicKey: true } } },
  });

  if (!survey) throw new AppError(404, "Survey not found");
  if (survey.status !== "ACTIVE") throw new AppError(400, "Survey is not active");

  const schema = survey.schema as unknown as SurveySchema;
  const questions = schema.questions || [];
  const orgRelayUrls = (survey.org.relayUrls as string[]) || config.relayUrls;
  const recipientPubKey = survey.org.rpgPublicKey || "";

  const formFields = questions.map(renderQuestion).join("\n");

  const configJson = JSON.stringify({
    surveyId: survey.id,
    orgId: survey.orgId,
    relayUrls: orgRelayUrls,
    recipientPubKey,
    serverPubKey: getX25519Pubkey(),
    powDifficulty: config.nostrPowDifficulty,
  });

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(survey.title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;background:#f8f9fa;color:#1a1a1a;padding:1rem}
.fv-container{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.fv-title{font-size:1.5rem;font-weight:700;margin-bottom:.25rem}
.fv-desc{color:#666;margin-bottom:1.5rem;font-size:.95rem}
.fv-field{margin-bottom:1.25rem}
.fv-label{display:block;font-weight:600;font-size:.9rem;margin-bottom:.375rem}
.fv-required{color:#dc3545}
.fv-input,.fv-textarea,.fv-select{width:100%;padding:.625rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;background:#fff;transition:border-color .15s}
.fv-input:focus,.fv-textarea:focus,.fv-select:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.fv-radio-group{display:flex;flex-direction:column;gap:.5rem}
.fv-radio-label,.fv-checkbox-label{display:flex;align-items:center;gap:.5rem;font-size:.95rem;cursor:pointer}
.fv-range-wrap{display:flex;align-items:center;gap:.75rem}
.fv-range{flex:1}
.fv-range-val{min-width:2rem;text-align:center;font-weight:600}
.fv-btn{display:inline-flex;align-items:center;justify-content:center;width:100%;padding:.75rem;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;transition:background .15s}
.fv-btn:hover{background:#1d4ed8}
.fv-btn:disabled{opacity:.6;cursor:not-allowed}
.fv-status{margin-top:1rem;padding:.75rem;border-radius:8px;font-size:.9rem;text-align:center;display:none}
.fv-status.show{display:block}
.fv-status.ok{background:#d1fae5;color:#065f46}
.fv-status.err{background:#fee2e2;color:#991b1b}
.fv-status.info{background:#dbeafe;color:#1e40af}
.fv-privacy{margin-top:1.5rem;padding:.75rem;background:#f0f9ff;border-radius:8px;font-size:.8rem;color:#4b5563;text-align:center}
</style>
</head>
<body>
<div class="fv-container">
<h1 class="fv-title">${escapeHtml(survey.title)}</h1>
${survey.description ? `<p class="fv-desc">${escapeHtml(survey.description || "")}</p>` : ""}
<form id="fv-form" novalidate>
${formFields}
<button type="submit" class="fv-btn" id="fv-submit">Invia</button>
</form>
<div id="fv-status" class="fv-status"></div>
<div class="fv-privacy">
I dati privati sono crittografati end-to-end.<br>
Il server non ha accesso ai contenuti contrassegnati come privati.
</div>
</div>
<script>
${getStyxJsBundle()}
</script>
<script>
(function(){
  var CONFIG = ${configJson};
  var form = document.getElementById('fv-form');
  var btn = document.getElementById('fv-submit');
  var statusEl = document.getElementById('fv-status');

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'fv-status show ' + type;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    btn.disabled = true;
    btn.textContent = 'Invio in corso...';

    var privateAnswers = {};
    var publicAnswers = {};

    form.querySelectorAll('[data-private]').forEach(function(el) {
      var name = el.name;
      if (!name) return;
      var val;
      if (el.type === 'range' || el.type === 'number') val = Number(el.value);
      else if (el.type === 'checkbox') val = el.checked;
      else if (el.type === 'radio') { if (!el.checked) return; val = el.value; }
      else val = el.value;

      if (el.dataset.private === 'true') privateAnswers[name] = val;
      else publicAnswers[name] = val;
    });

    showStatus('Crittografia e invio...', 'info');

    var result = await FidesVox.submitForm(CONFIG, privateAnswers, publicAnswers, function(s) {
      showStatus(s, 'info');
    });

    if (result.success) {
      showStatus(result.receipt ? 'Inviato e registrato dal server.' : 'Inviato con successo.', 'ok');
      form.reset();
    } else {
      showStatus('Errore: ' + (result.error || 'sconosciuto'), 'err');
    }
    btn.disabled = false;
    btn.textContent = 'Invia';
  });
})();
</script>
</body>
</html>`;
}
