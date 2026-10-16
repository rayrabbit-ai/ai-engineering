#!/usr/bin/env python3
"""
verify_red_failure.py - Verificador Físico de Aserción en Fase RED
RayRabbit AI Engineering Standard

Ejecuta físicamente las pruebas recién añadidas o modificadas en el commit/staged
y verifica que se produzca un FALLO DE ASERCIÓN LEGÍTIMO (exit code != 0 con AssertionError/FAILED),
rechazando explícitamente errores de sintaxis, colección, importación o configuración del runner.
"""

import sys
import re
import subprocess
from pathlib import Path

# Soporte seguro de codificación en Windows y UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_git(args: list[str]) -> list[str]:
    res = subprocess.run(["git", *args], capture_output=True, text=True, shell=False)
    if res.returncode == 0:
        return [l.strip() for l in res.stdout.splitlines() if l.strip()]
    return []

def is_executable_test_file(file_path: str) -> bool:
    if not file_path:
        return False
    norm = file_path.replace("\\", "/").lower()
    if not re.search(r"\.(ts|tsx|js|mjs|cjs|py)$", norm, re.IGNORECASE):
        return False
    return "tests/" in norm or "test/" in norm or ".spec." in norm or ".test." in norm

def get_test_files() -> list[str]:
    files = [f for f in run_git(["diff", "--cached", "--name-only"]) if is_executable_test_file(f)]
    if not files:
        files = [f for f in run_git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]) if is_executable_test_file(f)]
    return files

def has_syntax_or_collection_error(output: str) -> bool:
    forbidden = [
        r"SyntaxError",
        r"ImportError",
        r"ModuleNotFoundError",
        r"ERROR collecting",
        r"Cannot find module",
        r"ERR_MODULE_NOT_FOUND",
        r"Failed to resolve import",
        r"Unhandled Error",
        r"Unhandled rejection",
    ]
    return any(re.search(pat, output, re.IGNORECASE) for pat in forbidden)

def has_legitimate_assertion_failure(output: str) -> bool:
    # 1. Prohibir errores genéricos de excepción que no son aserciones
    if re.search(r"(RuntimeError|ValueError|TypeError|ZeroDivisionError|KeyError|IndexError|AttributeError|NameError|Exception):", output) and not re.search(r"(AssertionError|^E\s+assert\b)", output, re.MULTILINE):
        return False

    patterns = [
        r"AssertionError",
        r"^E\s+assert\s+",
        r"assert\(",
        r"Assertion failed",
        r"expected\s+.+\s+to\b",
        r"Expected:.+Received:",
    ]
    return any(re.search(pat, output, re.IGNORECASE | re.MULTILINE) for pat in patterns)

def self_test() -> int:
    print("[RED-VERIFIER-SELF-TEST] Verificando filtros y aserciones de fallo en Python...")
    assert not is_executable_test_file("requirements-test.txt"), "is_executable_test_file aceptó requirements-test.txt"
    assert not is_executable_test_file("tests/foo.txt"), "is_executable_test_file aceptó tests/foo.txt"
    assert is_executable_test_file("tests/unit/test_calc.py"), "is_executable_test_file rechazó tests/unit/test_calc.py"
    assert is_executable_test_file("tests/unit/calc.spec.ts"), "is_executable_test_file rechazó tests/unit/calc.spec.ts"
    assert not has_legitimate_assertion_failure("RuntimeError: setup fail"), "has_legitimate_assertion_failure aceptó error genérico"
    assert not has_legitimate_assertion_failure("    assert x == 1\nZeroDivisionError: division by zero"), "has_legitimate_assertion_failure aceptó ZeroDivisionError con código fuente assert"
    assert has_legitimate_assertion_failure("AssertionError: assert 5 == 10"), "has_legitimate_assertion_failure rechazó AssertionError"
    assert has_legitimate_assertion_failure("E       assert 5 == 10"), "has_legitimate_assertion_failure rechazó E assert de pytest"
    print("[RED-VERIFIER-SELF-TEST] ✅ Autochequeo de verificador RED en Python aprobado.")
    return 0

def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    test_files = get_test_files()
    if not test_files:
        print("[RED-VERIFIER] ❌ No se detectaron archivos de test nuevos o modificados en staged ni en HEAD (Fail-Closed).")
        return 1

    print(f"[RED-VERIFIER] Verificando aserción de fallo físico en: [{', '.join(test_files)}]...")

    py_files = [f for f in test_files if f.endswith(".py")]
    ts_files = [f for f in test_files if f.endswith(".ts") or f.endswith(".js")]
    verified = 0

    if py_files:
        res = subprocess.run(["python", "-m", "pytest", "--", *py_files], capture_output=True, text=True, shell=False)
        output = f"{res.stdout}\n{res.stderr}"

        if res.returncode == 0:
            print(f"\n❌ VIOLACIÓN TDD EN FASE RED:")
            print(f"La prueba en [{', '.join(py_files)}] PASÓ INMEDIATAMENTE (exit code 0).")
            print("Un commit 'test(red):' exige que la aserción falle legítimamente antes de implementar.")
            return 1

        if has_syntax_or_collection_error(output):
            print(f"\n❌ ERROR DE SINTAXIS / COLECCIÓN EN TEST PYTHON:")
            print("El test falló por error de importación o sintaxis, no por aserción TDD legítima.")
            print("\n".join(output.splitlines()[:15]))
            return 1

        if not has_legitimate_assertion_failure(output):
            print(f"\n❌ ERROR EN FASE RED: No se detectó una aserción fallida reconocible en la salida de pytest.")
            return 1

        print(f"✅ [FÍSICO] Test Python falló por aserción legítima (exit code {res.returncode}).")
        verified += 1

    if ts_files:
        res = subprocess.run(["npx", "vitest", "run", "--", *ts_files], capture_output=True, text=True, shell=False)
        output = f"{res.stdout}\n{res.stderr}"

        if res.returncode == 0:
            print(f"\n❌ VIOLACIÓN TDD EN FASE RED:")
            print(f"La prueba en [{', '.join(ts_files)}] PASÓ INMEDIATAMENTE (exit code 0).")
            print("Un commit 'test(red):' exige que la aserción falle legítimamente antes de implementar.")
            return 1

        if has_syntax_or_collection_error(output):
            print(f"\n❌ ERROR DE SINTAXIS / IMPORTACIÓN EN TEST TYPESCRIPT:")
            print("El runner falló por error de importación o resolución de módulos.")
            print("\n".join(output.splitlines()[:15]))
            return 1

        if not has_legitimate_assertion_failure(output):
            print(f"\n❌ ERROR EN FASE RED: No se detectó una aserción fallida reconocible en la salida de Vitest.")
            return 1

        print(f"✅ [FÍSICO] Test TypeScript falló por aserción legítima (exit code {res.returncode}).")
        verified += 1

    if verified == 0:
        print("\n❌ ERROR EN FASE RED: No se ejecutó ni verificó ninguna prueba ejecutable.")
        return 1

    print(f"[RED-VERIFIER] ✅ Causalidad física RED validada exitosamente ({verified} aserciones fallidas legítimas).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
