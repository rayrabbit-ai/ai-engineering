# Informe forense de seguridad / Security Forensic Report

**Repositorio / Repository:** [rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering)
**Commit objetivo / Target commit:** [`67a2eef8b986b7655c2f3386bfdebc87a47dc6c5`](https://github.com/rayrabbit-ai/ai-engineering/commit/67a2eef8b986b7655c2f3386bfdebc87a47dc6c5)
**Rama comprobada / Branch checked:** `main`
**Fecha / Date:** 2026-10-16
**Dictamen / Verdict:** **APROBADO / APPROVED**, únicamente para las afirmaciones funcionales y acotadas que el repositorio hace sobre su harness. **No es una certificación de seguridad ni una aprobación ASVS L3 o SLSA L3.**

---

# Español

## 1. Resumen ejecutivo

Se auditó el `main` publicado en `67a2eef8b986b7655c2f3386bfdebc87a47dc6c5`, commit firmado cuya verificación de GitHub devolvió `verified: true`, `reason: valid`. Al cierre, `git ls-remote` confirmó el mismo SHA en `refs/heads/main`. El objeto tiene como padre `a95896c074aaf0f0150bdc3cddee41fada42fc11` y el mensaje `chore(hardening): enforce single-source path policy, critical config gates, and runtime coherence (#21)`.

Los cinco checks de protección obligatorios están configurados en un ruleset activo y todos los diez checks que devolvió la API para el SHA terminaron en `success`. Los self-tests del harness, la coherencia política/runtime, OpenSpec, el build, las suites TypeScript y Python, las coberturas, E2E, `npm audit` y el scanner interno pasaron en las pruebas reproducibles indicadas abajo. Dos mutaciones dirigidas fueron detectadas por los self-tests y un fuzz diferencial de 10.067 rutas produjo cero discrepancias entre Node y Python.

**Resultado:** las afirmaciones principales del README sobre un template SDD/TDD con validadores de commits en CI y bloqueo de merges configurado en GitHub son ciertas para este SHA. El propio expediente delimita correctamente lo que no ofrece: no certifica OWASP/SLSA, no implementa taint analysis ni fuzzing generativo, no tiene pruebas de mutación automáticas y no es una aplicación HTTP con memoria sensible que pueda someterse a pruebas de runtime.

Hay una brecha residual de bajo impacto actual: configuraciones nuevas como `jest.config.ts` no se clasifican como código ni como configuración crítica; el evaluador acepta sintéticamente ese archivo dentro de un commit `test(red)`. No afecta al runner Vitest actualmente configurado, que sí queda protegido, pero reduce la cobertura de seguridad del template cuando se adopten herramientas nuevas. No se encontró una vulnerabilidad explotable de severidad alta/crítica en el snapshot auditado.

## 2. Procedencia e integridad

| Comprobación | Evidencia observada |
|---|---|
| `main` remoto | `git ls-remote https://github.com/rayrabbit-ai/ai-engineering.git refs/heads/main` devolvió `67a2eef8b986b7655c2f3386bfdebc87a47dc6c5`. Se repitió al cierre con el mismo resultado. |
| Firma | API de GitHub para el commit: `verified=true`, `reason=valid`, `verified_at=2026-10-16T04:09:54Z`. Esto verifica el objeto firmado según GitHub; no es provenance/attestation SLSA de un artefacto. |
| Historial | Padre: `a95896c074aaf0f0150bdc3cddee41fada42fc11`; mensaje de hardening indicado arriba; timestamp API `2026-10-16T04:09:54Z`. |
| Estado local | El workspace no tenía remoto configurado. Su `HEAD` local `c275fd6` es una raíz sintética, pero `git diff --quiet c275fd6^{tree} FETCH_HEAD^{tree}` terminó con `tree_match_exit=0`: los árboles versionados son idénticos al commit upstream. |
| Cambio previo del operador | `git status --short --branch` mostró `M package-lock.json`. El diff elimina metadatos npm (`peer` y campos `libc`), no versiones ni integridades. No se descartó ni se sobrescribió. Para npm audit y scanner se usó además una worktree limpia del SHA exacto. |
| CI remoto | La API de GitHub devolvió `total_count: 10`; los diez checks concluyeron `completed/success`, incluidos gates, OpenSpec, TypeScript, Python, scanner y cuatro entradas de Dependabot. |
| Protección de merge | `GET /repos/rayrabbit-ai/ai-engineering/rulesets` devolvió HTTP 200. Ruleset `25150565`, nombre `main`, destino `branch`, enforcement `active`; actualizado `2026-10-16T04:09:56.446Z`. |

El ruleset exige una aprobación, revisión de CODEOWNERS y descarta aprobaciones obsoletas tras un push; exige los cinco status checks que documenta el repositorio; requiere historial lineal; bloquea borrado y force-push. La ruta legacy `/branches/main/protection` respondió HTTP 401, pero el endpoint de Rulesets sí permitió verificar la configuración efectiva pertinente.

## 3. Alcance y metodología

El alcance fue el árbol exacto de `67a2eef`, su workflow, reglas del harness, dependencias y configuración visible de GitHub. Se preservó el workspace del operador. Las pruebas de mutación se ejecutaron en una worktree temporal, que se retiró después.

**Versiones y límites del entorno:** Node `v24.21.0`, npm `11.19.0`, Python `3.14.2`; el CI del repo especifica Node 22 y Python 3.11. La API de Actions confirmó que esos jobs terminaron verdes para el commit. El pytest global inicial no tenía `pytest-cov`; se instaló `requirements-test.txt` fijado en `/tmp/ai-engineering-audit-67a2eef-venv` y las pruebas Python se repitieron allí. No se instaló tooling dentro del workspace.

### Comandos ejecutados y salidas representativas

```text
git ls-remote https://github.com/rayrabbit-ai/ai-engineering.git refs/heads/main
67a2eef8b986b7655c2f3386bfdebc87a47dc6c5 refs/heads/main

git diff --quiet c275fd6^{tree} FETCH_HEAD^{tree}; printf 'tree_match_exit=%s\n' "$?"
tree_match_exit=0

git status --short --branch
## main
 M package-lock.json
```

Se obtuvo el commit sin checkout de la rama del usuario:

```bash
git fetch --no-tags https://github.com/rayrabbit-ai/ai-engineering.git 67a2eef8b986b7655c2f3386bfdebc87a47dc6c5
git show -s --format='%H%n%P%n%ad%n%s' --date=iso-strict FETCH_HEAD
```

Self-tests del validador, verificador RED, replay, coherencia de política, guard y CLI TDD:

```text
npm run verify:gates:self-test            ✅ Todas las pruebas ... pasaron exitosamente.
npm run verify:red:self-test              ✅ Autochequeo de verificador RED aprobado.
npm run verify:replay:self-test            ✅ Todas las pruebas internas ... pasaron con éxito.
npm run verify:policy:self-test            ✅ Detecta divergencia entre política y configuración del runtime.
npm run verify:guard:self-test             ✅ Todas las pruebas adversariales del Guard ... pasaron exitosamente.
npm run tdd:flow:self-test                 ✅ Todas las pruebas internas de tdd-flow pasaron con éxito.
python scripts/verify_gates.py --self-test ✅ Todas las aserciones internas y pruebas adversariales pasaron.
python scripts/verify_red_failure.py --self-test ✅ Autochequeo de verificador RED en Python aprobado.
```

Validaciones de runtime y suites:

```text
npm run verify:policy
[POLICY-COHERENCE] Raíces compiladas=src | runner=tests | cobertura=src
[POLICY-COHERENCE] ✅ La política de rutas es coherente con tsconfig, vitest, pytest y cobertura.

npm run guard
[GUARD-AGENT] ✅ Todos los contratos, 15 invariantes (EN/ES), cláusulas SDD y workflows están protegidos e intactos.

npm run spec:validate
Totals: 4 passed, 0 failed (4 items)

npm run build
> tsc
(código de salida 0)

npm run test:ts:baseline
Test Files 1 passed (1); Tests 3 passed (3)

npm run test:ts:coverage
Test Files 5 passed (5); Tests 22 passed (22)
Lines 87.61%; Branches 77.27%; Functions 100%

npm run test:ts:e2e
Test Files 1 passed (1); Tests 1 passed (1)

pytest -m legacy_baseline --tb=short
2 passed, 18 deselected

pytest -m 'unit or integration' --cov=src --cov-branch ...
17 passed, 3 deselected
check_python_coverage.py: líneas 87.76% (mín. 80%); ramas 83.87% (mín. 75%)

pytest -m e2e --tb=short
1 passed, 19 deselected
```

La primera ejecución de pytest con cobertura en el Python global falló con `unrecognized arguments: --cov...` porque ese entorno no tenía `pytest-cov`. Tras crear el venv temporal e instalar los pins declarados, las suites anteriores pasaron. No se contabiliza como defecto del código; sí como diferencia del entorno local.

Gates sobre el rango real padre..commit:

```text
npm run verify:gates -- --base FETCH_HEAD^ --head FETCH_HEAD --allow-dirty
⚠️ ADVERTENCIA ... M package-lock.json
[GATE-VALIDATOR] Analizando 1 commits ...
✅ TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Node.js).

python scripts/verify_gates.py --base FETCH_HEAD^ --head FETCH_HEAD --allow-dirty
⚠️ ADVERTENCIA ... M package-lock.json
[GATE-VALIDATOR] Analizando 1 commits ...
[GATE-OK] TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Python).

npm run verify:replay -- --base FETCH_HEAD^ --head FETCH_HEAD
[REPLAY-OK] No hay commits 'test(red)' en el rango ... Validación omitida.
```

El replay fue omitido correctamente: este commit es `chore(hardening)` y no contiene commits RED en su rango. Los self-tests del replay sí pasaron; por tanto, el resultado no debe describirse como replay de un RED de este commit.

Dependencias y scanner sobre una worktree limpia del SHA:

```text
npm audit --audit-level=high
found 0 vulnerabilities

node scripts/redteam-audit.mjs
[D1..D10] ...
RESUMEN FINAL: 0 hallazgos totales (0 Críticos/Altos) | 24 pruebas ejecutadas.
✅ [REDTEAM-OK] Cero hallazgos Críticos/Altos.
```

El scanner es explícitamente heurístico. Sus 24 chequeos no equivalen a análisis taint, fuzzing generativo, auditoría ASVS o análisis integral de dependencias Python.

### Fuzzing diferencial y mutación

Se compararon `isTestFile`, `isProductionFile` e `isCriticalConfigFile` entre Node y Python con los 67 fixtures versionados y 10.000 rutas generadas con LCG determinista, semilla `0x067a2eef`. El corpus incluyó raíces productivas y de test, rutas excluidas, mayúsculas, separadores Windows, `..`, extensiones y homoglifos.

```json
{"fixturePaths":67,"generatedPaths":10000,"compared":10067,"parityMismatches":0}
```

Esto demuestra paridad entre implementaciones para ese corpus, no que cada clasificación sea correcta; por eso se probaron dos mutantes en una copia temporal:

1. Se eliminó el rechazo de rutas `src/` en `isTestFile`: el self-test falló por 3/67 fixtures, incluyendo `src/tests/calc.test.ts`, `src/test_calc.py` y `src/calc.spec.ts`. **Mutante detectado.**
2. Se desactivó la detección de configuración crítica: el self-test falló por 17/67 fixtures, incluyendo `scripts/`, `.github/`, `package.json`, lockfiles, `pyproject.toml` y `vitest.config.ts`. **Mutante detectado.**

No se usó un marco general de mutation testing ni se calculó mutation score; son dos mutaciones dirigidas a las garantías modificadas por este commit.

## 4. Afirmaciones frente a evidencia

| Afirmación examinada | Evidencia | Evaluación |
|---|---|---|
| Harness determinista SDD + TDD con OpenSpec | `openspec validate --all`: 4/4; validadores JS/Python pasan; ambos validan el commit actual. | **Respaldada en este repo y snapshot.** No implica que cada modelo respete instrucciones fuera de CI. |
| Compuertas TDD acopladas al scope y bloqueadas por CI | Self-tests adversariales, gates de ambos lenguajes, historial de Actions verde y ruleset activo con ambos status checks. | **Respaldada para los tipos de archivo/configuración actualmente contemplados.** El replay del delta actual se omitió porque no contiene RED. |
| Merge bloqueado físicamente | Ruleset activo de GitHub requiere los cinco checks, 1 aprobación y CODEOWNERS; prohíbe force-push y borrado. | **Respaldada al momento de consulta.** El bloqueo lo implementa GitHub Rulesets, no el código local por sí solo. |
| Compatibilidad TypeScript/Python | Autochequeos en ambos lenguajes, suites, cobertura, E2E y comparación diferencial sin discrepancias. | **Respaldada para las rutas y runtimes configurados.** Python local fue 3.14; Actions valida Python 3.11. |
| Escáner interno encuentra cero problemas | Resultado `0` hallazgos altos/críticos, 24 chequeos; npm audit exacto `0 vulnerabilities`. | **Resultado reproducible, no garantía de ausencia de vulnerabilidades.** Solo `npm audit` cubre advisories npm; no se ejecutó auditor de paquetes Python. |
| Mitiga “vibe coding” / HITL / invariantes de agente | Reglas, prompt adapters y workflows describen el proceso; una parte está en CI y otra depende del comportamiento del agente/review humano. | **Parcial, como política/proceso.** No es una sandbox ni un control técnico universal en Antigravity, Cursor o Claude. |
| OWASP ASVS L3, OWASP LLM Top 10, MITRE ATLAS o SLSA L3 | El expediente del proyecto niega explícitamente certificación formal y provenance; no existe runtime de modelo/servicio web ni release workflow con attestations en el alcance revisado. | **No afirmado ni demostrado; correctamente delimitado en la documentación.** No debe venderse como conformidad. |
| Análisis taint, fuzzing/mutación automáticos, auditoría HTTP/memoria | La documentación y el propio scanner dicen que no se implementan esas capacidades; esta auditoría hizo solo fuzz y mutaciones externos y acotados. | **No es capacidad nativa del repo.** No hay servicio HTTP o memoria sensible de aplicación para probar dinámicamente. |

## 5. Matriz de hallazgos

No se confirmó vulnerabilidad explotable de severidad alta o crítica en este SHA. Se asigna un hallazgo de endurecimiento con alcance explícito; CVSS no se fuerza cuando no hay una explotación en un despliegue activo.

| ID | Severidad / CWE | CVSS v4.0 | Estado | Evidencia e impacto |
|---|---|---|---|---|
| F-01 | **Baja, brecha de cobertura de política**. CWE-693, fallo potencial del mecanismo de protección al extenderlo. | No asignado: el archivo de configuración de ejemplo no existe ni está activo en este repo. | **Reproducible como límite de extensibilidad; no es exploit del runtime actual.** | La política en `scripts/path-policy.json` tiene `configFilePatterns` genérico para `*.config.*`, pero `criticalConfigPatterns` solo contempla explícitamente configuraciones seleccionadas, incluida `vitest.config.*`. La prueba sintética a `validateCommitList` mostró: `vitest.config.ts` → `isCriticalConfig=true`, 1 error; `jest.config.ts` → `isCriticalConfig=false`, 0 errores, incluso dentro de un commit `test(red)` con `tests/ts/unit/calc.test.ts`. El repo actual no contiene ni ejecuta Jest/Vite/ESLint/Webpack. Si un consumidor activa uno de esos runners sin ampliar política y coherencia runtime, un agente podría alterar su config de test sin que este gate la trate como config crítica. |
| R-01 | Riesgo residual de supply chain, no vulnerabilidad confirmada. | No aplica. | **Fuera de SLSA L3.** | El workflow corre `npm audit` pero no un audit equivalente de dependencias Python ni una instalación con hashes `--require-hashes`. Los pins directos de `requirements-test.txt` son útiles, pero no sustituyen provenance ni lockfile Python hash-pinned. No se observó dependencia Python vulnerable en esta revisión porque no se ejecutó `pip-audit`/equivalente. |

No se observaron endpoints HTTP, autenticación, sesiones o datos sensibles en memoria que permitan un test de explotación de aplicación. El `--probe-http` opcional del scanner solo consulta la API pública de GitHub; no es prueba de un servicio desplegado y no se ejecutó como tal. Las acciones del workflow están fijadas por SHA y el token global declara `contents: read`, pero esas medidas no constituyen provenance de artefactos.

## 6. Comparativa del ecosistema

Metadatos consultados por API de GitHub el 2026-10-16. Estrellas/actividad son señales de adopción, no una puntuación de seguridad ni equivalencia directa.

| Proyecto | Señal observada | Es mejor/más fuerte en | Relación con este harness |
|---|---|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | MIT; 141.462 estrellas; actualizado 2026-10-15. | Toolkit SDD amplio, presencia/ecosistema y flujos centrados en especificación. | Alternativa más madura para adopción SDD; no se verificó un gate Git de causalidad RED→GREEN equivalente. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT; 72.067 estrellas; actualizado 2026-10-15. | Modelado de cambios/specs y ciclo de propuesta/aplicación/archivo. | Dependencia directa aquí y complemento natural; no es por sí solo un validador causal de commits. |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | Apache-2.0; 3.770 estrellas; actualización observada 2026-09-01. | Integración de protocolo SDD como plugin para Antigravity y Claude Code. | Más específico en experiencia integrada al agente; no sustituye el gate de este repo. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | MIT; 1.686 estrellas; actualizado 2026-10-15. | Workflows de gobernanza, coordinación multiagente y ciclo `spec → plan → tasks → review → accept`. | Comparable cercano para proceso de ingeniería gobernado; no persigue la misma semántica de commits RED/GREEN. |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | Apache-2.0; 5.759 estrellas; actualizado 2026-10-15. | Métricas automatizadas de postura de seguridad del repositorio; publica integración CodeQL. | Complemento de seguridad del proyecto, no reemplazo de OpenSpec/TDD. |
| [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator) | Apache-2.0; 604 estrellas; actualizado 2026-08-07. | Provenance de builds GitHub Actions orientada a SLSA. | Complemento requerido si se quieren declaraciones verificables de provenance; no implementa SDD/TDD. |

**Síntesis:** este repo es distintivo por validar la historia Git y acoplar RED/GREEN a módulos, no por cobertura amplia de AppSec ni certificaciones. Spec Kit/OpenSpec/Spec Kitty/Conductor son más fuertes en madurez o experiencia SDD; Scorecard y SLSA Generator son mejores en sus dominios de supply chain. Una arquitectura más completa los combinaría en lugar de presentar uno como sustituto de todos.

## 7. Recomendaciones

1. Ampliar `criticalConfigPatterns` y los fixtures a las configuraciones de test/build que se soportarán; alternativamente fallar de forma cerrada ante tipos de runner desconocidos. Añadir un self-test que demuestre que `jest.config.*`, `playwright.config.*`, `vite.config.*` y `eslint.config.*` se bloquean cuando sean activados.
2. Extender `verify-policy-coherence.mjs` para derivar los runners realmente configurados, incluyendo cualquier runner que se agregue, en vez de asumir Vitest/Pytest.
3. Si el repo publica paquetes/artefactos, agregar provenance y verificación de attestation (SLSA/in-toto/Witness) y documentar qué sujeto/digest está cubierto. Hoy no hay evidencia de release provenance.
4. Añadir auditoría de dependencias Python y considerar pins transitivos con hashes; reportar por separado cobertura de npm y pip.
5. Mantener los claims actuales acotados. Una declaración ASVS L3/LLM Top 10/ATLAS requiere un alcance de sistema desplegado, matriz de controles y evidencias por requisito; no se obtiene de este harness ni de 24 chequeos heurísticos.

## 8. Dictamen oficial

# **APROBADO**

Aprobado **solo respecto de los claims explícitos y acotados**: template de ingeniería con OpenSpec, gates causales Node/Python, suites/cobertura y bloqueo real de PR configurado en el ruleset activo de `main`. El commit actual está firmado como válido por GitHub, los checks remotos son verdes y las pruebas locales citadas son reproducibles.

Este dictamen **no** declara el repositorio libre de vulnerabilidades, certificado ASVS L3, compatible con OWASP LLM Top 10/MITRE ATLAS, conforme a SLSA L3 ni protegido frente a toda configuración futura. La brecha F-01 debe cerrarse antes de afirmar protección genérica sobre runners/configuraciones no contemplados; el riesgo de supply chain Python requiere controles adicionales si el proyecto reclama cobertura integral.

## 9. Fuentes

- [Commit 67a2eef y verificación de firma](https://github.com/rayrabbit-ai/ai-engineering/commit/67a2eef8b986b7655c2f3386bfdebc87a47dc6c5)
- [Workflow de gates](../../.github/workflows/gate-validator.yml)
- [Política única de rutas](../../scripts/path-policy.json)
- [Validador de commits Node](../../scripts/verify-gates.mjs)
- [Validador de commits Python](../../scripts/verify_gates.py)
- [Verificador de coherencia runtime](../../scripts/verify-policy-coherence.mjs)
- [Scanner heurístico](../../scripts/redteam-audit.mjs)
- [Límites declarados del expediente](README.md)
- [Ruleset GitHub consultado](https://api.github.com/repos/rayrabbit-ai/ai-engineering/rulesets/25150565)
- [GitHub Spec Kit](https://github.com/github/spec-kit), [OpenSpec](https://github.com/Fission-AI/OpenSpec), [Conductor](https://github.com/gemini-cli-extensions/conductor), [Spec Kitty](https://github.com/spec-kitty/spec-kitty), [OpenSSF Scorecard](https://github.com/ossf/scorecard), [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator)

---

# English

## 1. Executive summary

The audit target was the published `main` at `67a2eef8b986b7655c2f3386bfdebc87a47dc6c5`, a commit GitHub reports as cryptographically verified (`verified: true`, `reason: valid`). A final `git ls-remote` returned the same SHA for `refs/heads/main`. Its parent is `a95896c074aaf0f0150bdc3cddee41fada42fc11`; the commit message is `chore(hardening): enforce single-source path policy, critical config gates, and runtime coherence (#21)`.

The five mandatory branch-protection checks are present in an active GitHub ruleset, and all ten checks returned by the API for this SHA completed successfully. Harness self-tests, policy/runtime coherence, OpenSpec, the TypeScript build, TypeScript and Python suites, coverage, E2E, `npm audit`, and the internal scanner passed as detailed below. Two targeted mutations were killed by the self-tests, and differential fuzzing across 10,067 paths found no Node/Python classification mismatches.

**Result:** the README's principal claims about an SDD/TDD template with CI commit validators and configured GitHub merge blocking are accurate for this SHA. The repository's own audit dossier correctly limits what it provides: it is not OWASP/SLSA certified, has no taint-analysis engine or generative fuzzer, no automatic mutation-testing framework, and no HTTP application or sensitive application memory for runtime testing.

A low-impact residual remains: new configurations such as `jest.config.ts` are classified as neither production code nor critical configuration; the commit evaluator synthetically accepts that file in a `test(red)` commit. The currently configured Vitest runner is protected, so this does not affect the present runtime, but it reduces the template's guarantees when consumers add tooling. No exploitable high/critical vulnerability was confirmed in the audited snapshot.

## 2. Provenance and integrity

| Check | Observed evidence |
|---|---|
| Remote `main` | `git ls-remote https://github.com/rayrabbit-ai/ai-engineering.git refs/heads/main` returned `67a2eef8b986b7655c2f3386bfdebc87a47dc6c5`; the final check returned the same value. |
| Signature | GitHub commit API: `verified=true`, `reason=valid`, `verified_at=2026-10-16T04:09:54Z`. This verifies the signed commit object according to GitHub; it is not SLSA artifact provenance or an attestation. |
| History | Parent `a95896c074aaf0f0150bdc3cddee41fada42fc11`; hardening message above; API timestamp `2026-10-16T04:09:54Z`. |
| Local state | The workspace had no remote configured. Local `HEAD` `c275fd6` is a synthetic root commit, but `git diff --quiet c275fd6^{tree} FETCH_HEAD^{tree}` returned `tree_match_exit=0`: its tracked tree is identical to the upstream commit. |
| Pre-existing operator change | `git status --short --branch` showed `M package-lock.json`. Its diff removes npm metadata (`peer` and `libc` fields), not package versions or integrity values. It was neither discarded nor overwritten. `npm audit` and the scanner were also run in a clean worktree at the exact SHA. |
| Remote CI | GitHub API returned `total_count: 10`; all ten checks concluded `completed/success`, including gates, OpenSpec, TypeScript, Python, scanner, and four Dependabot entries. |
| Merge protection | `GET /repos/rayrabbit-ai/ai-engineering/rulesets` returned HTTP 200. Ruleset `25150565`, named `main`, targets `branch`, has `active` enforcement, and was updated at `2026-10-16T04:09:56.446Z`. |

The active ruleset requires one approval, CODEOWNERS review, and dismissal of stale approvals after a push; it requires the five documented status checks; it requires linear history; and it blocks deletion and force-push. The legacy `/branches/main/protection` endpoint returned HTTP 401, but the Rulesets API exposed the effective configuration relevant to this audit.

## 3. Scope and methodology

The scope covered the exact `67a2eef` tree, its workflow, harness rules, dependencies, and visible GitHub settings. The operator's workspace was preserved. Mutations ran in a temporary worktree, which was removed afterward.

**Environment and limitations:** Node `v24.21.0`, npm `11.19.0`, Python `3.14.2`; repository CI declares Node 22 and Python 3.11. GitHub Actions API showed those jobs passing for the commit. The global pytest initially lacked `pytest-cov`; the pinned `requirements-test.txt` was installed in `/tmp/ai-engineering-audit-67a2eef-venv`, and Python tests were repeated there. No project dependencies were installed into the shared workspace.

### Commands run and representative actual output

```text
git ls-remote https://github.com/rayrabbit-ai/ai-engineering.git refs/heads/main
67a2eef8b986b7655c2f3386bfdebc87a47dc6c5 refs/heads/main

git diff --quiet c275fd6^{tree} FETCH_HEAD^{tree}; printf 'tree_match_exit=%s\n' "$?"
tree_match_exit=0

git status --short --branch
## main
 M package-lock.json
```

The target commit was fetched without checking out over the user's branch:

```bash
git fetch --no-tags https://github.com/rayrabbit-ai/ai-engineering.git 67a2eef8b986b7655c2f3386bfdebc87a47dc6c5
git show -s --format='%H%n%P%n%ad%n%s' --date=iso-strict FETCH_HEAD
```

Validator, RED verifier, replay, policy coherence, guard, and TDD CLI self-tests:

```text
npm run verify:gates:self-test            ✅ All tests ... passed successfully.
npm run verify:red:self-test              ✅ RED verifier self-test passed.
npm run verify:replay:self-test            ✅ All replay-engine self-tests passed.
npm run verify:policy:self-test            ✅ Runtime/policy divergence was detected.
npm run verify:guard:self-test             ✅ All adversarial Guard tests passed.
npm run tdd:flow:self-test                 ✅ All tdd-flow internal tests passed.
python scripts/verify_gates.py --self-test ✅ All internal assertions and adversarial tests passed.
python scripts/verify_red_failure.py --self-test ✅ Python RED verifier self-test passed.
```

Runtime and suite checks:

```text
npm run verify:policy
[POLICY-COHERENCE] Compiled roots=src | runner=tests | coverage=src
[POLICY-COHERENCE] ✅ Route policy matches tsconfig, vitest, pytest, and coverage.

npm run guard
[GUARD-AGENT] ✅ All contracts, 15 invariants (EN/ES), SDD clauses, and workflows are protected.

npm run spec:validate
Totals: 4 passed, 0 failed (4 items)

npm run build
> tsc
(exit code 0)

npm run test:ts:baseline
Test Files 1 passed (1); Tests 3 passed (3)

npm run test:ts:coverage
Test Files 5 passed (5); Tests 22 passed (22)
Lines 87.61%; Branches 77.27%; Functions 100%

npm run test:ts:e2e
Test Files 1 passed (1); Tests 1 passed (1)

pytest -m legacy_baseline --tb=short
2 passed, 18 deselected

pytest -m 'unit or integration' --cov=src --cov-branch ...
17 passed, 3 deselected
check_python_coverage.py: lines 87.76% (min. 80%); branches 83.87% (min. 75%)

pytest -m e2e --tb=short
1 passed, 19 deselected
```

The first global Python coverage run failed with `unrecognized arguments: --cov...` because that environment did not have `pytest-cov`. After creating the temporary virtual environment and installing the declared pins, the suites passed. This is not counted as a repository code defect; it is an environment discrepancy.

Commit gates on the actual parent-to-target range:

```text
npm run verify:gates -- --base FETCH_HEAD^ --head FETCH_HEAD --allow-dirty
⚠️ WARNING ... M package-lock.json
[GATE-VALIDATOR] Analyzing 1 commit ...
✅ ALL COMMIT GATES APPROVED (Node.js).

python scripts/verify_gates.py --base FETCH_HEAD^ --head FETCH_HEAD --allow-dirty
⚠️ WARNING ... M package-lock.json
[GATE-VALIDATOR] Analyzing 1 commit ...
[GATE-OK] ALL COMMIT GATES APPROVED (Python).

npm run verify:replay -- --base FETCH_HEAD^ --head FETCH_HEAD
[REPLAY-OK] No 'test(red)' commits in range ... Validation skipped.
```

Replay was correctly skipped because this is a `chore(hardening)` commit and its range contains no RED commit. Replay self-tests passed; this must not be described as a RED replay for the current SHA.

Dependency audit and scanner on a clean worktree at the exact SHA:

```text
npm audit --audit-level=high
found 0 vulnerabilities

node scripts/redteam-audit.mjs
[D1..D10] ...
FINAL SUMMARY: 0 total findings (0 Critical/High) | 24 checks executed.
✅ [REDTEAM-OK] No Critical/High findings.
```

The scanner explicitly describes itself as heuristic. Its 24 checks are not taint analysis, generative fuzzing, ASVS verification, or a comprehensive Python dependency audit.

### Differential fuzzing and mutation

`isTestFile`, `isProductionFile`, and `isCriticalConfigFile` were compared between Node and Python using the 67 versioned fixtures and 10,000 paths generated by a deterministic LCG with seed `0x067a2eef`. The corpus included production/test roots, excluded roots, uppercase paths, Windows separators, `..`, extensions, and homoglyphs.

```json
{"fixturePaths":67,"generatedPaths":10000,"compared":10067,"parityMismatches":0}
```

This establishes implementation parity for the corpus, not correctness of every classification; therefore two targeted mutants were tested in a temporary worktree:

1. Removed the rejection of `src/` paths from `isTestFile`: self-test failed on 3/67 fixtures, including `src/tests/calc.test.ts`, `src/test_calc.py`, and `src/calc.spec.ts`. **Mutant killed.**
2. Disabled critical-configuration detection: self-test failed on 17/67 fixtures, including `scripts/`, `.github/`, `package.json`, lockfiles, `pyproject.toml`, and `vitest.config.ts`. **Mutant killed.**

No general mutation-testing framework was run, and no mutation score was calculated; these were two targeted mutations of guarantees changed by this commit.

## 4. Claims versus evidence

| Claim examined | Evidence | Assessment |
|---|---|---|
| Deterministic SDD + TDD harness with OpenSpec | `openspec validate --all`: 4/4; JS/Python validators pass and both validate the current commit. | **Supported for this repository and snapshot.** It does not mean every model follows the instructions outside CI. |
| Scope-coupled TDD gates enforced by CI | Adversarial self-tests, both validators, green Actions history, and an active ruleset requiring both gate checks. | **Supported for currently covered file/config types.** Replay of this exact delta skipped because it contains no RED commit. |
| Physical merge blocking | Active GitHub ruleset requires the five checks, one CODEOWNERS approval, linear history, and prohibits force-push/deletion. | **Supported at query time.** GitHub Rulesets supplies physical enforcement; local code alone does not. |
| TypeScript/Python support | Both language self-tests, suites, coverage, E2E, and differential classifications passed. | **Supported for configured roots/runtimes.** Local Python was 3.14; Actions validated Python 3.11. |
| Internal scanner finds zero issues | Reproduced `0` Critical/High findings across 24 checks; exact-lock npm audit found `0 vulnerabilities`. | **Reproducible result, not proof of no vulnerabilities.** `npm audit` covers npm advisories only; no Python package auditor was run. |
| “Curb vibe coding” / HITL / agent invariants | Rules, prompt adapters, and workflows describe the process; some parts are CI-enforced, others depend on agent behavior and human review. | **Partially supported as policy/process.** Not a sandbox or universal technical control for Antigravity, Cursor, or Claude. |
| OWASP ASVS L3, OWASP LLM Top 10, MITRE ATLAS, or SLSA L3 | The project's dossier explicitly disclaims formal certification and provenance; no deployed model/web service or attested release pipeline was in scope. | **Not claimed or demonstrated; documentation appropriately limits scope.** It must not be marketed as conformance. |
| Taint analysis, automated fuzz/mutation, HTTP/memory audit | Project docs and scanner say these capabilities are not implemented; this audit ran only limited external fuzzing and mutations. | **Not native repo capabilities.** No application HTTP service or sensitive application-memory runtime exists for dynamic testing. |

## 5. Finding matrix

No exploitable high or critical vulnerability was confirmed in this SHA. One explicitly scoped hardening finding is reported; CVSS is not forced when there is no exploit against an active deployment.

| ID | Severity / CWE | CVSS v4.0 | Status | Evidence and impact |
|---|---|---|---|---|
| F-01 | **Low, policy coverage gap.** CWE-693, potential protection-mechanism failure when extending the harness. | Not assigned: the example configuration file is absent and inactive in this repository. | **Reproducible extensibility limitation; not an exploit of the current runtime.** | `scripts/path-policy.json` has generic `configFilePatterns` for `*.config.*`, but `criticalConfigPatterns` explicitly covers only selected configs, including `vitest.config.*`. A synthetic `validateCommitList` probe showed: `vitest.config.ts` → `isCriticalConfig=true`, one error; `jest.config.ts` → `isCriticalConfig=false`, zero errors, even when included in a `test(red)` commit with `tests/ts/unit/calc.test.ts`. This repository currently has and runs no Jest/Vite/ESLint/Webpack config. If a consumer activates one of those runners without extending policy and runtime coherence checks, an agent may alter its test configuration without this gate treating it as critical. |
| R-01 | Supply-chain residual risk, not a confirmed vulnerability. | N/A. | **Outside SLSA L3.** | Workflow runs `npm audit` but no equivalent Python dependency audit or `--require-hashes` installation. Direct pins in `requirements-test.txt` help, but do not provide a fully hash-pinned Python lock or provenance. No Python dependency was confirmed vulnerable because `pip-audit`/equivalent was not run. |

No HTTP endpoints, authentication/session paths, or sensitive application-memory data were found in scope for an application exploit test. The scanner's optional `--probe-http` only queries GitHub's public API; it is not a probe of a deployed application and was not run as such. Workflow actions are SHA-pinned and the workflow token is declared `contents: read`, but neither is artifact provenance.

## 6. Ecosystem comparison

GitHub API metadata was queried on 2026-10-16. Stars and activity are adoption signals, not security scores or direct equivalence.

| Project | Observed signal | Stronger at | Relationship to this harness |
|---|---|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | MIT; 141,462 stars; updated 2026-10-15. | Broad SDD toolkit, ecosystem reach, specification-centered workflows. | More mature SDD adoption alternative; no equivalent Git RED→GREEN causal gate was verified. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT; 72,067 stars; updated 2026-10-15. | Change/spec modeling and proposal/apply/archive lifecycle. | Direct dependency and natural complement here; not itself a causal Git commit validator. |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | Apache-2.0; 3,770 stars; observed update 2026-09-01. | SDD protocol integration as an Antigravity/Claude Code plugin. | Stronger agent-integrated workflow experience; does not replace this repo's gate. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | MIT; 1,686 stars; updated 2026-10-15. | Governance workflows, multi-agent coordination, `spec → plan → tasks → review → accept` lifecycle. | Close governance/process peer; it does not target the same RED/GREEN commit semantics. |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | Apache-2.0; 5,759 stars; updated 2026-10-15. | Automated repository security-posture metrics; publishes CodeQL integration. | Security complement, not an OpenSpec/TDD replacement. |
| [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator) | Apache-2.0; 604 stars; updated 2026-08-07. | GitHub Actions build provenance targeting SLSA. | Complement needed for verifiable provenance claims; it does not implement SDD/TDD. |

**Summary:** this repository differentiates itself by validating Git history and coupling RED/GREEN to modules, not by broad AppSec coverage or certification. Spec Kit/OpenSpec/Spec Kitty/Conductor are stronger in SDD maturity or experience; Scorecard and SLSA Generator are stronger in their supply-chain domains. A more complete engineering system would combine these capabilities rather than treat any one project as a substitute for all others.

## 7. Recommendations

1. Expand `criticalConfigPatterns` and fixtures to cover test/build configurations that are supported; alternatively fail closed for unknown runner types. Add self-tests showing that `jest.config.*`, `playwright.config.*`, `vite.config.*`, and `eslint.config.*` are protected when activated.
2. Extend `verify-policy-coherence.mjs` to derive every configured test runner, rather than assuming Vitest/Pytest.
3. If the repository publishes packages/artifacts, add provenance and attestation verification (SLSA/in-toto/Witness) and document the covered subject/digest. No release provenance evidence exists today.
4. Add Python dependency auditing and consider transitively pinned hashes; report npm and pip coverage separately.
5. Keep current claims scoped. An ASVS L3/LLM Top 10/ATLAS assertion requires a deployed-system scope, control matrix, and per-requirement evidence; it cannot be derived from this harness or 24 heuristic checks.

## 8. Official verdict

# **APPROVED**

Approved **only for the explicit, bounded claims**: an engineering template with OpenSpec, Node/Python causal gates, suites/coverage, and real PR blocking configured in the active `main` ruleset. GitHub reports a valid signature for the target commit, remote checks are green, and the cited local tests are reproducible.

This verdict does **not** declare the repository vulnerability-free, ASVS L3 certified, compliant with OWASP LLM Top 10/MITRE ATLAS, SLSA L3 conformant, or protected against every future configuration. Close finding F-01 before claiming generic protection for unlisted runners/configurations; address Python supply-chain risk if comprehensive dependency assurance is intended.

## 9. Sources

- [Commit 67a2eef and signature verification](https://github.com/rayrabbit-ai/ai-engineering/commit/67a2eef8b986b7655c2f3386bfdebc87a47dc6c5)
- [Gate workflow](../../.github/workflows/gate-validator.yml)
- [Single-source path policy](../../scripts/path-policy.json)
- [Node commit validator](../../scripts/verify-gates.mjs)
- [Python commit validator](../../scripts/verify_gates.py)
- [Runtime coherence verifier](../../scripts/verify-policy-coherence.mjs)
- [Heuristic scanner](../../scripts/redteam-audit.mjs)
- [Project's declared audit scope](README.md)
- [Queried GitHub ruleset](https://api.github.com/repos/rayrabbit-ai/ai-engineering/rulesets/25150565)
- [GitHub Spec Kit](https://github.com/github/spec-kit), [OpenSpec](https://github.com/Fission-AI/OpenSpec), [Conductor](https://github.com/gemini-cli-extensions/conductor), [Spec Kitty](https://github.com/spec-kitty/spec-kitty), [OpenSSF Scorecard](https://github.com/ossf/scorecard), [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator)
