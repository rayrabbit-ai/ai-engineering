#!/usr/bin/env python3
"""
check_python_coverage.py - Verificador Independiente de Cobertura Python
RayRabbit AI Engineering Standard

Garantiza y audita de forma mecánicamente separada los umbrales mínimos:
- Cobertura de Líneas / Sentencias >= 80.0%
- Cobertura de Ramas (Branch Coverage) >= 75.0%

Mitigación directa del hallazgo de auditoría F-09.
"""

import sys
import json
import argparse
import subprocess
from pathlib import Path

# Soporte seguro de codificación en Windows y UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser(description="Verificador de Umbrales de Cobertura Separados (Líneas y Ramas)")
    parser.add_argument("--min-lines", type=float, default=80.0, help="Porcentaje mínimo requerido para líneas (default: 80.0)")
    parser.add_argument("--min-branches", type=float, default=75.0, help="Porcentaje mínimo requerido para ramas (default: 75.0)")
    args = parser.parse_args()

    # Generar o leer informe JSON desde .coverage
    try:
        res = subprocess.run(
            ["python", "-m", "coverage", "json", "-o", "-"],
            capture_output=True,
            text=True,
            check=True
        )
        cov_data = json.loads(res.stdout)
    except Exception as err:
        print(f"❌ ERROR AL OBTENER DATOS DE COBERTURA: {err}")
        print("Asegúrese de haber ejecutado pytest con '--cov=src --cov-branch' previamente.")
        return 1

    totals = cov_data.get("totals", {})
    line_cov = totals.get("percent_statements_covered", totals.get("percent_covered", 0.0))
    branch_cov = totals.get("percent_branches_covered", 0.0)

    print("\n" + "=" * 60)
    print("AUDITORÍA MECÁNICA DE COBERTURA PYTHON (F-09)")
    print("=" * 60)
    print(f"  • Cobertura de Líneas/Sentencias: {line_cov:.2f}% (Mínimo exigido: {args.min_lines:.1f}%)")
    print(f"  • Cobertura de Ramas (Branches):   {branch_cov:.2f}% (Mínimo exigido: {args.min_branches:.1f}%)")
    print("=" * 60)

    failed = False
    if line_cov < args.min_lines:
        print(f"❌ FALLO DE COMPUERTA: Cobertura de líneas {line_cov:.2f}% < {args.min_lines:.1f}%")
        failed = True
    else:
        print(f"✅ COMPUERTA DE LÍNEAS APROBADA ({line_cov:.2f}% >= {args.min_lines:.1f}%)")

    if branch_cov < args.min_branches:
        print(f"❌ FALLO DE COMPUERTA: Cobertura de ramas {branch_cov:.2f}% < {args.min_branches:.1f}%")
        failed = True
    else:
        print(f"✅ COMPUERTA DE RAMAS APROBADA ({branch_cov:.2f}% >= {args.min_branches:.1f}%)")

    print("=" * 60 + "\n")
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
