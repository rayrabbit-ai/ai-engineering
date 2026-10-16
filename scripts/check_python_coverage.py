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
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def main() -> int:
    parser = argparse.ArgumentParser(description="Verificador de Umbrales de Cobertura Separados (Líneas y Ramas)")
    parser.add_argument("report", nargs="?", default=None, type=Path, help="Informe JSON generado por coverage.py (opcional)")
    parser.add_argument("--min-lines", type=float, default=80.0, help="Porcentaje mínimo requerido para líneas (default: 80.0)")
    parser.add_argument("--min-branches", type=float, default=75.0, help="Porcentaje mínimo requerido para ramas (default: 75.0)")
    args = parser.parse_args()

    cov_data = None
    if args.report is not None:
        report_path = Path(args.report)
        if not report_path.is_file():
            print(f"❌ Error (Fail-Closed): El archivo de informe de cobertura '{report_path}' no existe.")
            return 1
        try:
            cov_data = json.loads(report_path.read_text(encoding="utf-8"))
        except Exception as error:
            print(f"❌ Error al leer el informe de cobertura '{report_path}': {error}")
            return 1
    else:
        try:
            res = subprocess.run(
                [sys.executable, "-m", "coverage", "json", "-o", "-"],
                capture_output=True,
                text=True,
                check=True
            )
            cov_data = json.loads(res.stdout)
        except Exception as err:
            print(f"❌ ERROR AL OBTENER DATOS DE COBERTURA: {err}")
            print("Asegúrese de haber ejecutado pytest con '--cov=src --cov-branch' previamente.")
            return 1

    if not isinstance(cov_data, dict) or not isinstance(cov_data.get("totals"), dict):
        print("❌ Error (Fail-Closed): El informe JSON de cobertura no contiene un bloque 'totals' válido.")
        return 1

    totals = cov_data["totals"]
    statements = totals.get("num_statements", 0)
    covered_lines = totals.get("covered_lines", 0)
    branches = totals.get("num_branches", 0)
    covered_branches = totals.get("covered_branches", 0)

    if statements <= 0:
        print("❌ Error (Fail-Closed): El informe de cobertura reporta 0 sentencias evaluadas (num_statements <= 0).")
        return 1

    # 1. Calcular Cobertura de Líneas (Statements)
    if "percent_statements_covered" in totals and totals["percent_statements_covered"] is not None:
        line_cov = float(totals["percent_statements_covered"])
    elif statements > 0:
        line_cov = (covered_lines / statements) * 100.0
    elif "percent_covered" in totals and totals["percent_covered"] is not None:
        line_cov = float(totals["percent_covered"])
    else:
        line_cov = 0.0

    # 2. Calcular Cobertura de Ramas (Branches) - F-09 robusto contra variaciones de coverage.py
    if "percent_branches_covered" in totals and totals["percent_branches_covered"] is not None:
        branch_cov = float(totals["percent_branches_covered"])
    elif branches > 0:
        branch_cov = (covered_branches / branches) * 100.0
    else:
        branch_cov = 0.0

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
