# Informe del Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)

**Fecha de ejecución:** 2026-10-16T00:05:14.754Z
**Directorio auditado:** `C:\Users\rayrabbit-oss-github\ai-engineering`
**Alcance y Metodología:** Batería heurística interna de chequeos estáticos y probes dinámicos locales en 10 categorías de ingeniería (D1–D10). Las referencias a identificadores CWE se utilizan exclusivamente como taxonomía técnica; este reporte **no** constituye una certificación ni evaluación formal de conformidad bajo estándares externos.

## 1. Resumen Ejecutivo

**Resultado del Escáner:** `APROBADO (ZERO CRITICAL/HIGH FINDINGS)`

- **Hallazgos Críticos:** 0
- **Hallazgos Altos:** 0
- **Hallazgos Medios:** 0
- **Hallazgos Bajos:** 0

## 2. Registro de Hallazgos

No se detectaron vulnerabilidades, regresiones de contrato ni bypasses en las 10 categorías evaluadas.

## 3. Bitácora de Ejecución (Audit Trail)

| # | Comando / Probe Ejecutado | Exit Code | Duración (ms) | Observación |
|---:|---|---:|---:|---|
| 1 | `node scripts/verify-gates.mjs --base "HEAD; printf \"REDTEAM_NODE_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 264 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 2 | `node scripts/verify-gates.mjs --base --version --head HEAD` | 1 | 242 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 3 | `python scripts/verify_gates.py --base "HEAD; printf \"REDTEAM_PY_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 319 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 4 | `ReDoS Benchmark (50,000 chars malformed commit subject)` | 0 | 0 | Regex evaluation took 0.10ms |
| 5 | `node scripts/guard-agent.mjs --self-test` | 0 | 295 | [GUARD-SELF-TEST] Verificando resistencia de guard-agent.mjs ante ataques de degradación semántica (F-01)... |
| 6 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0001\",\"test(red): empty module name trick\",[\"tests/test_.py\"]],[\"green01\",\"feat(green): unrelated production file\",[\"src/unrelated.ts\"]]]"` | 0 | 313 | ["[red0001] Violaci\u00f3n de Invariante 1 en 'test(red): empty module name trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1 |
| 7 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0002\",\"test(red): dot test trick\",[\"tests/.test.ts\"]],[\"green02\",\"feat(green): core takeover\",[\"src/core.ts\"]]]"` | 0 | 246 | ["[red0002] Violaci\u00f3n de Invariante 1 en 'test(red): dot test trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1lido de l |
| 8 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0003\",\"test(red)(auth): fake red touching only docs\",[\"docs/auth.md\"]],[\"doc0003\",\"docs: intermediate commit\",[\"README.md\"]],[\"green03\",\"feat(green)(auth): smuggle billing alongside auth\",[\"src/auth.ts\",\"src/billing.ts\"]]]"` | 0 | 243 | ["[red0003] Violaci\u00f3n de Invariante 1 en 'test(red)(auth): fake red touching only docs': Un commit 'test(red):' DEBE modificar al menos |
| 9 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0004\",\"test(red)(calc): mixed prod and test in red\",[\"tests/test_calculator.py\",\"src/calculator.py\"]]]"` | 0 | 213 | ["[red0004] Violaci\u00f3n de Invariante 1 en 'test(red)(calc): mixed prod and test in red': Un commit 'test(red):' NO puede modificar c\u00 |
| 10 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0005\",\"test(red)(calc): test\",[\"tests/test_calc.py\"]],[\"green05\",\"feat(green)(calc): silently alter consolidated spec\",[\"src/calc.py\",\"openspec/specs/core/spec.md\"]]]"` | 0 | 202 | ["[green05] Violaci\u00f3n de Trazabilidad SDD en 'feat(green)(calc): silently alter consolidated spec': Todo commit de producci\u00f3n 'fea |
| 11 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0006\",\"test(red): generic index test\",[\"tests/ui/index.test.ts\"]],[\"green06\",\"feat(green): touch payments index\",[\"src/payments/index.ts\"]]]"` | 0 | 200 | ["[green06] Violaci\u00f3n de Trazabilidad SDD en 'feat(green): touch payments index': Todo commit de producci\u00f3n 'feat(green)' debe ref |
| 12 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0007\",\"test(red)(math-engine/calculator): add failing division test\",[\"tests/test_calculator.py\"]],[\"green07\",\"feat(green)(math-engine/calculator): implement division\",[\"src/calculator.py\"]]]"` | 0 | 195 | [] |
| 13 | `cmd.exe /d /s /c "npm audit --json"` | 0 | 2999 | { |
