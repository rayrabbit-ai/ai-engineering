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
import json
import subprocess
import argparse
import unicodedata
from pathlib import Path

# Soporte seguro para codificación en Windows (cp1252) y UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

VALID_PREFIXES = [
    r"^test\(red\)(\([a-z0-9_/-]+\))?:",
    r"^feat\(green\)(\([a-z0-9_/-]+\))?:",
    r"^refactor(\([a-z0-9_/-]+\))?:",
    r"^test\(baseline\):",
    r"^test\(integration\):",
    r"^chore\(hardening\):",
    r"^fix(\([a-z0-9_/-]+\))?:",
    r"^spec(\([a-z0-9_/-]+\))?:",
    r"^docs(\([a-z0-9_/-]+\))?:",
    r"^triage(\([a-z0-9_/-]+\))?:",
    r"^chore(\([a-z0-9_/-]+\))?:",
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

# Política de clasificación de rutas: UNA sola fuente de verdad (scripts/path-policy.json),
# compartida con verify-gates.mjs. La paridad se verifica ejecutando la misma tabla de fixtures.
PATH_POLICY = json.loads((Path(__file__).resolve().parent / "path-policy.json").read_text(encoding="utf-8"))

_PRODUCTION_ROOTS = frozenset(PATH_POLICY["productionRoots"])
_TEST_ROOTS = frozenset(PATH_POLICY["testRoots"])
_EXCLUDED_ROOTS = frozenset(PATH_POLICY["excludedRoots"])
_NON_TEST_BASENAMES = frozenset(PATH_POLICY["nonTestBasenames"])
_EXECUTABLE_EXTENSIONS = frozenset(PATH_POLICY["executableExtensions"])
_DOC_ONLY_EXTENSIONS = frozenset(PATH_POLICY["docOnlyExtensions"])
_TEST_NAME_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PATH_POLICY["testNamePatterns"]]
_CONFIG_FILE_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PATH_POLICY["configFilePatterns"]]
_CRITICAL_CONFIG_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PATH_POLICY["criticalConfigPatterns"]]

_HOMOGLYPH_MAP = {
    "\u0455": "s", "\u0441": "c", "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0445": "x", "\u0456": "i", "\u0458": "j"
}
_HOMOGLYPH_REGEX = re.compile(r"[\u0455\u0441\u0430\u0435\u043e\u0440\u0445\u0456\u0458]")

def fold_homoglyphs(s: str) -> str:
    if not s or not isinstance(s, str):
        return ""
    return _HOMOGLYPH_REGEX.sub(lambda m: _HOMOGLYPH_MAP.get(m.group(0), m.group(0)), s)

def normalize_repo_path(file_path: str) -> str:
    if not file_path or not isinstance(file_path, str):
        return ""
    norm = unicodedata.normalize("NFC", file_path).replace("\\", "/").lower()
    norm = re.sub(r"/{2,}", "/", norm)
    norm = re.sub(r"^(?:\./)+", "", norm)
    return re.sub(r"^/+", "", norm)

def _file_extension(norm: str) -> str:
    base = norm.split("/")[-1]
    dot = base.rfind(".")
    return base[dot + 1:] if dot > 0 else ""

def classify_zone(file_path: str) -> str | None:
    """Zona de una ruta: el PRIMER segmento de directorio que sea un marcador decide ('prod'|'test'|'excluded')."""
    norm = normalize_repo_path(file_path)
    for raw_segment in norm.split("/")[:-1]:
        segment = fold_homoglyphs(raw_segment)
        if segment in _PRODUCTION_ROOTS:
            return "prod"
        if segment in _TEST_ROOTS:
            return "test"
        if segment in _EXCLUDED_ROOTS:
            return "excluded"
    return None

def is_test_file(file_path: str) -> bool:
    norm = normalize_repo_path(file_path)
    if not norm:
        return False
    if norm.split("/")[-1] in _NON_TEST_BASENAMES:
        return False
    if _file_extension(norm) not in _EXECUTABLE_EXTENSIONS:
        return False
    zone = classify_zone(norm)
    if zone in ("prod", "excluded"):
        return False
    if zone == "test":
        return True
    return any(p.search(norm) for p in _TEST_NAME_PATTERNS)

def is_production_file(file_path: str) -> bool:
    norm = normalize_repo_path(file_path)
    if not norm:
        return False
    zone = classify_zone(norm)
    # Fail-closed: todo lo que vive bajo una raíz de producción es producción, salvo documentación pura.
    if zone == "prod":
        return _file_extension(norm) not in _DOC_ONLY_EXTENSIONS
    if zone in ("test", "excluded"):
        return False
    if is_test_file(norm):
        return False
    if any(p.search(norm) for p in _CONFIG_FILE_PATTERNS):
        return False
    return _file_extension(norm) in _EXECUTABLE_EXTENSIONS

def is_critical_config_file(file_path: str) -> bool:
    """Configuración crítica (CI, compuertas, reglas, manifiestos, lockfiles): solo viaja en commits chore(...)."""
    norm = normalize_repo_path(file_path)
    if not norm:
        return False
    if classify_zone(norm) in ("prod", "test"):
        return False
    return any(p.search(norm) for p in _CRITICAL_CONFIG_PATTERNS)

def extract_module_name(file_path: str) -> str:
    if not file_path:
        return ""
    norm = file_path.replace("\\", "/")
    base_name = norm.lower().split("/")[-1]
    if base_name in ("__init__.py", "conftest.py"):
        return ""
    # Eliminar prefijos de subproyecto o raíz de pruebas/código
    norm = re.sub(r"^(?:[a-zA-Z0-9_-]+/)?(?:tests|test)/(?:ts/)?(?:unit/|integration/|characterization/|e2e/)?", "", norm, flags=re.IGNORECASE)
    norm = re.sub(r"^(?:[a-zA-Z0-9_-]+/)?(?:src|lib|app|pkg|rayrabbit)/", "", norm, flags=re.IGNORECASE)
    # Quitar extensiones
    norm = re.sub(r"\.[a-zA-Z0-9]+$", "", norm)
    # Quitar sufijos de test
    norm = re.sub(r"(\.spec|\.test|_test)$", "", norm, flags=re.IGNORECASE)
    parts = norm.split("/")
    last_idx = len(parts) - 1
    parts[last_idx] = re.sub(r"^test_", "", parts[last_idx], flags=re.IGNORECASE)
    parts[last_idx] = re.sub(r"(\.legacy|_legacy)$", "", parts[last_idx], flags=re.IGNORECASE)
    parts[last_idx] = re.sub(r"^[._-]+|[._-]+$", "", parts[last_idx])
    joined = "/".join(p for p in parts if p).lower().strip()
    return joined

def extract_scope_from_subject(subject: str, gate_type: str) -> str | None:
    pattern = rf"^{gate_type}(?:\(([a-z0-9_/-]+)\))?:"
    match = re.match(pattern, subject, re.IGNORECASE)
    if match and match.group(1):
        return match.group(1).lower().strip()
    return None

def get_active_openspec_changes(base_dir: Path | None = None) -> set[str]:
    """Escanea y obtiene el conjunto de OpenSpec Changes activos con tasks.md presente."""
    active: set[str] = set()
    current = Path.cwd().resolve() if base_dir is None else base_dir.resolve()
    candidates = []
    for _ in range(4):
        candidates.append(current / "openspec" / "changes")
        parent = current.parent
        if parent == current:
            break
        current = parent
    for directory in candidates:
        if directory.is_dir():
            try:
                for item in directory.iterdir():
                    if item.is_dir() and item.name != "archive":
                        tasks_file = item / "tasks.md"
                        if tasks_file.is_file():
                            active.add(item.name)
            except Exception:
                pass
    return active

def extract_openspec_change(subject: str, body: str = "") -> str | None:
    """Extrae la referencia al OpenSpec Change desde trailers o scope compuesto."""
    if body:
        trailer_match = re.search(r"^OpenSpec-Change:\s*([a-z0-9_-]+)", body, re.IGNORECASE | re.MULTILINE)
        if trailer_match:
            return trailer_match.group(1).strip()
    scope_match = re.search(r"^(?:feat\(green\)|fix)\(([a-z0-9_/-]+)\):", subject, re.IGNORECASE)
    if scope_match:
        scope = scope_match.group(1).strip()
        if "/" in scope:
            return scope.split("/")[0]
        return scope
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
    if trimmed.startswith("-"):
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

def parse_diff_tree_raw(raw_diff: str) -> tuple[list[str], list[tuple[str, str]]]:
    if not raw_diff:
        return [], []
    parts = raw_diff.split("\x00")
    files = []
    forbidden_modes = []
    i = 0
    while i < len(parts):
        piece = parts[i]
        if not piece:
            i += 1
            continue
        if len(piece) == 40 and not piece.startswith(":"):
            i += 1
            continue
        if piece.startswith(":"):
            meta = piece
            if i + 1 < len(parts):
                path = parts[i + 1]
                if path:
                    files.append(path)
                    meta_parts = meta.split()
                    if len(meta_parts) >= 2:
                        dst_mode = meta_parts[1]
                        if dst_mode in ("120000", "160000"):
                            forbidden_modes.append((path, dst_mode))
                i += 2
                continue
        i += 1
    return files, forbidden_modes

def validate_commit_list(commits: list, active_changes: set[str] | None = None) -> list[str]:
    errors = []
    active_red_scopes: set[str] = set()
    active_openspec_changes = active_changes if active_changes is not None else get_active_openspec_changes()

    for item in commits:
        if isinstance(item, dict):
            commit_hash = item.get("hash", "")
            subject = item.get("subject", "")
            changed_files = item.get("changed_files", item.get("changedFiles", []))
            body = item.get("body", "")
            is_merge = bool(item.get("is_merge", item.get("isMerge", False)))
            forbidden_modes = item.get("forbidden_modes", item.get("forbiddenModes", []))
        elif len(item) == 3:
            commit_hash, subject, changed_files = item
            body, is_merge, forbidden_modes = "", False, []
        elif len(item) == 4:
            commit_hash, subject, changed_files, body = item
            is_merge, forbidden_modes = False, []
        elif len(item) == 5:
            commit_hash, subject, changed_files, body, is_merge = item
            forbidden_modes = []
        elif len(item) >= 6:
            commit_hash, subject, changed_files, body, is_merge, forbidden_modes = item[:6]
        else:
            commit_hash, subject, changed_files, body, is_merge, forbidden_modes = "", "", [], "", False, []

        subject_stripped = subject.strip()
        short_hash = (commit_hash or "0000000")[:7]

        # C2: Prohibir commits de merge en la secuencia lineal de compuertas TDD
        if is_merge:
            errors.append(
                f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                f"Los commits de merge no están permitidos en la secuencia de compuertas. Rebase la rama para mantener un historial lineal."
            )

        # C3: Prohibir symlinks (120000) y submódulos (160000) en el repositorio
        if forbidden_modes:
            details = ", ".join(f"{f} (modo {m})" for f, m in forbidden_modes)
            errors.append(
                f"[{short_hash}] Violación de Integridad en '{subject_stripped}': "
                f"No se permiten symlinks ni submódulos en el repositorio (detectado: {details})."
            )

        # 1. Validar sintaxis de compuerta
        matched = any(re.match(pattern, subject_stripped, re.IGNORECASE) for pattern in VALID_PREFIXES)
        if not matched:
            errors.append(
                f"[{short_hash}] '{subject_stripped}' no cumple la nomenclatura de compuerta "
                f"(ej. 'test(red):', 'feat(green):', 'refactor:', 'test(baseline):', 'fix:')."
            )

        # F-NEW-01: Prohibir contrabando de código de producción en commits no-código (docs, chore, spec, triage, test)
        is_prod_altering_gate = bool(re.match(r"^(?:feat\(green\)|fix|refactor)(\([a-z0-9_/-]+\))?:", subject_stripped, re.IGNORECASE))
        if not is_prod_altering_gate and not re.match(r"^test\(red\)", subject_stripped, re.IGNORECASE):
            prod_files = [f for f in changed_files if is_production_file(f)]
            if prod_files:
                gate_type = subject_stripped.split(":")[0]
                errors.append(
                    f"[{short_hash}] Violación de Invariante de Compuerta en '{subject_stripped}': "
                    f"Un commit de tipo no-código '{gate_type}' NO puede modificar código de producción (detectado: {', '.join(prod_files)}). "
                    f"Use 'test(red)' seguido de 'feat(green)', 'fix' o 'refactor'."
                )

        # F-02 (auditoría a95896c): la configuración crítica (CI, compuertas, reglas, manifiestos, lockfiles,
        # tsconfig, vitest) altera lo que se ejecuta o valida: solo puede viajar en commits chore(...).
        if not re.match(r"^chore(\([a-z0-9_/-]+\))?:", subject_stripped, re.IGNORECASE):
            critical_files = [f for f in changed_files if is_critical_config_file(f)]
            if critical_files:
                gate_type = subject_stripped.split(":")[0]
                errors.append(
                    f"[{short_hash}] Violación de Invariante de Configuración Crítica en '{subject_stripped}': "
                    f"Un commit '{gate_type}' NO puede modificar configuración crítica (detectado: {', '.join(critical_files)}). "
                    f"Use un commit 'chore(<scope>):' dedicado."
                )

        # 2. Registrar presencia de RED y sus ámbitos
        if re.match(r"^test\(red\)(\([a-z0-9_/-]+\))?:", subject_stripped, re.IGNORECASE):
            # Invariante: Un nuevo test(red) invalida scopes RED previos no consumidos para evitar Stale RED (F-NEW-02)
            active_red_scopes.clear()

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

            raw_scope = extract_scope_from_subject(subject_stripped, r"test\(red\)")
            explicit_scope = raw_scope.split("/", 1)[1] if (raw_scope and "/" in raw_scope) else raw_scope
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
        is_green = bool(re.match(r"^feat\(green\)(\([a-z0-9_/-]+\))?:", subject_stripped, re.IGNORECASE))
        is_fix = bool(re.match(r"^fix(\([a-z0-9_/-]+\))?:", subject_stripped, re.IGNORECASE))

        if is_green or is_fix:
            if not active_red_scopes:
                errors.append(
                    f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                    f"No existe ningún commit previo 'test(red):' pendiente en esta rama."
                )
            else:
                gate_name = r"feat\(green\)" if is_green else r"fix"
                raw_target = extract_scope_from_subject(subject_stripped, gate_name)
                parsed_change = None
                explicit_target = raw_target
                if raw_target and "/" in raw_target:
                    parts = raw_target.split("/")
                    parsed_change = parts[0]
                    explicit_target = "/".join(parts[1:])
                prod_files = [f for f in changed_files if is_production_file(f)]

                # F-03 Mechanical OpenSpec Linkage
                if prod_files:
                    declared_change = extract_openspec_change(subject_stripped, body)
                    change_to_check = parsed_change or declared_change
                    if not change_to_check or change_to_check not in active_openspec_changes:
                        errors.append(
                            f"[{short_hash}] Violación de Trazabilidad SDD en '{subject_stripped}': "
                            f"Todo commit de producción '{'feat(green)' if is_green else 'fix'}' debe referenciar un OpenSpec Change activo válido (ej. trailer 'OpenSpec-Change: <change-id>' o scope '(<change-id>/<modulo>)'). "
                            f"El cambio '{change_to_check or 'no declarado'}' no existe en openspec/changes/ o no contiene tasks.md activo."
                        )

                if prod_files:
                    # Cada archivo de producción DEBE estar estrictamente cubierto por los scopes activos de RED
                    for p_file in prod_files:
                        p_module = extract_module_name(p_file)
                        matches_module = bool(p_module and p_module in active_red_scopes)
                        matches_explicit = bool(
                            explicit_target and (explicit_target in active_red_scopes) and
                            explicit_target == p_module
                        )

                        if not matches_module and not matches_explicit:
                            avail_str = ", ".join(sorted(active_red_scopes)) if active_red_scopes else "ninguno"
                            errors.append(
                                f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                                f"El archivo de producción modificado '{p_file}' (módulo '{p_module or 'anónimo'}') no coincide con ningún test(red) activo previo [{avail_str}]."
                            )
                else:
                    # prod_files está vacío: Bloquear commits vacíos o sin producción a menos que declaren scope explícito
                    target_scopes = [explicit_target] if explicit_target else [extract_module_name(f) for f in changed_files if extract_module_name(f)]
                    if not target_scopes:
                        errors.append(
                            f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                            f"Un commit '{'feat(green)' if is_green else 'fix'}' debe incluir código de producción o declarar un ámbito explícito acoplado a un test(red) activo previo."
                        )
                    else:
                        matched_scope = next(
                            (s for s in target_scopes if s in active_red_scopes),
                            None
                        )
                        if not matched_scope:
                            avail_str = ", ".join(sorted(active_red_scopes)) if active_red_scopes else "ninguno"
                            tgt_str = ", ".join(target_scopes)
                            errors.append(
                                f"[{short_hash}] Violación de Causalidad TDD en '{subject_stripped}': "
                                f"El ámbito modificado [{tgt_str}] no coincide con ningún test(red) activo previo [{avail_str}]."
                            )
                        else:
                            for s in target_scopes:
                                active_red_scopes.discard(s)

                # Consumir scopes satisfechos
                if explicit_target:
                    active_red_scopes.discard(explicit_target)
                for p_file in prod_files:
                    p_module = extract_module_name(p_file)
                    if p_module:
                        active_red_scopes.discard(p_module)

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
        ("c222222", "feat(green): implement add operation", ["src/calculator.py"], "OpenSpec-Change: deterministic-causality-harness"),
        ("c333333", "refactor: simplify math expression", ["src/calculator.py"])
    ]
    errs = validate_commit_list(valid_commits)
    assert not errs, f"Falló validación de flujo válido: {errs}"

    # Caso 2: Scope explícito concordante
    valid_explicit = [
        ("c444444", "test(red)(auth): failing token validation", ["tests/test_auth.py"]),
        ("c555555", "feat(green)(auth): implement token parser", ["src/auth.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_exp = validate_commit_list(valid_explicit)
    assert not errs_exp, f"Falló scope explícito concordante: {errs_exp}"

    # Caso 3: Ataque Adversarial de Copilot (RED en a, GREEN no relacionado en b) -> DEBE SER RECHAZADO
    adversarial_copilot = [
        ("cadv111", "test(red): failing test in a", ["tests/test_a.py"]),
        ("cadv222", "feat(green): implement b without test", ["src/b.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_copilot = validate_commit_list(adversarial_copilot)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_copilot), "Falló bloqueo adversarial Copilot (a != b)"

    # Caso 4: Scope explícito discordante (auth vs billing) -> DEBE SER RECHAZADO
    mismatch_scope = [
        ("c666666", "test(red)(auth): failing test", ["tests/test_auth.py"]),
        ("c777777", "feat(green)(billing): implement billing logic", ["src/billing.py"], "OpenSpec-Change: deterministic-causality-harness")
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
        ("cccccc", "feat(green): first implementation", ["src/calc.py"], "OpenSpec-Change: deterministic-causality-harness"),
        ("cdddddd", "feat(green): second implementation without red", ["src/calc.py"], "OpenSpec-Change: deterministic-causality-harness")
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
        ("cadvdoc2", "feat(green)(auth): implementation", ["src/auth.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_dr = validate_commit_list(invalid_doc_red)
    assert any("DEBE modificar al menos un archivo de test" in e for e in errs_dr), "Falló bloqueo de test(red) documental sin tests"

    # Caso 11: Auditoría Copilot (Fallo B - GREEN multirruta con contrabando de billing bajo scope auth) -> DEBE SER RECHAZADO
    invalid_multi_green = [
        ("cadvmg1", "test(red)(auth): failing auth test", ["tests/unit/test_auth.py"]),
        ("cadvmg2", "feat(green)(auth): impl auth and smuggle billing", ["src/auth.py", "src/billing.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_mg = validate_commit_list(invalid_multi_green)
    assert any("archivo de producción modificado 'src/billing.py'" in e and "no coincide con ningún test(red) activo previo" in e for e in errs_mg), "Falló bloqueo de contrabando multirruta en GREEN"

    # Caso 12 (F-03 Audit): Bypass con archivo de test que produce nombre vacío tipo tests/test_.py sin scope explícito -> RECHAZADO
    invalid_empty_module = [
        ("cf03red1", "test(red): empty module test", ["tests/test_.py"]),
        ("cf03grn1", "feat(green): unrelated implementation", ["src/unrelated.ts"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_empty = validate_commit_list(invalid_empty_module)
    assert any("No se pudo inferir un ámbito de módulo válido" in e for e in errs_empty), "FALLÓ VULNERABILIDAD F-03: verify_gates.py permitió bypass con módulo vacío"

    # Caso 14 (F-03 Audit): Cross-Directory Scope Spoofing (tests/ui/button.test.ts vs src/payments/button.ts) -> DEBE SER RECHAZADO
    invalid_cross_dir = [
        ("ccross11", "test(red): test ui button", ["tests/ui/button.test.ts"]),
        ("ccross22", "feat(green): implement payments button without auth", ["src/payments/button.ts"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_cross = validate_commit_list(invalid_cross_dir)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_cross), "FALLÓ VULNERABILIDAD F-03: verify_gates.py permitió spoofing de ámbito entre subdirectorios distintos"

    # Caso 15 (Auditoría Adversarial): Archivo no ejecutable en tests/ (tests/foo.txt) no califica como test -> DEBE SER RECHAZADO
    invalid_non_code = [
        ("ctxt1111", "test(red): add txt fixture", ["tests/foo.txt"]),
        ("ctxt2222", "feat(green): implement foo", ["src/foo.ts"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_non_code = validate_commit_list(invalid_non_code)
    assert any("DEBE modificar al menos un archivo de test" in e for e in errs_non_code), "FALLÓ AUDITORÍA ADVERSARIAL: verify_gates.py aceptó un archivo .txt no ejecutable como test"

    # Caso 16 (Auditoría Adversarial): Ghost Green (feat(green) que solo toca docs o está vacío sin scope explícito acoplado) -> DEBE SER RECHAZADO
    invalid_ghost = [
        ("cgho1111", "test(red): test auth", ["tests/auth.test.ts"]),
        ("cgho2222", "feat(green): ghost green without code", ["docs/readme.txt"])
    ]
    errs_ghost = validate_commit_list(invalid_ghost)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_ghost), "FALLÓ AUDITORÍA ADVERSARIAL: verify_gates.py permitió commit feat(green) fantasma sin código ni scope acoplado"

    # Caso 17 (F-01 Forensic Audit): Suffix Collision Bypass (tests/test_auth.py vs src/billing/auth.py) -> DEBE SER RECHAZADO
    invalid_suffix = [
        ("red0001", "test(red): auth test", ["tests/test_auth.py"]),
        ("green01", "feat(green): modify billing auth", ["src/billing/auth.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_suffix = validate_commit_list(invalid_suffix)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_suffix), "FALLÓ VULNERABILIDAD F-01: verify_gates.py permitió bypass por colisión de sufijo (auth -> billing/auth)"

    # Caso 18 (F-03 Mechanical OpenSpec Linkage): Trazabilidad SDD obligatoria en feat(green) y fix
    # 18a: Modifica src/ sin OpenSpec Change -> DEBE SER RECHAZADO
    missing_openspec = [
        ("os0001", "test(red)(calc): failing calc test", ["tests/unit/test_calc.py"]),
        ("os0002", "feat(green)(calc): impl calc without openspec trailer", ["src/calc.py"])
    ]
    errs_missing_os = validate_commit_list(missing_openspec)
    assert any("Trazabilidad SDD" in e for e in errs_missing_os), "FALLÓ COMPUERTA SDD F-03: verify_gates.py permitió commit de producción sin OpenSpec Change"

    # 18b: Modifica src/ con OpenSpec Change inexistente -> DEBE SER RECHAZADO
    fake_openspec = [
        ("os0003", "test(red)(calc): failing calc test", ["tests/unit/test_calc.py"]),
        ("os0004", "feat(green)(calc): impl calc with nonexistent change", ["src/calc.py"], "OpenSpec-Change: fake-nonexistent-change")
    ]
    errs_fake_os = validate_commit_list(fake_openspec)
    assert any("Trazabilidad SDD" in e for e in errs_fake_os), "FALLÓ COMPUERTA SDD F-03: verify_gates.py permitió commit de producción con OpenSpec Change inexistente"

    # 18c: Modifica src/ con OpenSpec Change válido vía trailer -> DEBE SER ACEPTADO
    valid_trailer_os = [
        ("os0005", "test(red)(calc): failing calc test", ["tests/unit/test_calc.py"]),
        ("os0006", "feat(green)(calc): impl calc with valid trailer", ["src/calc.py"], "OpenSpec-Change: deterministic-causality-harness")
    ]
    errs_valid_trailer_os = validate_commit_list(valid_trailer_os)
    assert not errs_valid_trailer_os, f"Falló aceptación de commit con trailer OpenSpec válido: {errs_valid_trailer_os}"

    # 18d: Modifica src/ con OpenSpec Change válido vía scope compuesto (<change>/<modulo>) -> DEBE SER ACEPTADO
    valid_composite_scope_os = [
        ("os0007", "test(red)(calc): failing calc test", ["tests/unit/test_calc.py"]),
        ("os0008", "feat(green)(deterministic-causality-harness/calc): impl calc with composite scope", ["src/calc.py"])
    ]
    errs_valid_composite_os = validate_commit_list(valid_composite_scope_os)
    # Caso 19 (F-NEW-01): Contrabando de producción en commits no-código (docs, chore, spec, triage, test(baseline)) -> DEBE SER RECHAZADO
    invalid_smuggle_docs = [
        ("smg0001", "docs: update readme and smuggle calc", ["README.md", "src/calc.py"])
    ]
    errs_smuggle_docs = validate_commit_list(invalid_smuggle_docs)
    assert any("Violación de Invariante de Compuerta" in e and "src/calc.py" in e for e in errs_smuggle_docs), "FALLÓ MITIGACIÓN F-NEW-01: verify_gates.py permitió código de producción en un commit docs"

    invalid_smuggle_chore = [
        ("smg0002", "chore: bump dependencies and smuggle calc", ["package.json", "src/calc.py"])
    ]
    errs_smuggle_chore = validate_commit_list(invalid_smuggle_chore)
    assert any("Violación de Invariante de Compuerta" in e and "src/calc.py" in e for e in errs_smuggle_chore), "FALLÓ MITIGACIÓN F-NEW-01: verify_gates.py permitió código de producción en un commit chore"

    # Caso 20 (F-NEW-02): Exclusión de __init__.py / conftest.py e Invalidación de Stale RED
    assert not is_test_file("tests/__init__.py") and not is_test_file("tests/conftest.py"), "FALLÓ MITIGACIÓN F-NEW-02: is_test_file aceptó __init__.py o conftest.py como test ejecutable"
    assert extract_module_name("tests/__init__.py") == "" and extract_module_name("tests/conftest.py") == "", "FALLÓ MITIGACIÓN F-NEW-02: extract_module_name infirió nombre de módulo sobre __init__.py o conftest.py"

    invalid_stale_red = [
        ("stale01", "test(red)(auth): failing auth test", ["tests/test_auth.py"]),
        ("fresh02", "test(red)(billing): failing billing test", ["tests/test_billing.py"]),
        ("green03", "feat(green)(deterministic-causality-harness/auth): implement auth exploiting stale red", ["src/auth.py"])
    ]
    errs_stale = validate_commit_list(invalid_stale_red)
    assert any("no coincide con ningún test(red) activo previo" in e for e in errs_stale), "FALLÓ MITIGACIÓN F-NEW-02: verify_gates.py permitió explotar un RED obsoleto (stale RED) de otro ámbito"

    # Caso 22 (auditoría a95896c): tabla de verdad compartida con Node (paridad por construcción)
    fixtures = json.loads((Path(__file__).resolve().parent / "path-policy.fixtures.json").read_text(encoding="utf-8"))
    fixture_mismatches = [
        c["path"] for c in fixtures
        if is_test_file(c["path"]) != c["test"]
        or is_production_file(c["path"]) != c["production"]
        or is_critical_config_file(c["path"]) != c["critical"]
    ]
    assert not fixture_mismatches, f"FALLÓ CLASIFICACIÓN DE RUTAS ({len(fixture_mismatches)}/{len(fixtures)}): {fixture_mismatches}"

    # Caso 23 (F-01 a95896c): RED con producción disfrazada de test bajo src/tests/ -> DEBE SER RECHAZADO
    red_via_src_tests = [
        ("f01red1", "test(red)(calc): nested path under src/tests", ["src/tests/calc.ts"]),
        ("f01grn1", "feat(green)(deterministic-causality-harness/calc): implement", ["src/calc.ts"]),
    ]
    errs_src_tests = validate_commit_list(red_via_src_tests)
    assert any("NO puede modificar código de producción" in e for e in errs_src_tests) and \
        any("DEBE modificar al menos un archivo de test" in e for e in errs_src_tests), \
        "FALLÓ MITIGACIÓN F-01 (a95896c): verify_gates.py aceptó producción disfrazada de test bajo src/tests/"

    # Caso 24 (F-02 a95896c): configuración crítica solo en chore(...)
    for subject, files in [
        ("docs: update documentation", ["README.md", "package.json"]),
        ("spec: tweak change", [".github/workflows/gate-validator.yml"]),
        ("docs: update docs", ["pyproject.toml"]),
        ("triage: classify", ["requirements-test.txt"]),
        ("test(baseline): update characterization", ["tsconfig.json"]),
    ]:
        errs_critical = validate_commit_list([("f02xxxx", subject, files)])
        assert any("Configuración Crítica" in e for e in errs_critical), f"FALLÓ MITIGACIÓN F-02 (a95896c): '{subject}' modificó configuración crítica sin ser chore(...)"
    errs_chore_critical = validate_commit_list([("f02chor", "chore(deps): bump dependencies", ["package.json", "package-lock.json"])])
    assert not errs_chore_critical, f"Falló aceptación de chore(...) legítimo sobre configuración crítica: {errs_chore_critical}"

    # Caso 21 (F-NEW-05): Rechazo estricto de referencias con prefijo '-' en is_valid_ref_format
    assert not is_valid_ref_format("--version") and not is_valid_ref_format("-u") and not is_valid_ref_format("--help"), "FALLÓ MITIGACIÓN F-NEW-05: is_valid_ref_format aceptó argumentos que comienzan con guión"

    # Caso 25 (C2): Rechazo de commits de merge
    merge_commit = [
        {"hash": "mrg0001", "subject": "feat(green)(calc): merge branch main", "changed_files": ["src/calc.ts"], "is_merge": True}
    ]
    errs_merge = validate_commit_list(merge_commit)
    assert any("commits de merge no están permitidos" in e for e in errs_merge), "FALLÓ MITIGACIÓN C2: verify_gates.py no rechazó un commit de merge en la secuencia de compuertas"

    # Caso 26 (C3): Rechazo de symlinks y submódulos
    symlink_commit = [
        {"hash": "sym0001", "subject": "test(red)(calc): symlink attack", "changed_files": ["tests/link.ts"], "forbidden_modes": [("tests/link.ts", "120000")]}
    ]
    errs_symlink = validate_commit_list(symlink_commit)
    assert any("No se permiten symlinks ni submódulos" in e for e in errs_symlink), "FALLÓ MITIGACIÓN C3: verify_gates.py no rechazó un archivo con modo symlink (120000)"

    # Caso 27 (C5): Plegado de homóglifos en raíces de producción (ej. Cyrillic 'ѕ' en ѕrc/)
    assert is_production_file("ѕrc/tests/calc.ts") and not is_test_file("ѕrc/tests/calc.ts"), "FALLÓ MITIGACIÓN C5: classify_zone no plegó homóglifo cirílico en raíz de producción"

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
        print(f"❌ ERROR DE SEGURIDAD GIT: La referencia HEAD '{head}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).", file=sys.stderr)
        return 1
    head_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", head])
    if not head_sha:
        print(f"❌ ERROR DE RESOLUCIÓN GIT: No se pudo resolver la referencia HEAD '{head}'. Verifique que esté dentro de un repositorio Git con commits.", file=sys.stderr)
        return 1

    # 2. Resolver BASE de forma segura
    base = args.base
    if base:
        if not is_valid_ref_format(base):
            print(f"❌ ERROR DE SEGURIDAD GIT: La referencia base '{base}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).", file=sys.stderr)
            return 1
        base_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", base])
        if not base_sha:
            print(f"❌ ERROR DE COMPUERTA: La referencia base especificada '{base}' no existe en el repositorio.", file=sys.stderr)
            print("Si está ejecutando en local sin remotos configurados, ejecute 'python scripts/verify_gates.py --base <commit-o-rama>' o agregue el remote correspondiente.", file=sys.stderr)
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
                parents = (run_git_safe(["rev-list", "--parents", "-n", "1", head_sha]) or "").split()[1:]
                is_merge = len(parents) > 1
                raw_diff = run_git_safe(["diff-tree", "--root", "-m", "--first-parent", "-r", "--raw", "--no-renames", "-z", head_sha]) or ""
                files, forbidden = parse_diff_tree_raw(raw_diff)
                errors = validate_commit_list([(head_sha, subject, files, "", is_merge, forbidden)])
                if errors:
                    print("\n❌ VIOLACIONES DE COMPUERTA DETECTADAS EN COMMIT INICIAL:", file=sys.stderr)
                    for err in errors:
                        print(f"  - {err}", file=sys.stderr)
                    return 1
                print("\n✅ COMMIT INICIAL VALIDADO EXITOSAMENTE (Python).")
                return 0

    base_sha = run_git_safe(["rev-parse", "--verify", "--end-of-options", base])
    if not base_sha:
        print(f"❌ ERROR DE COMPUERTA: No se pudo resolver la referencia base '{base}'.", file=sys.stderr)
        return 1
    rev_range = f"{base_sha}..{head_sha}"
    try:
        raw_commits = run_git_or_throw(["log", "--reverse", "--format=%H%x1f%s%x1f%b%x1f%P%x1e", rev_range], f"Fallo al obtener commits en el rango '{rev_range}'")
    except RuntimeError as err:
        print(f"❌ ERROR DE RESOLUCIÓN GIT:\n{err}", file=sys.stderr)
        return 1

    if not raw_commits:
        print(f"[GATE-OK] No hay commits en el rango {rev_range}.")
        return 0

    commits = []
    for chunk in raw_commits.split("\x1e"):
        chunk_clean = chunk.strip()
        if not chunk_clean:
            continue
        parts = chunk_clean.split("\x1f")
        h = parts[0] if len(parts) > 0 else ""
        s = parts[1] if len(parts) > 1 else ""
        b = parts[2] if len(parts) > 2 else ""
        p = parts[3].split() if len(parts) > 3 else []
        is_merge = len(p) > 1
        raw_diff = run_git_safe(["diff-tree", "--root", "-m", "--first-parent", "-r", "--raw", "--no-renames", "-z", h]) or ""
        files, forbidden = parse_diff_tree_raw(raw_diff)
        commits.append((h, s, files, b, is_merge, forbidden))

    print(f"[GATE-VALIDATOR] Analizando {len(commits)} commits en {rev_range}...")
    errors = validate_commit_list(commits)

    if errors:
        print("\n[ERROR] VIOLACIONES DE COMPUERTA DETECTADAS:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("\n[GATE-OK] TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Python).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
