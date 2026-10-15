# Informe forense independiente: claims y proyectos comparables

**Fecha de ejecución:** 2026-10-15  
**Repositorio:** [rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering)  
**Checkout local:** `main`, commit `4e21806` (`Initial commit`); sin remote Git configurado.  
**Alcance:** inspección de reglas, scripts, workflows, configuración, tests y documentación; ejecución no destructiva de checks locales; consulta de metadatos y documentación pública de proyectos comparables.  
**Dictamen oficial:** **RECHAZADO** para la afirmación amplia de operar como auditor/certificador bajo ASVS L3, SLSA L3 y los demás marcos citados. **Aprobación condicionada** solo como plantilla SDD/TDD con gates de CI, sujeto a corregir el replay RED y verificar la protección remota de rama.

> Este informe evalúa lo observable en este checkout y en la API pública consultada el 15-10-2026. No es una certificación formal OWASP/SLSA, una auditoría completa de la aplicación de un consumidor ni una prueba de la configuración privada de GitHub. Los recuentos de estrellas son una fotografía, no un indicador de seguridad o calidad.

## 1. Resumen ejecutivo

El repo sí aporta una implementación útil de un flujo SDD/TDD: OpenSpec, validadores de commits Node/Python, replay histórico de commits `test(red)`, tests de ejemplo, cobertura independiente de líneas y ramas, `npm audit`, protección estructural de reglas y workflows, y una propuesta automatizable de branch protection. En este checkout pasan los self-tests de los gates, la validación OpenSpec, el build TypeScript y las suites TypeScript ejecutadas. La cobertura Python también pasa después de instalar las dependencias en un entorno virtual local.

La afirmación examinada va bastante más lejos que esa evidencia. No se encontró un análisis de taint de flujo de datos, fuzzing generativo, mutation testing, auditoría de memoria, pruebas HTTP profundas ni firma/attestation de artefactos. La rutina denominada “Red Team ASVS L3” es una batería heurística acotada. Además, el replay histórico que CI invoca clasifica una excepción genérica sin aserción como RED legítimo y no consulta el campo `hasAssertion`; por tanto, su salida puede afirmar “AssertionError legítima confirmada” cuando no hubo aserción.

No se confirmó el estado remoto de branch protection: GitHub devolvió HTTP 403. El workflow produce checks, pero el bloqueo físico del merge requiere que esos checks y las reviews estén configurados como obligatorios. La conclusión correcta es “hay una base razonable de gobernanza TDD/SDD, con enforcement parcial”, no “auditor de ciberseguridad de élite certificado ASVS L3 / SLSA L3”.

## 2. Metodología y límites

1. Se leyeron las instrucciones obligatorias (`INVARIANTS.md`, `SDD_GATE.md`, `AGENTS.md` y `ADVERSARIAL_AUDITOR.md`) y se contrastaron con el código que toma decisiones, no solo con sus descripciones.
2. Se inspeccionaron `package.json`, `pyproject.toml`, `requirements-test.txt`, `.github/workflows/`, `.github/CODEOWNERS`, validadores de commits, replay RED, guard, checker de cobertura y `redteam-audit.mjs`.
3. Se ejecutaron comandos de verificación de solo lectura o que producen archivos ignorados por Git. No se hizo commit, push, release, prueba destructiva ni cambio de código de producción.
4. Se realizó una PoC local no destructiva de clasificación de fallo no asertivo y se llamó a `validateCommitList` en Node y Python para volver a probar la colisión de módulo descrita en un expediente anterior.
5. Se consultaron GitHub CLI/API y README oficiales de Witness, Superpowers, Spec Kit, OpenSpec y Spec Kitty. Los metadatos cambian con el tiempo.

**Límites:** este checkout contiene un único commit raíz y no tiene remote Git. La lectura de branch protection falló por permisos de integración. No se pudo observar una ejecución limpia de GitHub Actions ni el historial real de PRs/releases. `package-lock.json` ya estaba modificado antes del análisis; se dejó intacto. `venv/` y los informes de coverage están ignorados por Git.

## 3. Claims frente a realidad observable

| Claim | Dictamen | Evidencia observable y brecha |
|---|---|---|
| “CI-enforced Git commit gates” | **Parcialmente demostrado y condicional** | [El workflow](../../.github/workflows/gate-validator.yml) ejecuta validadores en PR y push a ramas configuradas; las Actions externas están fijadas por SHA y `permissions: contents: read` está declarado. El bloqueo del merge depende de branch protection/rulesets remotos. La API respondió 403, así que no se verificó que esté activo. |
| “Strict TDD causality / RED → GREEN” | **Implementado parcialmente; hay brecha comprobable** | Hay validadores Node/Python y replay de RED en worktree. Sin embargo, `classifyTestResult` marca `isRed: true` aunque `hasAssertion` sea falso; el caller no comprueba `hasAssertion`. Ver F-01. |
| “Ningún código sin especificación previa aprobada” | **Sobreafirmado** | CI ejecuta `openspec validate --all` y los commits de producción deben nombrar un OpenSpec Change activo. Eso no equivale a demostrar aprobación humana previa ni que la implementación satisface una especificación. La validación comprueba presencia/estructura y linkage. |
| “Dual-mode autonomy (Invariant vs HITL)” | **Principalmente protocolo y configuración opcional** | Las reglas describen cuándo parar y escalar. El script de branch protection puede solicitar reviews/CODEOWNERS, pero no se verificó la configuración remota ni un runtime que imponga por sí mismo límites de intentos o pause al agente. |
| “Polyglot (TS/Python)” | **Demostrado para el ejemplo y los gates incluidos** | Hay código, tests, checker de cobertura y jobs para TypeScript y Python. Esto no demuestra que el harness sea agnóstico a cualquier stack, aunque el README lo sugiera. |
| “Auditoría de flujo de datos / taint analysis” | **No demostrado** | D1 usa patrones regex y PoCs de argumentos para buscar algunos usos de shell. No hay propagación de fuentes/sinks, grafo de taint, análisis interprocedimental ni herramienta SAST declarada. |
| “Fuzzing diferencial” | **Sobreafirmado** | D7 compara dos validadores con una lista fija de siete vectores. Es una matriz de pruebas diferenciales manual; no hay generación aleatoria/property-based, corpus, mutación de entradas ni exploración de cobertura propia de fuzzing. |
| “Pruebas de mutación” | **No demostrado** | D9 inspecciona configuraciones de cobertura y E2E. No se muta código ni se calcula mutation score; no aparecen Stryker, mutmut u otra herramienta equivalente en dependencias/configuración. |
| “Explotación ética en memoria” | **No demostrado / fuera de alcance del código observado** | D2 inspecciona symlinks, usos Python y cronometra una regex artificial. No hay pruebas de heap, fugas, corrupción, límites de memoria, sanitizers o perfilado de memoria. |
| “Auditoría HTTP” | **Muy limitada** | D4 busca cadenas que deshabilitan TLS. La consulta HTTP opcional (`--probe-http`) consulta un endpoint de branch protection; no analiza una aplicación HTTP, cabeceras, auth, SSRF, cookies, TLS negociado ni rutas. |
| “Verificación criptográfica de pipelines y artefactos” | **No equivale a SLSA/provenance** | El código puede calcular SHA-256 y comparar contenidos de ZIP si existen. No se halló firma, attestation, identidad/procedencia verificable, build reproducible ni publicación de provenance en el workflow. SHA-256 calculado localmente no autentica quién produjo el artefacto. |
| “Antes de cualquier commit, push o release” | **No demostrado** | `prepare` ejecuta `guard-agent` al instalar; no hay hook Git de pre-commit/pre-push configurado. CI corre en PR y después de ciertos pushes, y no se observó workflow de release. El comando redteam también es manual fuera de CI. |
| “OWASP ASVS L3 / SLSA L3 / MITRE / CVSS” | **No certificado ni trazado** | Se nombran marcos y CWE en documentación/código, pero no hay matriz ASVS requisito→evidencia, alcance de controles L3, expediente de verificación SLSA L3 ni metodología CVSS reproducible. Las etiquetas no constituyen conformidad. |

### Capacidades que sí se observaron

- Los self-tests de gates y runners RED pasan; las referencias Git se pasan como argumentos sin shell y el workflow fija las Actions externas por SHA completo.
- OpenSpec valida los artefactos presentes. CI separa suites `legacy_baseline`, `unit/integration` y `e2e`.
- TypeScript y Python tienen comprobación de cobertura de líneas y ramas por separado. La acusación del redteam incluido de que Python solo usa un umbral combinado es falsa frente al checker y al workflow reales.
- `npm audit --audit-level=high` encontró cero vulnerabilidades en el árbol Node consultado. Esto no es un SCA completo de todos los ecosistemas ni una evaluación de la seguridad del producto desplegado.
- El validador actual rechazó la antigua colisión `tests/auth` → `src/billing/auth` tanto en Node como en Python. No la registro como bypass vigente; sí como una regresión que conviene mantener probada.

## 4. Matriz de hallazgos

No se confirmó una vulnerabilidad de ejecución remota o de la calculadora de ejemplo. Sí se identificó un defecto de integridad en el control de TDD y problemas de calidad/alcance de la auditoría. Para ellos no asigno un número CVSS: son defectos de assurance del proceso, no una vulnerabilidad de aplicación con vector de explotación evaluable de forma responsable.

| ID | Severidad | Tipo | Evidencia / impacto |
|---|---|---|---|
| F-01 | **Media; prioridad P1 para la promesa del gate** | Falso positivo en verificación histórica RED | En [`classifyTestResult`](../../scripts/verify-historical-replay.mjs#L44), `isRed` es verdadero para cualquier exit code distinto de cero que no coincida con una lista parcial de errores de sintaxis. Una excepción genérica produce `hasAssertion: false`, pero [`verifyHistoricalReplay`](../../scripts/verify-historical-replay.mjs#L227) solo comprueba `isFraud` y `isSyntaxError`; luego imprime que se confirmó una aserción legítima. PoC y salida en §5. Un test que falla por `Error`/runtime antes de una aserción puede pasar como RED en este replay. |
| F-02 | **Media** | Auditor heurístico produce un hallazgo contradicho por el gate real | `node scripts/redteam-audit.mjs` informa que el mínimo de ramas Python no se evalúa por separado. No obstante, [`check_python_coverage.py`](../../scripts/check_python_coverage.py#L71) calcula ramas por separado y el workflow invoca el checker con `--min-branches 75`. El propio redteam termina exit 0 cuando no hay findings críticos/altos; eso no valida que sus hallazgos medios sean correctos. |
| F-03 | **Baja/Media, confianza de auditoría** | Afirmaciones de capacidad no respaldadas por el método | Los dominios “taint”, “fuzzing”, “mutation”, “memory”, “HTTP” y “artifact forensics” son comprobaciones puntuales, no implementaciones de esos métodos/estándares. El nombre “10 dominios ASVS L3” puede inducir a confiar en cobertura que no existe. |
| F-04 | **Riesgo no confirmado** | Precondición de merge desconocida | `gh api repos/rayrabbit-ai/ai-engineering/branches/main/protection` devolvió `403 Resource not accessible by integration`. No concluyo que branch protection esté desactivado; concluyo que no se pudo verificar. Sin esa configuración, los jobs de CI no garantizan bloqueo físico del merge. |
| F-05 | **Hallazgo histórico no vigente en esta comprobación** | Colisión de scopes | Una auditoría almacenada describe un bypass `auth`/`billing/auth`. La PoC actual devuelve violaciones en ambos validadores. No se reprodujo el bypass en HEAD; los expedientes que dicen “remediado/certificado” tampoco sustituyen una prueba mantenida en CI. |

**Riesgo residual principal:** F-01 reduce la fuerza de la garantía causal, no permite por sí mismo ejecutar código arbitrario. La severidad se fija como media por impacto sobre la política de ingeniería; no es una clasificación CVSS de vulnerabilidad de producto.

Reproducción exacta de F-01:

```bash
node --input-type=module -e "import {classifyTestResult} from './scripts/verify-historical-replay.mjs'; console.log(JSON.stringify(classifyTestResult(1,'Error: deliberate runtime failure before any assertion','')));"
```

Salida observada:

```json
{"isRed":true,"isFraud":false,"hasAssertion":false,"reason":"El runner devolvió código de error sin error de sintaxis."}
```

## 5. Comandos ejecutados y salidas observadas

Las salidas se resumen sin alterar códigos de salida ni convertir un self-test en evidencia de una ejecución real. Los comandos de lectura externa consultaron APIs y README de GitHub.

| Comando | Resultado real relevante |
|---|---|
| `git status --short --branch` | `## main`; `M package-lock.json` ya existía al inicio y continuó siendo el único cambio rastreado. |
| `git log --oneline --decorate -5` | `4e21806 (HEAD -> main) Initial commit`. |
| `git remote -v` | Sin salida; no hay remote Git configurado en el checkout. |
| `npm run verify:gates:self-test` | Exit 0; “Todas las pruebas … pasaron exitosamente”. |
| `npm run verify:gates:py:self-test` | Exit 0; “Todas las aserciones internas y pruebas adversariales pasaron”. |
| `npm run verify:red:self-test` y `npm run verify:red:py:self-test` | Ambos exit 0; autochequeos de filtros/clasificación aprobados. Son self-tests, no replay de un commit real. |
| `npm run spec:validate` | `3 passed, 0 failed`: `change/deterministic-causality-harness`, `spec/math-engine`, `change/math-engine`. |
| `npm run build` | `tsc` terminó sin errores. |
| `npm run test:ts:coverage` | 5 archivos, 22 tests pasaron; líneas 87.61%, ramas 77.27%, funciones 100%. |
| `npm audit --audit-level=high` | `found 0 vulnerabilities`. |
| `node scripts/redteam-audit.mjs` | Exit 0; `2 hallazgos totales (0 Críticos/Altos) | 12 pruebas ejecutadas`; informó dos medios: guard sin hash y supuesto umbral de ramas Python combinado. No se generó ni sobrescribió informe. |
| PoC `classifyTestResult(1, 'Error: deliberate runtime failure before any assertion', '')` | `{"isRed":true,"isFraud":false,"hasAssertion":false,"reason":"El runner devolvió código de error sin error de sintaxis."}`. El caller del replay no consulta `hasAssertion`. |
| `npm run verify:replay:self-test` | Exit 0; self-test del clasificador aprobado, pero no contiene un caso que exija rechazar `isRed=true` con `hasAssertion=false`. |
| PoC `validateCommitList` Node y Python: test `auth`, producción `src/billing/auth` | Ambos devuelven una violación: módulo de producción `billing/auth` no coincide con scope RED activo `auth`. El bypass histórico no se reprodujo. |
| `npm run guard` | Exit 0; contratos y anclas requeridos presentes. El guard verifica presencia, tamaño y anclas semánticas, no hashes criptográficos. |
| `npm run test:ts:e2e` | 1 archivo, 1 test pasó. |
| `pytest -m legacy_baseline --tb=short` | 2 passed, 18 deselected. |
| `pytest -m e2e --tb=short` | 1 passed, 19 deselected. |
| `npm run test:py:coverage` con el `pytest` preinstalado | Falló antes de ejecutar tests: `unrecognized arguments: --cov=src --cov-branch ...`; el shim apuntaba a un entorno sin `pytest-cov`. |
| `python -m pytest ...` con Python global | Falló: `/home/codespace/.python/current/bin/python: No module named pytest`. Python sí estaba instalado: `Python 3.14.2`. |
| `python -m venv venv`; `venv/bin/python -m pip install -r requirements-test.txt` | Instaló los pins: coverage 7.16.1, pytest 9.0.3, pytest-cov 7.1.0 y dependencias. |
| `venv/bin/python -m pip install --no-deps --no-build-isolation -e .` (primer intento) | Falló por falta de `setuptools.build_meta` en el entorno virtual recién creado. |
| `venv/bin/python -m pip install 'setuptools>=61.0'` y repetición de instalación editable | Exit 0; paquete local `ai-engineering==1.0.0` instalado en editable. |
| `venv/bin/python -m pytest -m 'unit or integration' --cov=src --cov-branch --cov-report=term-missing --cov-report=json:.coverage-python.json` y checker | 17 passed, 3 deselected; coverage 86.60% total. Checker: líneas 87.76% ≥80%; ramas 83.87% ≥75%; ambas compuertas aprobadas. |
| `venv/bin/python scripts/check_python_coverage.py .coverage-python.json --min-lines 80 --min-branches 75` | Exit 0; verifica por separado líneas y branches. |
| `gh api repos/rayrabbit-ai/ai-engineering/branches/main/protection` | HTTP 403: `Resource not accessible by integration`; protección remota no verificable desde esta sesión. |
| `gh repo view rayrabbit-ai/ai-engineering --json nameWithOwner,description,createdAt,pushedAt,stargazerCount,url,licenseInfo` | Repositorio MIT; creado `2026-10-14T01:42:35Z`; `pushedAt` `2026-10-15T18:20:55Z`; 0 estrellas en la consulta. |

**Entorno resultante:** Python no se instaló desde cero porque ya estaba presente en el contenedor. Se configuró `venv/`, ignorado por Git, para que `pytest-cov` se ejecute con el intérprete correcto. El `package-lock.json` preexistente no se tocó.

## 6. Comparativa del ecosistema

La comparación se hace por propósito, no por popularidad. Los conteos indicados son los reportados por `gh repo view` durante esta consulta del 2026-10-15.

| Proyecto | Enfoque y evidencia primaria | Comparación con RayRabbit | Metadatos consultados |
|---|---|---|---|
| [Witness](https://github.com/in-toto/witness) | Framework de in-toto para riesgo de supply chain; automatiza y verifica provenance/attestations y ofrece políticas OPA/Rego. README habla de comprobar cómo se produjo software, herramientas y pasos autorizados. | **Mejor para procedencia verificable de build/artefactos**, no reemplaza SDD ni causalidad RED/GREEN de commits. Complemento natural si se quiere sustentar SLSA/provenance. | Apache-2.0; 549 estrellas; push 2026-10-12. |
| [Superpowers](https://github.com/obra/superpowers) | Metodología/skills para agentes; documenta brainstorming, plan, subagentes, revisión y TDD RED/GREEN. README declara una metodología completa para coding agents. | **Más desarrollado en comportamiento y flujo del agente**. No es por sí solo un gate CI que valide historial RED ni una herramienta de attestations. | MIT; 299,771 estrellas; push 2026-10-10. |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Toolkit general de SDD. README documenta especificar, planificar, generar tareas e implementar, con integraciones y workflow/hooks para agentes. | **Más amplio como toolkit SDD/ecosistema**; no se encontró en la evidencia consultada que su objetivo central sea demostrar fallos RED históricos por commit. | MIT; 141,421 estrellas; push 2026-10-15. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | SDD para coding agents; ciclos de propuesta/cambio, especificación, aplicación y archivado. Es dependencia directa de este repositorio. | **Más maduro/especializado en especificación y lifecycle SDD**; no sustituye automáticamente los gates de commit del proyecto auditado. | MIT; 72,040 estrellas; push 2026-10-15. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | Gobernanza git-native: misiones, work packages, lanes de review/accept/merge y worktrees aislados para trabajo paralelo. El README consultado indica estado prerelease/qualification. | **Más completo en coordinación y trazabilidad de unidades de trabajo multiagente**. No se afirma paridad con el replay TDD exacto de RayRabbit; validar madurez/compatibilidad antes de producción. | MIT; 1,685 estrellas; push 2026-10-15. |

**Conclusión comparativa:** no hay un “mejor” universal. Para un equipo que busca SDD, OpenSpec o Spec Kit son las opciones más directas; para disciplina del agente, Superpowers; para procedencia criptográfica, Witness; para gobernanza de work packages y paralelismo, evaluar Spec Kitty. RayRabbit aporta valor específico en validar convenciones de commit TDD, pero hoy su garantía histórica tiene F-01 y depende de branch protection que aquí no pudo verificarse.

**Composición recomendada:** OpenSpec (o Spec Kit) para especificación + Superpowers para el workflow del agente + un validador CI pequeño con replay RED corregido + Witness/in-toto si se necesita provenance/attestation de builds. Mantener cada capa responsable de una garantía comprobable.

## 7. Dictamen oficial y acciones necesarias

### Dictamen: **RECHAZADO**

Se rechaza el claim global de “auditor de ciberseguridad de élite” y de operación conforme/certificada con OWASP ASVS L3, OWASP CI/CD/LLM Top 10, SLSA L3, ATT&CK/ATLAS, CWE Top 25 y CVSS v4.0. El repo no aporta la cobertura de controles, herramientas, atestaciones, metodología ni evidencia independiente necesarias para sostener esas afirmaciones; además, el replay RED contiene un falso positivo reproducido.

No se rechaza el valor del repo como plantilla SDD/TDD: esa descripción más acotada está parcialmente sustentada por los gates y pruebas que sí se ejecutaron. No debe describirse como certificación de seguridad ni como bloqueo de merge activo hasta validar la configuración remota.

1. **P1:** hacer que el replay rechace explícitamente cualquier resultado sin aserción (`hasAssertion === false`) y añadir self-test regresivo; no imprimir “AssertionError confirmada” para excepciones genéricas.
2. **P1:** comprobar branch protection/rulesets en GitHub con permisos adecuados; confirmar required checks, CODEOWNERS y aprobación humana. Documentar el estado efectivo, no solo el script de configuración.
3. **P1:** rebajar “ASVS L3”, “SLSA L3”, “taint analysis”, “fuzzing”, “mutation testing”, “memory/HTTP audit” y “before any commit/push/release” a descripciones precisas hasta disponer de evidencia y tooling real.
4. **P2:** corregir el dominio D9 del redteam para evaluar el checker real de ramas, añadir pruebas de precisión para hallazgos y distinguir fallo del auditor de “cero vulnerabilidades”.
5. **P2:** mantener el caso de colisión `auth`/`billing/auth` como prueba de regresión para Node y Python.
6. **P2:** si se pretende afirmar ASVS L3/SLSA L3, crear una matriz auditable de requisitos, evidencia, alcance, exclusiones y resultados; para SLSA, añadir provenance/attestation verificable del build, no solo checksums locales.

## 8. Fuentes

- Reglas y gates locales: [INVARIANTS](../../.agent/rules/INVARIANTS.md), [SDD_GATE](../../.agent/rules/SDD_GATE.md), [workflow de CI](../../.github/workflows/gate-validator.yml), [verificador de replay RED](../../scripts/verify-historical-replay.mjs), [redteam incluido](../../scripts/redteam-audit.mjs), [checker de cobertura Python](../../scripts/check_python_coverage.py).
- Comparables: [in-toto/Witness](https://github.com/in-toto/witness), [obra/Superpowers](https://github.com/obra/superpowers), [github/spec-kit](https://github.com/github/spec-kit), [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec), [spec-kitty/spec-kitty](https://github.com/spec-kitty/spec-kitty).
- Metadatos consultados vía GitHub CLI `gh repo view`; textos de README vía `gh api repos/{owner}/{repo}/readme`. Consultas efectuadas el 2026-10-15.