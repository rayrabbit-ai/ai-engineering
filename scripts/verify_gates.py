#!/usr/bin/env python3
"""
verify_gates.py - Validador Determinista de Commits por Compuerta (RayRabbit AI Engineering)

Verifica cuatro invariantes críticas en el historial de commits:
1. Nomenclatura válida de compuertas (test(red), feat(green), refactor, fix, spec, etc.).
2. Causalidad TDD Estricta con Acoplamiento por Ámbito/Scope (Invariantes 1 y 3):
   Cualquier commit 'feat(green)' o 'fix' DEBE ser precedido por un commit 'test(red)'
   del MISMO ámbito o módulo.
3. Inmutabilidad de Baseline Legacy (Invariante 2):
   Cualquier modificación a tests de caracterización requiere commit 'test(baseline): update <razón>'.
4. Integridad de Especificaciones Consolidadas SDD:
   Las especificaciones consolidadas en 'openspec/specs/' no pueden ser alteradas directamente
   en commits de implementación; requieren sincronización mediante 'spec(sync):' o 'chore(archive):'.

Hardened contra CWE-78 (Command Injection) y Bypasses de Scope (F-02, F-03, F-07).
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
    r"^test\(red\)(\([a-z0-9_-]+\))?:",
    r"^feat\(green\)(\([a-z0-9_-]+\))?:",
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

def is_test_file(file_path: str) -> bool:
    if not file_path:
        return False
    norm = file_path.replace("\\", "/").lower()
    if norm.startswith("tests/") or norm.startswith("test/") or "/tests/" in norm or "/test/" in norm:
        return True
    if re.search(r"(\.spec|\.test|_test)\.[a-z0-9]+$", norm, re.IGNORECASE):
        return True
    if re.search(r"test_[a-z0-9_-]+\.[a-z0-9]+$", norm, re.IGNORECASE):
        return True
    return False

def is_production_file(file_path: str) -> bool:
    if not file_path:
        return False
    norm = file_path.replace("\\", "/").lower()
    if is_test_file(norm):
        return False
    if (
        norm.startswith("openspec/") or "/openspec/" in norm or
        norm.startswith("docs/") or "/docs/" in norm or
        norm.startswith("scripts/") or "/scripts/" in norm or
        norm.startswith(".agent/") or "/.agent/" in norm or
        norm.startswith(".github/") or "/.github/" in norm or
        norm.startswith(".git/") or "/.git/" in norm
    ):
        return False
    if (
        norm.endswith(".md") or norm.endswith(".json") or norm.endswith(".yaml") or
        norm.endswith(".yml") or norm.endswith(".toml") or norm.endswith(".txt") or
        norm.endswith(".lock") or norm.endswith(".ini") or norm == ".gitignore" or
        norm.endswith("/.gitignore") or norm == "license" or norm.endswith("/license")
    ):
        return False
    if norm.startswith("src/") or "/src/" in norm or norm.startswith("lib/") or "/lib/" in norm or norm.startswith("app/") or "/app/" in norm:
        return True
    if re.search(r"\.(ts|tsx|js|mjs|cjs|jsx|py|go|rs|java|kt|c|cpp|h|cs)$", norm, re.IGNORECASE):
        return True
    return False

def extract_module_name(file_path: str) -> str:
    if not file_path:
        return ""
    p = Path(file_path)
    base = p.stem.lower()
    for ext in [".spec", ".test", "_test"]:
        if base.endswith(ext):
            base = base[:-len(ext)]
    if base.startswith("test_"):
        base = base[5:]
    base = re.sub(r"^[._-]+|[._-]+$", "", base)
    return base.strip()

def extract_scope_from_subject(subject: str, gate_type: str) -> str | None:
    pattern = rf"^{gate_type}(?:\(([a-z0-9_-]+)\))?:"
    match = re.match(pattern, subject, re.IGNORECASE)
    if match and match.group(1):
        return match.group(1).lower().strip()
    return None

def is_valid_ref_format(ref: str) -> bool:
    """
    Validador estricto de referencias Git para mitigar CWE-78 (Command Injection).
    Rechaza metacaracteres de shell y valida estructura con 'git check-ref-format'.
    """
    if not ref or not isinstance(ref, str):
        return False
    trimmed = ref.strip()
    if not trimmed or len(trimmed) > 255:
        return False
    # Prohibir terminantemente metacaracteres de shell y saltos de línea
    if re.search(r"[;&|`$><\r\n\t ]", trimmed):
        return False
    probe = subprocess.run(
        ["git", "check-ref-format", "--allow-onelevel", trimmed],
        capture_output=True,
        text=True,
        shell=False
    )
    if probe.returncode == 0:
        return True
    if re.match(r"^[a-zA-Z0-9/_.-]+(~[0-9]+|\^[0-9]*)*$", trimmed):
        return True
    return False

def run_git(args: list[str]) -> str:
    """Ejecuta comando git con paso seguro de argumentos (shell=False) contra CWE-78."""
    try:
        res = subprocess.run(["git", *args], shell=False, capture_output=True, text=True)
        return res.stdout.strip() if res.returncode == 0 else ""
    except Exception:
        return ""

def run_git_safe(args: list[str]) -> str | None:
    try:
        res = subprocess.run(["git", *args], shell=False, capture_output=True, text=True)
        if res.returncode == 0:
            return res.stdout.strip()
        return None
    except Exception:
        return None

def run_git_or_throw(args: list[str], error_msg: str) -> str:
    res = subprocess.run(["git", *args], shell=False, capture_output=True, text=True)
    if res.returncode != 0:
        err = res.stderr.strip() or res.stdout.strip()
        raise RuntimeError(f"{error_msg}: {err}")
    return res.stdout.strip()

def validate_commit_list(commits: list[tuple[str, str, list[str]]]) -> list[str]:
    errors = []
    active_red_scopes: set[str] = set()

    for commit_hash, subject, changed_files in commits:
        subject_stripped = subject.strip()
        short_hash = (commit_hash or "0000000")[:7]

        # 1. Validar sintaxis de compuerta
        matched = any(re.match(pattern, subject_stripped, re.IGNORECASE) for pattern in VALID_PREFIXES)
        if not matched:
            errors.append(
                f"[{short_hash}] '{subject_stripped}' no cumple la nomenclatura de compuerta "
                f"(ej. 'test(red):', 'feat(green):', 'refactor:', 'test(baseline):', 'fix:')."
            )

        # 2. Registrar presencia de RED y sus ámbitos
        if re.match(r"^test\(red\)(\([a-z0-9_-]+\))?:", subject_stripped, re.IGNORECASE):
            # Invariante 1 & 3: Un commit test(red) no puede incluir código de producción
            prod_files = [f for f in changed_files if is_production_file(f)]
            if prod_files:
                errors.append(
                    f"[{short_hash}] Violación de Invariante 1 en '{subject_stripped}': "
                    f"Un commit 'test(red):' NO puede modificar código de producción (detectado: {', '.join(prod_files)})."
                )

            # Invariante 1 & 3: Un commit test(red) DEBE incluir al menos un archivo de test real
            test_files = [f for f in changed_files if is_test_file(f)]
            if not test_files:
                errors.append(
                    f"[{short_hash}] Violación de Invariante 1 en '{subject_stripped}': "
                    f"Un commit 'test(red):' DEBE modificar al menos un archivo de test (detectado: 0 archivos de prueba en [{', '.join(changed_files)}])."
                )

            explicit_scope = extract_scope_from_subject(subject_stripped, r"test\(red\)")
            file_scopes = [extract_module_name(f) for f in test_files if extract_module_name(f)]

            # F-03: Prohibir scope universal fallback (*). Rechazar si no se puede inferir módulo y no hay scope explícito.
            if not explicit_scope and not file_scopes:
                errors.append(
                    f"[{short_hash}] Violación de Invariante 1 en '{subject_stripped}': "
                    f"No se pudo inferir un ámbito de módulo válido de los archivos de prueba [{', '.join(test_files)}] y no se declaró ningún ámbito explícito 'test(red)(<scope>):'."
                )
            else:
                if explicit_scope:
                    active_red_scopes.add(explicit_scope)
                active_red_scopes.update(file_scopes)

        # 3. Validar Causalidad TDD con Acoplamiento por Ámbito (Invariantes 1 y 3)
        is_green = bool(re.match(r"^feat\(green\)(\([a-z0-9_-]+\))?:", subject_stripped, re.IGNORECASE))
        is_fix = bool(re.match(r"^fix(\([a-z0-9_-]+\))?:", subject_stripped, re.IGNORECASE))

        if is_green or is_fix:
            if not active_red_scopes:
                errors.append(
                    f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                    f"No existe ningún commit previo 'test(red):' pendiente en esta rama."
                )
            else:
                gate_name = r"feat\(green\)" if is_green else r"fix"
                explicit_target = extract_scope_from_subject(subject_stripped, gate_name)
                prod_files = [f for f in changed_files if is_production_file(f)]

                if prod_files:
                    # Cada archivo de producción DEBE estar estrictamente cubierto por los scopes activos de RED
                    for p_file in prod_files:
                        p_module = extract_module_name(p_file)
                        matches_module = bool(p_module and p_module in active_red_scopes)
                        matches_explicit = bool(explicit_target and (explicit_target in active_red_scopes) and (explicit_target == p_module))

                        if not matches_module and not matches_explicit:
                            avail_str = ", ".join(sorted(active_red_scopes)) if active_red_scopes else "ninguno"
                            errors.append(
                                f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                                f"El archivo de producción modificado '{p_file}' (módulo '{p_module or 'anónimo'}') no coincide con ningún test(red) activo previo [{avail_str}]."
                            )
                else:
                    target_scopes = [explicit_target] if explicit_target else [extract_module_name(f) for f in changed_files if extract_module_name(f)]
                    matched_scope = next((s for s in target_scopes if s in active_red_scopes), None)

                    if not matched_scope and target_scopes:
                        avail_str = ", ".join(sorted(active_red_scopes)) if active_red_scopes else "ninguno"
                        tgt_str = ", ".join(target_scopes) if target_scopes else "sin ámbito identificado"
                        errors.append(
                            f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                            f"El ámbito modificado [{tgt_str}] no coincide con ningún test(red) activo previo [{avail_str}]."
                        )

                # Consumir scopes satisfechos
                if explicit_target and explicit_target in active_red_scopes:
                    active_red_scopes.remove(explicit_target)
                for p_file in prod_files:
                    p_module = extract_module_name(p_file)
                    if p_module and p_module in active_red_scopes:
                        active_red_scopes.remove(p_module)

        # 4. Validar Inmutabilidad de Baseline (Invariante 2)
        touches_characterization = any(
            any(re.search(pat, f, re.IGNORECASE) for pat in LEGACY_PATTERNS)
            for f in changed_files
        )
        if touches_characterization:
            if not re.match(r"^test\(baseline\): update", subject_stripped, re.IGNORECASE):
                errors.append(
                    f"[{short_hash}] Violación de Invariante 2: Modificó suite de caracterización "
                    f"sin usar la convención obligatoria 'test(baseline): update <razón>'."
                )

        # 5. Validar Integridad de Especificaciones Consolidadas SDD
        touches_consolidated_specs = any(
            f.replace("\\", "/").lower().startswith("openspec/specs/") or "/openspec/specs/" in f.replace("\\", "/").lower()
            for f in changed_files
        )
        if touches_consolidated_specs:
            is_allowed = bool(re.match(r"^(spec\(sync\)|chore\(archive\)|spec\(baseline\))", subject_stripped, re.IGNORECASE))
            if not is_allowed:
                errors.append(
                    f"[{short_hash}] Violación de Compuerta SDD en '{subject_stripped}': No se permite modificar "
                    f"directamente 'openspec/specs/' consolidado en commits de implementación. "
                    f"Use delta specs en 'openspec/changes/' y consolide mediante 'spec(sync):'."
                )

    return errors

def self_test():
    print("[SELF-TEST] Iniciando autoverificación determinista de verify_gates.py...")

    # Caso 1: Flujo válido en Python
    valid_commits = [
        ("c111111", "test(red): failing test for math logic", ["tests/test_calculator.py"]),
        ("c222222", "feat(green): implement add operation", ["src/calculator.py"]),
        ("c333333", "refactor: simplify math expression", ["src/calculator.py"])
    ]
    errs = validate_commit_list(valid_commits)
    assert not errs, f"Falló validación de flujo válido: {errs}"

    # Caso 2: Scope explícito concordante
    valid_explicit = [
        ("c444444", "test(red)(auth): failing token validation", ["tests/test_auth.py"]),
        ("c555555", "feat(green)(auth): implement token parser", ["src/auth.py"])
    ]
    errs_exp = validate_commit_list(valid_explicit)
    assert not errs_exp, f"Falló scope explícito concordante: {errs_exp}"

    # Caso 3: Ataque Adversarial de Copilot (RED en a, GREEN no relacionado en b) -> DEBE SER RECHAZADO
    adversarial_copilot = [
        ("cadv111", "test(red): failing test in a", ["tests/test_a.py"]),
        ("cadv222", "feat(green): implement b without test", ["src/b.py"])
    ]
    errs_copilot = validate_commit_list(adversarial_copilot)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_copilot), "Falló bloqueo adversarial Copilot (a != b)"

    # Caso 4: Scope explícito discordante (auth vs billing) -> DEBE SER RECHAZADO
    mismatch_scope = [
        ("c666666", "test(red)(auth): failing test", ["tests/test_auth.py"]),
        ("c777777", "feat(green)(billing): implement billing logic", ["src/billing.py"])
    ]
    errs_mis = validate_commit_list(mismatch_scope)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_mis), "Falló detección de scopes discordantes"

    # Caso 5: Alteración de Baseline Legacy sin 'test(baseline): update' -> DEBE SER RECHAZADO
    invalid_baseline = [
        ("c888888", "test(red): add case", ["tests/unit/test_new.py"]),
        ("c999999", "feat(green): touch baseline illegally", ["tests/characterization/test_legacy.py"])
    ]
    errs_base = validate_commit_list(invalid_baseline)
    assert any("Invariante 2" in e for e in errs_base), "Falló protección de baseline legacy"

    # Caso 6: Causalidad rota (código sin test en rojo previo) -> DEBE SER RECHAZADO
    no_red = [
        ("caaaaaa", "feat(green): direct code without test", ["src/calculator.py"])
    ]
    errs_nr = validate_commit_list(no_red)
    assert any("Causalidad TDD" in e for e in errs_nr), "Falló detección de causalidad rota"

    # Caso 7: Consumo de RED (segundo GREEN sin segundo RED) -> DEBE SER RECHAZADO
    double_green = [
        ("cbbbbbb", "test(red): add single test", ["tests/test_calc.py"]),
        ("cccccc", "feat(green): first implementation", ["src/calc.py"]),
        ("cdddddd", "feat(green): second implementation without red", ["src/calc.py"])
    ]
    errs_dg = validate_commit_list(double_green)
    assert any("Causalidad TDD" in e for e in errs_dg), "Falló detección de segundo GREEN no autorizado"

    # Caso 8: Violación de Compuerta SDD (tocar specs/ directamente) -> DEBE SER RECHAZADO
    invalid_sdd = [
        ("ceeeeee", "feat(green): bypass spec change process", ["openspec/specs/core.md"])
    ]
    errs_sdd = validate_commit_list(invalid_sdd)
    assert any("Compuerta SDD" in e for e in errs_sdd), "Falló protección de especificaciones consolidadas SDD"

    # Caso 9: Ataque Adversarial: test(red) que modifica código de producción en src/ -> DEBE SER RECHAZADO
    invalid_red_prod = [
        ("credprod", "test(red): smuggle production code", ["tests/unit/test_calc.py", "src/calc.py"])
    ]
    errs_rp = validate_commit_list(invalid_red_prod)
    assert any("NO puede modificar código de producción" in e for e in errs_rp), "Falló bloqueo de código de producción en test(red)"

    # Caso 10: Auditoría Copilot (Fallo A - RED documental sin tests reales) -> DEBE SER RECHAZADO
    invalid_doc_red = [
        ("cadvdoc1", "test(red)(auth): claimed red on markdown", ["docs/auth.md"]),
        ("cadvdoc2", "feat(green)(auth): implementation", ["src/auth.py"])
    ]
    errs_dr = validate_commit_list(invalid_doc_red)
    assert any("DEBE modificar al menos un archivo de test" in e for e in errs_dr), "Falló bloqueo de test(red) documental sin tests"

    # Caso 11: Auditoría Copilot (Fallo B - GREEN multirruta con contrabando de billing bajo scope auth) -> DEBE SER RECHAZADO
    invalid_multi_green = [
        ("cadvmg1", "test(red)(auth): failing auth test", ["tests/unit/test_auth.py"]),
        ("cadvmg2", "feat(green)(auth): impl auth and smuggle billing", ["src/auth.py", "src/billing.py"])
    ]
    errs_mg = validate_commit_list(invalid_multi_green)
    assert any("archivo de producción modificado 'src/billing.py'" in e and "no coincide con ningún test(red) activo previo" in e for e in errs_mg), "Falló bloqueo de contrabando multirruta en GREEN"

    # Caso 12 (F-03 Audit): Bypass con archivo de test que produce nombre vacío tipo tests/test_.py sin scope explícito -> RECHAZADO
    invalid_empty_module = [
        ("cf03red1", "test(red): empty module test", ["tests/test_.py"]),
        ("cf03grn1", "feat(green): unrelated implementation", ["src/unrelated.ts"])
    ]
    errs_empty = validate_commit_list(invalid_empty_module)
    assert any("No se pudo inferir un ámbito de módulo válido" in e for e in errs_empty), "FALLÓ VULNERABILIDAD F-03: verify_gates.py permitió bypass con módulo vacío"

    # Caso 13 (F-02 Audit): Mitigación CWE-78 en referencias Git
    malicious_ref = 'HEAD; printf "PYTHON_INJECTION_PROBE|test(red): injected"'
    assert not is_valid_ref_format(malicious_ref), "FALLÓ VULNERABILIDAD F-02 (CWE-78): is_valid_ref_format aceptó inyección"
    assert is_valid_ref_format("HEAD") and is_valid_ref_format("origin/main") and is_valid_ref_format("main~1"), "is_valid_ref_format rechazó ref válida"

    print("[SELF-TEST] ✅ Todas las aserciones internas y pruebas adversariales pasaron con éxito.\n")
    return 0

def check_clean_working_tree(allow_dirty: bool = False):
    status = run_git(["status", "--porcelain"])
    if status:
        if allow_dirty:
            print("\n⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados (--allow-dirty activo):")
            for line in status.splitlines():
                print(f"  {line}")
        else:
            print("\n❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio:")
            for line in status.splitlines():
                print(f"  {line}")
            print("\nPara continuar, confirme (commit) o descarte (stash/clean) los cambios, o pase el flag --allow-dirty.")
            sys.exit(1)

def is_root_commit(sha: str) -> bool:
    parents = run_git(["rev-list", "--parents", "-n", "1", sha])
    return len(parents.split()) == 1 if parents else False

def main():
    parser = argparse.ArgumentParser(description="Validador de Commits por Compuerta (RayRabbit AI Engineering)")
    parser.add_argument("--base", default=None, help="Rama o commit base para comparar")
    parser.add_argument("--head", default="HEAD", help="Commit head a validar")
    parser.add_argument("--self-test", action="store_true", help="Ejecutar autoverificación de reglas")
    parser.add_argument("--allow-dirty", action="store_true", help="Permitir árbol de trabajo sucio")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    check_clean_working_tree(args.allow_dirty)

    # 1. Resolver HEAD de forma segura
    head = args.head or "HEAD"
    if not is_valid_ref_format(head):
        print(f"❌ ERROR DE SEGURIDAD GIT: La referencia HEAD '{head}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).")
        return 1
    head_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", head])
    if not head_sha:
        print(f"❌ ERROR DE RESOLUCIÓN GIT: No se pudo resolver la referencia HEAD '{head}'. Verifique que esté dentro de un repositorio Git con commits.")
        return 1

    # 2. Resolver BASE de forma segura
    base = args.base
    if base:
        if not is_valid_ref_format(base):
            print(f"❌ ERROR DE SEGURIDAD GIT: La referencia base '{base}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).")
            return 1
        base_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", base])
        if not base_sha:
            print(f"❌ ERROR DE COMPUERTA: La referencia base especificada '{base}' no existe en el repositorio.")
            print("Si está ejecutando en local sin remotos configurados, ejecute 'python scripts/verify_gates.py --base <commit-o-rama>' o agregue el remote correspondiente.")
            return 1
    else:
        # Si no se pasó --base, buscar candidatos válidos
        candidates = ["origin/main", "origin/master", "main", "master"]
        for cand in candidates:
            sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", cand])
            if sha and sha != head_sha:
                base = cand
                break

        if not base:
            prev_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", "HEAD~1"])
            if prev_sha:
                base = "HEAD~1"
                print(f"[GATE-INFO] No se detectó remote origin/main. Usando fallback local seguro: base = HEAD~1")
            else:
                # F-07: Manejo de repositorio en commit inicial / plantilla
                subject = run_git_safe(["log", "-1", "--format=%s", head_sha]) or ""
                is_template_seed = bool(re.search(r"^(initial\s+commit|feat:\s*initial|chore:\s*initial|template:)", subject.strip(), re.IGNORECASE))
                if is_root_commit(head_sha) and is_template_seed:
                    print(f"[GATE-INFO] Commit raíz / semilla de template detectado ({head_sha[:7]}): '{subject.strip()}'.")
                    print("✅ COMMIT INICIAL DEL TEMPLATE ACEPTADO COMO LÍNEA BASE VÁLIDA.")
                    return 0

                print(f"[GATE-INFO] Repositorio en commit inicial ({head_sha[:7]}). Auditando el commit inicial...")
                files = (run_git_safe(["diff-tree", "--no-commit-id", "--name-only", "-r", head_sha]) or "").splitlines()
                errors = validate_commit_list([(head_sha, subject, files)])
                if errors:
                    print("\n❌ VIOLACIONES DE COMPUERTA DETECTADAS EN COMMIT INICIAL:")
                    for err in errors:
                        print(f"  - {err}")
                    return 1
                print("\n✅ COMMIT INICIAL VALIDADO EXITOSAMENTE (Python).")
                return 0

    base_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", base])
    if not base_sha:
        print(f"❌ ERROR DE COMPUERTA: No se pudo resolver la referencia base '{base}'.")
        return 1
    rev_range = f"{base_sha}..{head_sha}"
    try:
        raw_commits = run_git_or_throw(["log", "--reverse", "--format=%H|%s", rev_range], f"Fallo al obtener commits en el rango '{rev_range}'")
    except RuntimeError as err:
        print(f"❌ ERROR DE RESOLUCIÓN GIT:\n{err}")
        return 1

    if not raw_commits:
        print(f"[GATE-OK] No hay commits en el rango {rev_range}.")
        return 0

    commits = []
    for line in raw_commits.splitlines():
        if "|" in line:
            h, s = line.split("|", 1)
            files = (run_git_safe(["diff-tree", "--no-commit-id", "--name-only", "-r", h]) or "").splitlines()
            commits.append((h, s, files))

    print(f"[GATE-VALIDATOR] Analizando {len(commits)} commits en {rev_range}...")
    errors = validate_commit_list(commits)

    if errors:
        print("\n[ERROR] VIOLACIONES DE COMPUERTA DETECTADAS:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\n[GATE-OK] TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Python).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
