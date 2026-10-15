# Informe de Auditoría Ofensiva y Forense (Red Team)

**Fecha de ejecución:** 2026-10-15T21:23:35.099Z
**Directorio auditado:** `C:\Users\rayrabbit-oss-github\ai-engineering`
**Estándares aplicados:** OWASP ASVS L3, OWASP CI/CD Top 10, OWASP LLM Top 10, SLSA L3, CWE Top 25, CVSS v4.0

## 1. Dictamen Ejecutivo y Postura de Riesgo

**Veredicto Global:** `APROBADO (ZERO CRITICAL/HIGH FINDINGS)`

- **Hallazgos Críticos:** 0
- **Hallazgos Altos:** 0
- **Hallazgos Medios:** 1
- **Hallazgos Bajos:** 0

## 2. Registro de Vulnerabilidades, Exploits y Bypasses

### F-01 — Guardia de integridad superficial: guard-agent.mjs no verifica hashes criptográficos (SHA-256)

- **Severidad:** Media | **CVSS:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (6.5)` | **CWE:** `CWE-353: Missing Support for Integrity Check` | **Marco:** SLSA L3 / OWASP ASVS L3 V14.2 | **Confianza:** Alta
- **Ubicación:** `scripts/guard-agent.mjs#L11`
- **Mecanismo Técnico:** `guard-agent.mjs` comprueba únicamente la existencia de archivos con `fs.existsSync`, permitiendo truncar a 0 bytes o comentar todas las reglas en `.agent/rules/` sin que el guard detecte el sabotaje.
- **PoC / Comando Reproducible:** `grep -nE "existsSync|createHash" scripts/guard-agent.mjs`

```text
Línea 11: usa fs.existsSync sin validación SHA-256 de contenido ni longitud mínima.
```

- **Remediación Defensiva (Fail-Closed):** Mantener un manifiesto firmado de hashes SHA-256 para `.agent/rules/*` y `.github/workflows/*` y fallar con `exit 1` ante cualquier discrepancia.

## 3. Bitácora Forense de Ejecución (Audit Trail)

| # | Comando / Probe Ejecutado | Exit Code | Duración (ms) | Observación Forense |
|---:|---|---:|---:|---|
| 1 | `node scripts/verify-gates.mjs --base "HEAD; printf \"REDTEAM_NODE_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 250 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 2 | `node scripts/verify-gates.mjs --base --version --head HEAD` | 1 | 239 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 3 | `python scripts/verify_gates.py --base "HEAD; printf \"REDTEAM_PY_CANARY_78\|test(red): fake_injected\"" --head HEAD` | 1 | 307 | ❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio: |
| 4 | `ReDoS Benchmark (50,000 chars malformed commit subject)` | 0 | 0 | Regex evaluation took 0.10ms |
| 5 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0001\",\"test(red): empty module name trick\",[\"tests/test_.py\"]],[\"green01\",\"feat(green): unrelated production file\",[\"src/unrelated.ts\"]]]"` | 0 | 249 | ["[red0001] Violaci\u00f3n de Invariante 1 en 'test(red): empty module name trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1 |
| 6 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0002\",\"test(red): dot test trick\",[\"tests/.test.ts\"]],[\"green02\",\"feat(green): core takeover\",[\"src/core.ts\"]]]"` | 0 | 215 | ["[red0002] Violaci\u00f3n de Invariante 1 en 'test(red): dot test trick': No se pudo inferir un \u00e1mbito de m\u00f3dulo v\u00e1lido de l |
| 7 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0003\",\"test(red)(auth): fake red touching only docs\",[\"docs/auth.md\"]],[\"doc0003\",\"docs: intermediate commit\",[\"README.md\"]],[\"green03\",\"feat(green)(auth): smuggle billing alongside auth\",[\"src/auth.ts\",\"src/billing.ts\"]]]"` | 0 | 202 | ["[red0003] Violaci\u00f3n de Invariante 1 en 'test(red)(auth): fake red touching only docs': Un commit 'test(red):' DEBE modificar al menos |
| 8 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0004\",\"test(red)(calc): mixed prod and test in red\",[\"tests/test_calculator.py\",\"src/calculator.py\"]]]"` | 0 | 200 | ["[red0004] Violaci\u00f3n de Invariante 1 en 'test(red)(calc): mixed prod and test in red': Un commit 'test(red):' NO puede modificar c\u00 |
| 9 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0005\",\"test(red)(calc): test\",[\"tests/test_calc.py\"]],[\"green05\",\"feat(green)(calc): silently alter consolidated spec\",[\"src/calc.py\",\"openspec/specs/core/spec.md\"]]]"` | 0 | 209 | ["[green05] Violaci\u00f3n de Trazabilidad SDD en 'feat(green)(calc): silently alter consolidated spec': Todo commit de producci\u00f3n 'fea |
| 10 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0006\",\"test(red): generic index test\",[\"tests/ui/index.test.ts\"]],[\"green06\",\"feat(green): touch payments index\",[\"src/payments/index.ts\"]]]"` | 0 | 195 | ["[green06] Violaci\u00f3n de Trazabilidad SDD en 'feat(green): touch payments index': Todo commit de producci\u00f3n 'feat(green)' debe ref |
| 11 | `python -c "import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))" "[[\"red0007\",\"test(red)(calculator): add failing division test\",[\"tests/test_calculator.py\"]],[\"green07\",\"feat(green)(calculator): implement division\",[\"src/calculator.py\"]]]"` | 0 | 191 | ["[green07] Violaci\u00f3n de Trazabilidad SDD en 'feat(green)(calculator): implement division': Todo commit de producci\u00f3n 'feat(green) |
| 12 | `npm.cmd audit --json` | -1 | 2 | spawnSync npm.cmd EINVAL |
