#!/usr/bin/env bash
# ==============================================================================
# setup-branch-protection.sh - Configuración Automatizada de Branch Protection
# RayRabbit AI Engineering Standard
#
# Configura GitHub Branch Protection en la rama 'main' para hacer obligatorios
# los checks de CI del gate-validator, garantizando el bloqueo físico de merges.
# ==============================================================================

set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")}"
BRANCH="${2:-main}"

if [ -z "$REPO" ]; then
  echo "❌ Error: No se pudo determinar el repositorio de GitHub."
  echo "Uso: ./scripts/setup-branch-protection.sh <owner/repo> [branch]"
  echo "Ejemplo: ./scripts/setup-branch-protection.sh rayrabbit-ai/ai-engineering main"
  exit 1
fi

echo "🔒 Configurando Branch Protection en https://github.com/$REPO (rama: $BRANCH)..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Auditoría de Commits por Compuerta (Invariantes 1 y 3)",
      "Validación de Especificaciones OpenSpec",
      "Suite TypeScript / Node.js & Cobertura",
      "Suite Python & Cobertura"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "✅ Branch Protection configurada exitosamente."
echo "Checks requeridos obligatorios:"
echo "  - Auditoría de Commits por Compuerta (Invariantes 1 y 3)"
echo "  - Validación de Especificaciones OpenSpec"
echo "  - Suite TypeScript / Node.js & Cobertura"
echo "  - Suite Python & Cobertura"
