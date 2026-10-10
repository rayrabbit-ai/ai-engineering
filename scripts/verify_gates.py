#!/usr/bin/env python3
"""
verify_gates.py - Validador Determinista de Commits por Compuerta (RayRabbit AI Engineering)

Verifica tres invariantes críticas en el historial de commits:
1. Nomenclatura válida de compuertas (test(red), feat(green), refactor, fix, etc.).
2. Causalidad TDD Estricta (Invariantes 1 y 3):
   Cualquier commit 'feat(green)' o 'fix' DEBE ser precedido por un commit 'test(red)'.
3. Inmutabilidad de Baseline (Invariante 2):
   Cualquier modificación a tests de caracterización requiere commit 'test(baseline): update <razón>'.
"""

import sys
import re
import subprocess
import argparse
from pathlib import Path

# Soporte seguro para codificación en Windows (cp1252) y UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

VALID_PREFIXES = [
    r"^test\(red\):",
    r"^feat\(green\):",
    r"^refactor(\([a-z0-9_-]+\))?:",
    r"^test\(baseline\):",
    r"^test\(integration\):",
    r"^chore\(hardening\):",
    r"^fix(\([a-z0-9_-]+\))?:",
    r"^spec(\([a-z0-9_-]+\))?:",
    r"^docs(\([a-z0-9_-]+\))?:",
    r"^triage(\([a-z0-9_-]+\))?:",
    r"^chore(\([a-z0-9_-]+\))?:",
]

LEGACY_PATTERNS = [
    r"characterization",
    r"legacy_baseline",
    r"legacy\.spec\.[a-z]+$",
    r"legacy\.test\.[a-z]+$",
    r"legacy_test\.[a-z]+$",
    r"test_.*_legacy\.[a-z]+$",
    r"baseline/",
]

def run_git(cmd: str) -> str:
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError:
        return ""

def validate_commit_list(commits: list[tuple[str, str, list[str]]]) -> list[str]:
    errors = []
    has_red = False

    for commit_hash, subject, changed_files in commits:
        subject_stripped = subject.strip()

        # 1. Validar sintaxis de compuerta
        matched = any(re.match(pattern, subject_stripped, re.IGNORECASE) for pattern in VALID_PREFIXES)
        if not matched:
            errors.append(
                f"[{commit_hash[:7]}] '{subject_stripped}' no cumple la nomenclatura de compuerta "
                f"(ej. 'test(red):', 'feat(green):', 'refactor:', 'test(baseline):', 'fix:')."
            )

        # 2. Registrar presencia de RED
        if subject_stripped.lower().startswith("test(red):"):
            has_red = True

        # 3. Validar Causalidad TDD (Invariantes 1 y 3)
        if subject_stripped.lower().startswith("feat(green):") or subject_stripped.lower().startswith("fix:"):
            if not has_red:
                errors.append(
                    f"[{commit_hash[:7]}] Violación de Causalidad TDD en '{subject_stripped}': "
                    f"No existe un commit previo 'test(red):' en esta rama."
                )

        # 4. Validar Inmutabilidad de Baseline (Invariante 2)
        touches_characterization = any(
            any(re.search(pat, f, re.IGNORECASE) for pat in LEGACY_PATTERNS)
            for f in changed_files
        )
        if touches_characterization:
            if not re.match(r"^test\(baseline\): update", subject_stripped, re.IGNORECASE):
                errors.append(
                    f"[{commit_hash[:7]}] Violación de Invariante 2: Modificó suite de caracterización "
                    f"sin usar la convención obligatoria 'test(baseline): update <razón>'."
                )

    return errors

def self_test() -> int:
    print("[SELF-TEST] Ejecutando pruebas unitarias de verify_gates.py...")
    
    # Caso 1: Flujo perfecto RED -> GREEN -> REFACTOR
    valid_flow = [
        ("c111111", "test(red): agrega test de suma", ["tests/unit/test_calc.py"]),
        ("c222222", "feat(green): implementa suma minima", ["src/calc.py"]),
        ("c333333", "refactor: simplifica retorno", ["src/calc.py"]),
    ]
    errs1 = validate_commit_list(valid_flow)
    assert len(errs1) == 0, f"Error inesperado en flujo valido: {errs1}"

    # Caso 2: Violación de Causalidad (GREEN sin RED previo)
    invalid_causality = [
        ("c222222", "feat(green): implementa suma sin test previo", ["src/calc.py"])
    ]
    errs2 = validate_commit_list(invalid_causality)
    assert any("Causalidad TDD" in e for e in errs2), "Fallo deteccion de causalidad TDD"

    # Caso 3: Violación de Invariante 2 (tocó baseline sin update)
    invalid_baseline = [
        ("c444444", "test(red): nuevo test", ["tests/unit/test_calc.py"]),
        ("c555555", "feat(green): fix en baseline", ["tests/characterization/test_calc.py"])
    ]
    errs3 = validate_commit_list(invalid_baseline)
    assert any("Invariante 2" in e for e in errs3), "Fallo deteccion de Invariante 2"

    print("[SELF-TEST] [OK] Todas las aserciones internas del validador pasaron con exito.\n")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Validador de Commits por Compuerta (RayRabbit AI Engineering)")
    parser.add_argument("--base", default="origin/main", help="Rama o commit base para comparar")
    parser.add_argument("--head", default="HEAD", help="Commit head a validar")
    parser.add_argument("--self-test", action="store_true", help="Ejecutar autoverificacion de reglas")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    rev_range = f"{args.base}..{args.head}"
    raw_commits = run_git(f"git log --reverse --format='%H|%s' {rev_range}")

    if not raw_commits:
        print(f"[GATE-OK] No hay commits en el rango {rev_range} o el repositorio aun no tiene historial remoto.")
        return 0

    commits = []
    for line in raw_commits.splitlines():
        if "|" in line:
            h, s = line.split("|", 1)
            files = run_git(f"git diff-tree --no-commit-id --name-only -r {h}").splitlines()
            commits.append((h, s, files))

    print(f"[GATE-VALIDATOR] Analizando {len(commits)} commits en {rev_range}...")
    errors = validate_commit_list(commits)

    if errors:
        print("\n[ERROR] VIOLACIONES DE COMPUERTA DETECTADAS:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\n[GATE-OK] TODAS LAS COMPUERTAS DE COMMITS APROBADAS.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
