#!/usr/bin/env python3
"""
verify_red_failure.py - Verificador Físico de Fallo en Fase RED
RayRabbit AI Engineering Standard

Ejecuta físicamente las pruebas recién añadidas o modificadas en el commit/staged
y verifica de forma determinante que FALLAN (exit code != 0) antes de tocar código de producción.
Mitiga el hallazgo F-08 garantizando la causalidad física del test en rojo.
"""

import sys
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

def get_test_files() -> list[str]:
    # Primero staged
    files = [f for f in run_git(["diff", "--cached", "--name-only"]) if "test" in f.lower() or "spec" in f.lower()]
    if not files:
        # Luego en HEAD
        files = [f for f in run_git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]) if "test" in f.lower() or "spec" in f.lower()]
    return files

def main() -> int:
    test_files = get_test_files()
    if not test_files:
        print("[RED-VERIFIER] No se detectaron archivos de test nuevos o modificados para validar.")
        return 0

    print(f"[RED-VERIFIER] Verificando fallo físico legítimo en tests: [{', '.join(test_files)}]...")

    py_files = [f for f in test_files if f.endswith(".py")]
    ts_files = [f for f in test_files if f.endswith(".ts") or f.endswith(".js")]

    if py_files:
        res = subprocess.run(["python", "-m", "pytest", *py_files], capture_output=True, text=True, shell=False)
        if res.returncode == 0:
            print(f"\n❌ VIOLACIÓN TDD EN FASE RED:")
            print(f"La prueba en [{', '.join(py_files)}] PASÓ INMEDIATAMENTE (exit code 0).")
            print("Un commit 'test(red):' exige que la prueba falle legítimamente antes de implementar.")
            return 1
        print(f"✅ [FÍSICO] Test Python falló legítimamente como se exige en RED (exit code {res.returncode}).")

    if ts_files:
        res = subprocess.run(["npx", "vitest", "run", *ts_files], capture_output=True, text=True, shell=False)
        if res.returncode == 0:
            print(f"\n❌ VIOLACIÓN TDD EN FASE RED:")
            print(f"La prueba en [{', '.join(ts_files)}] PASÓ INMEDIATAMENTE (exit code 0).")
            print("Un commit 'test(red):' exige que la prueba falle legítimamente antes de implementar.")
            return 1
        print(f"✅ [FÍSICO] Test TypeScript falló legítimamente como se exige en RED (exit code {res.returncode}).")

    print("[RED-VERIFIER] ✅ Causalidad física RED validada exitosamente.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
