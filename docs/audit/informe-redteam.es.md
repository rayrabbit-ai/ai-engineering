# Informe del Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)

**Fecha de ejecución:** 2026-10-16T03:56:13.248Z
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
| 1 | `node scripts/verify-gates.mjs --allow-dirty --base "HEAD; printf \"REDTEAM_NODE_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 322 | ⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados (--allow-dirty activo): |
| 2 | `node scripts/verify-gates.mjs --allow-dirty --base --version --head HEAD` | 1 | 326 | ⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados (--allow-dirty activo): |
| 3 | `python scripts/verify_gates.py --allow-dirty --base "HEAD; printf \"REDTEAM_PY_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 535 | ⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados (--allow-dirty activo): |
| 4 | `python scripts/verify_gates.py --allow-dirty --base --version --head HEAD` | 2 | 294 | usage: verify_gates.py [-h] [--base BASE] [--head HEAD] [--self-test] |
| 5 | `ReDoS Benchmark (50,000 chars malformed commit subject)` | 0 | 0 | Regex evaluation took 0.11ms |
| 6 | `node scripts/guard-agent.mjs --self-test` | 0 | 326 | [GUARD-SELF-TEST] Verificando resistencia de guard-agent.mjs ante ataques de degradación semántica (F-01)... |
| 7 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0001\",\"test(red): empty module name trick\",[\"tests/test_.py\"]],[\"green01\",\"feat(green): unrelated production file\",[\"src/unrelated.ts\"]]]"` | 0 | 204 | ["[red0001] Violaci\u00f3n de Invariante 1 en 'test(red): empty module name trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1 |
| 8 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0002\",\"test(red): dot test trick\",[\"tests/.test.ts\"]],[\"green02\",\"feat(green): core takeover\",[\"src/core.ts\"]]]"` | 0 | 191 | ["[red0002] Violaci\u00f3n de Invariante 1 en 'test(red): dot test trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1lido de l |
| 9 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0003\",\"test(red)(auth): fake red touching only docs\",[\"docs/auth.md\"]],[\"doc0003\",\"docs: intermediate commit\",[\"README.md\"]],[\"green03\",\"feat(green)(auth): smuggle billing alongside auth\",[\"src/auth.ts\",\"src/billing.ts\"]]]"` | 0 | 187 | ["[red0003] Violaci\u00f3n de Invariante 1 en 'test(red)(auth): fake red touching only docs': Un commit 'test(red):' DEBE modificar al menos |
| 10 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0004\",\"test(red)(calc): mixed prod and test in red\",[\"tests/test_calculator.py\",\"src/calculator.py\"]]]"` | 0 | 202 | ["[red0004] Violaci\u00f3n de Invariante 1 en 'test(red)(calc): mixed prod and test in red': Un commit 'test(red):' NO puede modificar c\u00 |
| 11 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0005\",\"test(red)(calc): test\",[\"tests/test_calc.py\"]],[\"green05\",\"feat(green)(calc): silently alter consolidated spec\",[\"src/calc.py\",\"openspec/specs/core/spec.md\"]]]"` | 0 | 203 | ["[green05] Violaci\u00f3n de Trazabilidad SDD en 'feat(green)(calc): silently alter consolidated spec': Todo commit de producci\u00f3n 'fea |
| 12 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0006\",\"test(red): generic index test\",[\"tests/ui/index.test.ts\"]],[\"green06\",\"feat(green): touch payments index\",[\"src/payments/index.ts\"]]]"` | 0 | 180 | ["[green06] Violaci\u00f3n de Trazabilidad SDD en 'feat(green): touch payments index': Todo commit de producci\u00f3n 'feat(green)' debe ref |
| 13 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0007\",\"test(red)(math-engine/calculator): add failing division test\",[\"tests/test_calculator.py\"]],[\"green07\",\"feat(green)(math-engine/calculator): implement division\",[\"src/calculator.py\"]]]"` | 0 | 190 | [] |
| 14 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"smg0001\",\"docs: update documentation and smuggle production code\",[\"README.md\",\"src/calculator.ts\"]]]"` | 0 | 217 | ["[smg0001] Violaci\u00f3n de Invariante de Compuerta en 'docs: update documentation and smuggle production code': Un commit de tipo no-c\u0 |
| 15 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"f01red1\",\"test(red)(calc): nested path under src/tests\",[\"src/tests/calc.ts\"]],[\"f01grn1\",\"feat(green)(deterministic-causality-harness/calc): implement\",[\"src/calc.ts\"]]]"` | 0 | 217 | ["[f01red1] Violaci\u00f3n de Invariante 1 en 'test(red)(calc): nested path under src/tests': Un commit 'test(red):' NO puede modificar c\u0 |
| 16 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"f02doc1\",\"docs: update documentation and tamper package.json\",[\"README.md\",\"package.json\"]]]"` | 0 | 281 | ["[f02doc1] Violaci\u00f3n de Invariante de Configuraci\u00f3n Cr\u00edtica en 'docs: update documentation and tamper package.json': Un comm |
| 17 | `node C:\Users\rayrabbit-oss-github\ai-engineering\scripts\verify-policy-coherence.mjs --self-test` | 0 | 257 | [POLICY-COHERENCE-SELF-TEST] Verificando coherencia política↔runtime... |
| 18 | `node C:\Users\rayrabbit-oss-github\ai-engineering\scripts\verify-policy-coherence.mjs` | 0 | 124 | [POLICY-COHERENCE] Fuentes de runtime: tsconfig.json, vitest.config.ts, pyproject.toml, package.json |
| 19 | `cmd.exe /d /s /c "npm audit --json"` | 0 | 3447 | { |
| 20 | `python scripts/check_python_coverage.py C:\Users\WINDOW~1\AppData\Local\Temp\redteam-empty-cov-21024.json` | 1 | 185 | ❌ Error (Fail-Closed): El informe JSON de cobertura no contiene un bloque 'totals' válido. |
| 21 | `node scripts/verify-historical-replay.mjs --self-test` | 0 | 155 | [SELF-TEST] Probando motor de clasificación de Replay Histórico... |
| 22 | `node scripts/verify-red-failure.mjs --self-test` | 0 | 133 | [RED-VERIFIER-SELF-TEST] Verificando filtros y aserciones de fallo... |
| 23 | `python scripts/verify_red_failure.py --self-test` | 0 | 218 | [RED-VERIFIER-SELF-TEST] Verificando filtros y aserciones de fallo en Python... |
| 24 | `node scripts/tdd-flow.mjs --self-test` | 0 | 157 | [SELF-TEST] Probando tdd-flow.mjs... |
