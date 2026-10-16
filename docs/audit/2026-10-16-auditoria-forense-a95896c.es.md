# Informe Forense de Seguridad — `a95896c`

**Fecha de auditoría:** 2026-10-16  
**Dictamen:** **RECHAZADO** como evidencia suficiente de seguridad determinista o conformidad formal.  
**Repositorio:** [`rayrabbit-ai/ai-engineering`](https://github.com/rayrabbit-ai/ai-engineering)  
**Commit auditado:** [`a95896c074aaf0f0150bdc3cddee41fada42fc11`](https://github.com/rayrabbit-ai/ai-engineering/commit/a95896c074aaf0f0150bdc3cddee41fada42fc11)  
**Rama comprobada al cierre:** `main` en el mismo SHA.  
**Clasificación:** revisión independiente limitada a código, pipeline y artefactos públicamente accesibles; no es certificación.

## 1. Resumen ejecutivo

El commit está firmado criptográficamente según la API de GitHub (`verified: true`, `reason: valid`), es el HEAD actual de `main` en la última consulta, y los cinco checks publicados por GitHub para ese SHA terminaron en `success`. Los validadores Node/Python, las suites ejecutadas, OpenSpec, cobertura y el escáner interno pasaron en una copia aislada del SHA.

Sin embargo, el control central de causalidad TDD tiene una evasión reproducible: `src/tests/calc.ts` se clasifica como test, no como código de producción. Una secuencia sintética RED→GREEN que usa esa ruta es aceptada por `validateCommitList` sin errores; el replay histórico también acepta esa forma de ruta y TypeScript incluye `src/**/*`. Esto permite que código compilable de producción entre por una compuerta `test(red)`, contradiciendo una garantía central del harness. Además, las configuraciones ejecutables de CI quedan fuera del clasificador de producción. Por estos hallazgos no doy por probadas las afirmaciones de enforcement integral.

**Alcance del dictamen:** el commit no muestra señales de malware ni dependencias npm vulnerables de severidad alta/crítica. El rechazo se refiere a la suficiencia de sus controles y a cualquier interpretación de “seguridad/cumplimiento” más amplia que las pruebas observadas. No se ha observado compromiso ni explotación de un repositorio real.

## 2. Identidad y cadena de evidencia

La API pública devolvió:

- SHA: `a95896c074aaf0f0150bdc3cddee41fada42fc11`.
- Mensaje: `chore(hardening): remediate adversarial audit findings F-NEW-01 to F-NEW-05 (#20)`.
- Padre: `5abbf96552156ef3bddc97be51937bfbd2a8a241`.
- Fecha: `2026-10-16T01:19:33Z`.
- Firma GitHub: `verified=true`, `reason=valid`.
- Comprobación de actualidad al 2026-10-16: API `commits/main` y `git ls-remote origin refs/heads/main` devolvieron ambos `a95896c074aaf0f0150bdc3cddee41fada42fc11`.
- Checks de Actions consultados: **5 completados, 5 `success`** (OpenSpec, gates, Python/cobertura, escáner, TypeScript/cobertura).

La firma válida acredita la firma del objeto de commit según GitHub; no equivale a una attestation SLSA ni acredita por sí sola la seguridad del código o la identidad operacional del autor.

## 3. Alcance y límites

Se inspeccionaron el diff del commit, los validadores JavaScript/Python, replay RED, verificador RED, workflow de CI, `tsconfig`, documentación y resultados de Actions. Se ejecutaron análisis estáticos del propio escáner, pruebas de regresión, fuzzing diferencial acotado y dos mutaciones dirigidas.

Este repositorio es una plantilla/harness con una calculadora de ejemplo, no una aplicación web con endpoints, sesiones, almacenamiento o gestión de memoria dinámica sensible. Por ello:

- OWASP ASVS L3: **no evaluable/no aplicable como certificación** en este alcance; no se ejecutó un programa de verificación ASVS requisito por requisito.
- OWASP LLM Top 10 y MITRE ATLAS: se revisaron instrucciones/workflows de agentes, pero no existe aquí un runtime de modelo y herramientas con el que validar controles de despliegue, aislamiento o autorización.
- Auditoría HTTP y memoria de aplicación: no hay servicio HTTP ni flujo de memoria de aplicación relevante que auditar.
- SLSA L3: no se encontró workflow de release/provenance/attestation de artefactos. La firma de commit no es procedencia de artefacto.
- No se ejecutaron Semgrep/CodeQL, un fuzzer generativo de protocolo ni una suite comercial ASVS. El fuzzing descrito abajo es específico, determinista y limitado.

Las conclusiones no deben presentarse como certificación formal ni como auditoría completa de un despliegue.

## 4. Metodología y comandos

Se usó una clonación temporal separada en `/tmp/ai-engineering-audit-a95896c`; el workspace compartido no se usó como fuente del commit porque no tenía remoto y estaba en un commit raíz local. El cambio preexistente del usuario en `package-lock.json` fue preservado. Las dependencias npm se instalaron con `npm ci --ignore-scripts --no-audit --no-fund`; las dependencias Python se instalaron en un entorno virtual temporal, que se movió fuera del árbol antes de ejecutar el escáner para evitar que analizara paquetes de prueba como código del repositorio.

### Comandos principales

```bash
curl -fsSL -H 'Accept: application/vnd.github+json' \
  https://api.github.com/repos/rayrabbit-ai/ai-engineering/commits/a95896c

git clone --filter=blob:none --no-checkout --depth=1 \
  https://github.com/rayrabbit-ai/ai-engineering.git /tmp/ai-engineering-audit-a95896c
git -C /tmp/ai-engineering-audit-a95896c fetch --depth=1 origin \
  a95896c074aaf0f0150bdc3cddee41fada42fc11
git -C /tmp/ai-engineering-audit-a95896c checkout --detach \
  a95896c074aaf0f0150bdc3cddee41fada42fc11

npm ci --ignore-scripts --no-audit --no-fund
npm run verify:gates:self-test
npm run verify:red:self-test
npm run verify:replay:self-test
npm run verify:guard:self-test
npm run tdd:flow:self-test
npm run spec:validate
npm run test:ts:coverage
npm run verify:gates -- --base 5abbf96552156ef3bddc97be51937bfbd2a8a241 \
  --head a95896c074aaf0f0150bdc3cddee41fada42fc11
npm run verify:replay -- --base 5abbf96552156ef3bddc97be51937bfbd2a8a241 \
  --head a95896c074aaf0f0150bdc3cddee41fada42fc11
npm audit --audit-level=high
```

Python se ejecutó con dependencias fijadas de `requirements-test.txt` dentro de un venv temporal. El intérprete disponible fue Python 3.14.2; CI declara Python 3.11.

```bash
.audit-venv/bin/python scripts/verify_gates.py --base 5abbf96552156ef3bddc97be51937bfbd2a8a241 \
  --head a95896c074aaf0f0150bdc3cddee41fada42fc11
PATH="$PWD/.audit-venv/bin:$PATH" npm run verify:gates:py:self-test
PATH="$PWD/.audit-venv/bin:$PATH" npm run test:py:coverage
.audit-venv/bin/pytest -m legacy_baseline --tb=short
.audit-venv/bin/pytest -m e2e --tb=short
npm run test:ts:baseline
npm run test:ts:e2e
npm run build
npm run audit:redteam
```

También se consultaron la API de Actions, la API de `main`, la API de branch protection y las páginas primarias de los proyectos comparados.

### Salidas reales relevantes

- Gating Node: `Analizando 1 commits ...` y `TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Node.js).`
- Gating Python: `TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Python).`
- Self-tests de gates, RED, replay, guard y TDD CLI: todos terminaron con `✅`.
- OpenSpec: `Totals: 3 passed, 0 failed (3 items)`.
- TypeScript cobertura: `Test Files 5 passed (5)`, `Tests 22 passed (22)`, `Lines 87.61%`, `Branches 77.27%`.
- Python cobertura: `17 passed, 3 deselected`; verificador independiente: líneas `87.76%` (mínimo 80%), ramas `83.87%` (mínimo 75%). Baseline: `2 passed`; E2E: `1 passed`.
- TypeScript baseline: `1` archivo, `3` tests pasados. TypeScript E2E: `1` archivo, `1` test pasado. `npm run build` terminó con código 0 (la cadena continuó hasta el comando siguiente).
- Escáner limpio: `0 hallazgos totales (0 Críticos/Altos) | 20 pruebas ejecutadas` y `REDTEAM-OK`.
- npm: `found 0 vulnerabilities` para el lockfile JS.
- Replay del rango padre..commit: `[REPLAY-OK] No hay commits 'test(red):' ... Validación omitida.` Es un skip correcto para este commit, no una validación de replay RED.
- GitHub Actions API: `total_count: 5`; los cinco checks disponibles terminaron `completed/success`.
- API de branch protection: HTTP `401`, `Requires authentication`; el Ruleset actual no pudo verificarse desde acceso anónimo.

La primera ejecución del escáner se hizo accidentalmente con el venv dentro del árbol temporal y falló con hallazgos sobre `pytest`, `pip` y symlinks del propio venv. Se retiró ese entorno y se repitió: el resultado limpio fue 20/20 y cero hallazgos. El fallo inicial se conserva aquí por reproducibilidad, no se contabiliza como hallazgo del repositorio.

## 5. Claims frente a realidad observada

| Afirmación | Evidencia | Evaluación |
|---|---|---|
| El commit remedia F-NEW-01 a F-NEW-05 | El diff incorpora controles y self-tests; los self-tests pasan. Dos mutaciones dirigidas fueron detectadas. | **Parcialmente respaldada.** La clasificación de rutas sigue permitiendo un RED desde `src/tests/`. |
| Gates TDD y SDD pasan en CI | Ambos validadores pasan localmente; los cinco checks remotos publicados son verdes; OpenSpec valida 3/3. | **Respaldada para este SHA y este conjunto de checks**, no prueba resistencia completa. |
| Cobertura mínima de líneas/ramas | TS 87.61/77.27%; Python 87.76/83.87%. | **Respaldada para las suites ejecutadas.** No equivale a cobertura de requisitos de seguridad. |
| Harness “polyglot” | Hay validadores Node/Python. 5.007 rutas deterministas comparadas dieron cero discrepancias. | **Respaldada en los helpers probados**, no para todo comportamiento del proyecto. |
| ASVS L3, OWASP LLM Top 10, ATT&CK/ATLAS o SLSA L3 | No hay matriz de controles formal, runtime LLM desplegado ni attestations de artefactos. La documentación del propio expediente dice que no es certificación. | **No afirmado ni demostrado.** No debe promocionarse como conformidad. |
| Análisis taint, fuzzing, mutación, HTTP/memoria automáticos | No hay herramientas de taint/fuzz/mutación registradas en `package.json`; nuestra campaña específica fue externa y limitada. | **No es capacidad nativa del harness.** |
| Bloqueo físico de merge | Workflow y snapshot histórico existen; API actual de branch protection devolvió 401. | **No verificable de forma independiente** con acceso anónimo. |

## 6. Matriz de hallazgos

Los valores CVSS v4.0 no se inventan cuando el alcance/contexto de despliegue no permite un vector reproducible. Las severidades siguientes son priorización técnica provisional, no puntuación CVSS oficial.

| ID | Severidad | CWE | CVSS v4.0 | Estado/alcance | Evidencia e impacto |
|---|---|---|---|---|---|
| F-01 | **Media** | CWE-693 (fallo de mecanismo de protección); CWE-184 (clasificación incompleta) | No puntuado: herramienta de proceso sin impacto de despliegue cuantificable | Residual en el validador afectado por el commit | `isTestFile` acepta rutas que contienen `/tests/`; `isProductionFile` excluye cualquier archivo así clasificado. Probe: `src/tests/calc.ts` → `isTestFile=true`, `isProductionFile=false`; secuencia RED (`src/tests/calc.ts`) + GREEN (`src/calc.ts`) devuelve `gateErrors: []`. El filtro del replay también acepta `src/tests/calc.ts`; `tsconfig` incluye `src/**/*`. El gate permite mezclar una prueba con código compilable dentro de una ruta de fuente. |
| F-02 | **Baja/Media** | CWE-693 | No puntuado; mitigación parcial en workflow | Residual, separado del alcance del diff funcional | `.json`, `.yaml`, `.yml`, `.toml`, `.txt`, `.lock` y `.github/` se excluyen de la detección de producción. Probe: `docs: update documentation` con `package.json` no genera error; también `pyproject.toml`, `requirements-test.txt`, `.github/workflows/...` se clasifican como no producción. El workflow tiene un filtro de PR para algunas rutas sensibles, pero corre **después** de `npm ci`, y la API anónima no permitió verificar branch protection. El validador de commits no es autoridad suficiente para el cambio de CI/config. |
| R-03 | Riesgo residual | CWE-829 (componente de cadena de suministro) | No puntuado: falta evidencia de secretos/permisos explotables adicionales | Diseño de CI existente, no introducido por este commit | `npm ci` se ejecuta antes del paso que bloquea cambios no autorizados de gates. Instalaciones npm pueden ejecutar scripts de lifecycle. El job limita `GITHUB_TOKEN` a `contents: read`, lo que reduce impacto; no se observó secreto inyectado. Mover la barrera antes de ejecutar código de PR o aislar estrictamente la instalación. |

### Reproducción no destructiva de F-01

```json
{
  "nestedSourcePath": "src/tests/calc.ts",
  "isTestFile": true,
  "isProductionFile": false,
  "gateErrors": [],
  "replayPathFilterMatches": true
}
```

La comprobación diferencial generó **5.007** rutas con LCG de semilla `0x0A95896C` y comparó `is_test_file`, `is_production_file` y `extract_module_name` entre Node y Python: `parityMismatches: 0`. Esto confirma paridad, no corrección de la regla.

### Pruebas de mutación

Se mutaron copias desechables de `verify-gates.mjs`, fuera del workspace:

- Desactivar el rechazo de código de producción en commits no-código: `MUTATION_KILLED: FALLÓ MITIGACIÓN F-NEW-01...`.
- Quitar `activeRedScopes.clear()`: `MUTATION_KILLED: FALLÓ MITIGACIÓN F-NEW-02...`.

Esto demuestra que los self-tests detectan la pérdida directa de esos controles, pero no cubren la variante `src/tests/` de F-01.

## 7. Comparativa del estado del arte

Metadatos de repositorios consultados en GitHub el 2026-10-16. Las estrellas y fechas son indicadores de adopción/actividad, no calidad, seguridad ni equivalencia funcional.

| Proyecto | Evidencia primaria y señales | Fortaleza relativa | Relación con este harness |
|---|---|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | MIT; 141.448 estrellas; actividad consultada 2026-10-16. Documenta SDD, integración de agentes y workflows/hooks. | Ecosistema y soporte de workflows amplio. | Alternativa más madura para estructurar el ciclo de especificación; no es sustituto demostrado del gate RED→GREEN de este repo. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT; 72.057 estrellas; actividad consultada 2026-10-16. CLI para cambios/specs, perfiles y archivo de cambios. | Gestión explícita de cambios y fuente de verdad compartida. | Complemento directo y dependencia usada aquí; no aplica por sí solo causalidad Git por módulo. |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | Apache-2.0; 3.770 estrellas; activo 2026-10-15. Plugin SDD para Antigravity/Claude Code. | Flujo de trabajo integrado al agente. | Similar en experiencia de agente; no se verificó un gate histórico RED→GREEN equivalente. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | MIT; 1.686 estrellas; activo 2026-10-15. Work packages, aceptación, review state y worktrees aislados. | Gobernanza organizacional y coordinación multiagente, con revisión humana. | El comparable más cercano en workflow gobernado; su enfoque es work-package/aceptación, no la misma política de commits. |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | Apache-2.0; 5.758 estrellas; checks de salud de seguridad OSS. | Señales automatizadas de postura de repositorio y supply chain. | Complementario; no implementa SDD/TDD. El README muestra badge SLSA 3 del propio proyecto, no de este repo. |
| [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator) | Apache-2.0; 604 estrellas; generador de provenance para GitHub Actions. | Provenance de builds y artefactos. | Complemento para atestaciones; no reemplaza specs ni gates TDD. No se encontró configuración equivalente en este commit. |

**Conclusión comparativa:** no hay un ganador único en todas las categorías. Este repo se diferencia por comprobar secuencias de commits, pero presenta menos madurez/adopción observable y no aporta por sí mismo controles formales ASVS, análisis de código completo o provenance SLSA. Una arquitectura de referencia combina Spec Kit u OpenSpec/Spec Kitty para el flujo de trabajo, gates de commits corregidos, OpenSSF Scorecard/CodeQL para seguridad del repositorio y attestations de GitHub/SLSA para artefactos.

## 8. Recomendaciones de remediación

1. Hacer que `isTestFile` exija una raíz de test reconocida y/o nombre de test inequívoco; no inferir prueba solo por un segmento `/tests/` dentro de `src/`. Aplicar la misma política en Node, Python, verificador RED y replay.
2. Agregar regresiones que prueben `src/tests/<module>.ts`, `src/test_<module>.py` y archivos ejecutables mixtos. Exigir que el replay falle si un `test(red)` contiene una ruta compilada por `src/**/*` que no sea test válido.
3. Separar `isProductionCode` de `isCriticalConfiguration`; aplicar prefijos autorizados y ownership/review a `.github/workflows`, `package.json`, lockfiles y configuración Python.
4. Ejecutar el filtro de cambios sensibles antes de instalar dependencias del PR; para trabajo no confiable, usar `persist-credentials: false`, permisos mínimos, sin secretos y jobs aislados.
5. Verificar branch ruleset con credenciales/autorización y guardar evidencia reciente. Para declarar SLSA, configurar build provenance verificable y attestations, no basarse en firma del commit.
6. Si el objetivo es ASVS L3 o seguridad de aplicaciones con LLM, crear un alcance real que incluya aplicación, modelo, herramientas, límites de confianza, controles y evidencias por requisito; no trasladar esa etiqueta a esta plantilla sin assessment formal.

## 9. Dictamen oficial

# **RECHAZADO**

El commit `a95896c` está firmado y sus checks actuales pasan; los cambios principales de hardening tienen tests sensibles a mutación. Aun así, existe una evasión reproducible de la garantía central RED/producción y una clasificación incompleta de configuración crítica. Por tanto, **no apruebo el harness como enforcement integral ni como evidencia de ASVS L3/SLSA L3**, y no recomiendo usar ese nivel de seguridad en claims externos hasta corregir F-01, cerrar F-02 y verificar el ruleset real.

Este dictamen no significa que el commit sea malicioso, que las dependencias npm estén vulnerables ni que se haya observado explotación. Significa que la seguridad declarada excede la resistencia comprobada en el alcance auditado.

## 10. Fuentes

- Commit y firma: https://github.com/rayrabbit-ai/ai-engineering/commit/a95896c074aaf0f0150bdc3cddee41fada42fc11
- Workflow auditado: https://github.com/rayrabbit-ai/ai-engineering/blob/a95896c074aaf0f0150bdc3cddee41fada42fc11/.github/workflows/gate-validator.yml
- Validador Node: https://github.com/rayrabbit-ai/ai-engineering/blob/a95896c074aaf0f0150bdc3cddee41fada42fc11/scripts/verify-gates.mjs
- Validador Python: https://github.com/rayrabbit-ai/ai-engineering/blob/a95896c074aaf0f0150bdc3cddee41fada42fc11/scripts/verify_gates.py
- Replay RED: https://github.com/rayrabbit-ai/ai-engineering/blob/a95896c074aaf0f0150bdc3cddee41fada42fc11/scripts/verify-historical-replay.mjs
- Configuración de compilación: https://github.com/rayrabbit-ai/ai-engineering/blob/a95896c074aaf0f0150bdc3cddee41fada42fc11/tsconfig.json
- Checks CI: https://github.com/rayrabbit-ai/ai-engineering/actions/runs/38834497334
- Proyectos: https://github.com/github/spec-kit, https://github.com/Fission-AI/OpenSpec, https://github.com/gemini-cli-extensions/conductor, https://github.com/spec-kitty/spec-kitty, https://github.com/ossf/scorecard, https://github.com/slsa-framework/slsa-github-generator
