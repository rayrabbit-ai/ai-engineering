#!/usr/bin/env python3
"""
setup_branch_protection.py - Configuración Automatizada de Branch Protection
RayRabbit AI Engineering Standard

Configura GitHub Branch Protection en la rama 'main' para hacer obligatorios
los checks de CI del gate-validator y requerir revisiones formales (DoD),
garantizando el bloqueo físico e independiente de merges (F-05 mitigado).
"""

import sys
import json
import subprocess
import argparse
from pathlib import Path

REQUIRED_CHECKS = [
    "Auditoría de Commits por Compuerta (Invariantes 1 y 3)",
    "Validación de Especificaciones OpenSpec",
    "Suite TypeScript / Node.js & Cobertura",
    "Suite Python & Cobertura",
    "Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)",
]

def get_default_repo() -> str | None:
    try:
        res = subprocess.run(
            ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
            capture_output=True,
            text=True,
            check=True
        )
        return res.stdout.strip()
    except Exception:
        return None

def main() -> int:
    parser = argparse.ArgumentParser(description="Configurar GitHub Branch Protection para AI Engineering")
    parser.add_argument("--repo", default=None, help="Repositorio en formato owner/repo (ej. rayrabbit-ai/ai-engineering)")
    parser.add_argument("--branch", default="main", help="Rama a proteger (default: main)")
    parser.add_argument("--reviews", type=int, default=1, help="Número de revisiones aprobatorias requeridas (default: 1)")
    args = parser.parse_args()

    repo = args.repo or get_default_repo()
    if not repo:
        print("❌ Error: No se pudo determinar el repositorio.")
        print("Uso: python scripts/setup_branch_protection.py --repo <owner/repo> [--branch <branch>] [--reviews <N>]")
        return 1

    payload = {
        "required_status_checks": {
            "strict": True,
            "contexts": REQUIRED_CHECKS
        },
        "enforce_admins": True,
        "required_pull_request_reviews": {
            "dismiss_stale_reviews": True,
            "require_code_owner_reviews": True,
            "required_approving_review_count": args.reviews
        },
        "restrictions": None,
        "required_linear_history": True,
        "allow_force_pushes": False,
        "allow_deletions": False
    }

    print(f"🔒 Configurando Branch Protection en https://github.com/{repo} (rama: {args.branch})...")
    payload_json = json.dumps(payload, indent=2)

    try:
        proc = subprocess.run(
            [
                "gh", "api",
                "--method", "PUT",
                "-H", "Accept: application/vnd.github+json",
                f"/repos/{repo}/branches/{args.branch}/protection",
                "--input", "-"
            ],
            input=payload_json,
            text=True,
            capture_output=True
        )
        if proc.returncode != 0:
            print(f"❌ Fallo al aplicar Branch Protection:\n{proc.stderr.strip() or proc.stdout.strip()}")
            return proc.returncode

        print("✅ Branch Protection configurada exitosamente.")
        print("Reglas activas de protección:")
        print(f"  - Revisiones obligatorias requeridas: {args.reviews} (con Code Owners y descarte de stale)")
        print("  - Historial lineal obligatorio (no merge commits desordenados)")
        print("  - Status checks de CI bloqueantes:")
        for chk in REQUIRED_CHECKS:
            print(f"    * {chk}")
        return 0
    except FileNotFoundError:
        print("❌ Error: GitHub CLI ('gh') no está instalado en este sistema.")
        print("Instale 'gh' o aplique la configuración manualmente en Settings -> Branches -> Branch Protection Rules.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
