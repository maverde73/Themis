#!/bin/bash
# Setup Claude Code per Themis (con Styx)
# Esegui dalla root del progetto: cd ~/src/taal/themis && bash setup-claude.sh

set -e

echo "=== Setup Claude Code per Themis ==="
echo ""

# 1. Registra MCP a livello di progetto
echo "[1/3] Registrazione MCP servers..."

#claude mcp add -s project codebase-memory-mcp -- codebase-memory-mcp
#claude mcp add -s project playwright -- npx @playwright/mcp@latest

echo "  ✔ codebase-memory-mcp registrato"
echo "  ✔ playwright registrato"
echo ""

# 2. Verifica skill globali
echo "[2/3] Verifica skill globali..."
SKILL_COUNT=$(npx skills ls -g -a claude-code 2>/dev/null | wc -l)
if [ "$SKILL_COUNT" -lt 5 ]; then
    echo "  ⚠ Poche skill trovate. Installo..."
    npx skills add vercel-labs/agent-skills -g -a claude-code -y
    npx skills add mcollina/skills -g -a claude-code -y
    npx skills add wshobson/agents --skill nodejs-backend-patterns -g -a claude-code -y
    npx skills add flutter/skills -g -a claude-code -y
    npx skills add dhruvanbhalara/skills -g -a claude-code -y
    npx skills add kevmoo/dash_skills -g -a claude-code -y
    echo "  ✔ Skill installate"
else
    echo "  ✔ Skill globali già presenti ($SKILL_COUNT trovate)"
fi
echo ""

# 3. Indicizza il progetto (root + styx come sotto-progetto)
echo "[3/3] Indicizzazione codebase..."
if command -v codebase-memory-mcp &> /dev/null; then
    codebase-memory-mcp index .
    echo "  ✔ Progetto Themis indicizzato"
else
    echo "  ⚠ codebase-memory-mcp non trovato nel PATH"
    echo "    Scaricalo da: https://github.com/DeusData/codebase-memory-mcp/releases"
    echo "    Poi esegui: codebase-memory-mcp install"
fi

echo ""
echo "=== Setup completato! ==="
echo ""
echo "Prossimi passi:"
echo "  1. Riavvia Claude Code: claude"
echo "  2. Verifica MCP: /mcp"
echo "  3. Verifica skill: /skills"
echo "  4. Verifica agents: /agents"
echo ""
echo "Agents disponibili:"
echo "  @verify-ui    — Testa componenti React nel browser"
echo "  @test-runner   — Lancia test npm/flutter, riporta solo falliti"
echo "  @code-reviewer — Review con severity CRITICAL→LOW"
echo "  @styx-test     — Testa pacchetti Styx con melos"
echo ""
echo "Tip: usa /clear tra task, /btw per domande laterali, /model haiku per task semplici"
