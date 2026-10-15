# Auditoría adversarial forense: RayRabbit AI Engineering

**Fecha:** 2026-10-15
**Repositorio:** [rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering)
**Commit local auditado:** `bc4c030` (`Initial commit`)
**Rama:** `main`
**Alcance:** contraste de las afirmaciones públicas con reglas, scripts, workflows, tests y resultados observables; pruebas adversariales locales no destructivas; búsqueda de proyectos comparables.
**Dictamen:** **parcialmente correcto, con garantías centrales sobreafirmadas y una evasión reproducible del acoplamiento de ámbitos. No se certifica como enforcement determinista completo ni como auditoría ASVS L3.**

> Esta revisión es una auditoría técnica acotada al checkout y a evidencia pública observable el 2026-10-15. No es una certificación formal de seguridad, una revisión completa de cada dependencia, ni una confirmación de configuración privada de GitHub.

## Resumen ejecutivo

El repositorio sí contiene una implementación sustancial: reglas SDD/TDD, validadores Node y Python, workflows GitHub Actions, validación OpenSpec, suites para TypeScript y Python, reportes de cobertura separados, protección de baselines, configuración sugerida de branch protection y una batería heurística denominada red team. La compilación, las suites TypeScript, varios controles Python y las validaciones de formato revisadas funcionan en este checkout.

Sin embargo, el claim principal debe matizarse:

1. **La causalidad RED → GREEN/FIX se comprueba en CI por nombres de commit y rutas heurísticas, pero el gate no demuestra que el test RED histórico fallara por una aserción.** CI ejecuta el self-test del verificador RED, no el verificador sobre cada commit RED.
2. **El acoplamiento de ámbitos puede eludirse por colisión de sufijo.** Una prueba de `auth` autoriza un cambio en `billing/auth`; Node y Python aceptan el flujo sin errores. Es un defecto directo en la promesa más distintiva del proyecto.
3. **OpenSpec valida formato/coherencia de artefactos, pero CI no relaciona cada cambio de producción con una propuesta aprobada.** “Ningún código sin especificación previa” es principalmente una instrucción al agente, no una comprobación demostrada por el workflow.
4. **El bloqueo físico de merges depende de que branch protection esté configurado en GitHub.** Hay un script para configurarlo, pero no pude leer la configuración activa: la API respondió 403 y el checkout no tiene remote configurado.
5. **“Invariant vs HITL”, “runtime real” y “elimina vibe coding” describen objetivos/protocolos, no capacidades completamente automatizadas demostradas por este código.**
6. **El red-team incluido produjo dos hallazgos medios que no se sostienen como están redactados.** El gate de cobertura Python sí separa líneas y ramas; `guard-agent` sí comprueba existencia, contenido mínimo y anclas semánticas, aunque no usa hashes criptográficos.

**Conclusión práctica:** útil como plantilla/punto de partida para disciplina de commits y TDD asistido, pero no confiaría todavía en él como barrera infalible. Corregiría primero la comparación de scopes, conectaría la prueba RED real al gate, y convertiría la relación código↔spec aprobada en una regla comprobable. Además, documentaría branch protection como precondición externa hasta verificarla en GitHub.

## Matriz de afirmaciones

| Afirmación | Veredicto | Evidencia y límites |
|---|---|---|
| “CI-enforced Git commit gates” | **Parcialmente correcta / condicional** | [gate-validator.yml](../../.github/workflows/gate-validator.yml#L4) ejecuta validadores en PRs y pushes seleccionados. El bloqueo del merge solo es físico si los checks se marcan como requeridos mediante branch protection/rulesets. El script para aplicarlo existe, pero la configuración remota activa no pudo verificarse. |
| “OpenSpec + strict TDD causality” | **Parcialmente correcta** | Existe un flujo OpenSpec y se valida con `openspec validate --all`; el gate sí busca commits `test(red)`, `feat(green)` y `fix`. No vincula código a una change/spec aprobada, no verifica el resultado histórico de RED y presenta un bypass de scopes. |
| “Todo código requiere especificación previa” | **No demostrado por CI** | El README lo afirma ([README.es.md](../../README.es.md#L25)), pero el workflow invoca validación sintáctica de OpenSpec y el validador de commits solo restringe cambios a `openspec/specs/`. No hay comprobación observada de que cada commit de producción apunte a una change aprobada o a un requisito concreto. |
| “El test RED falla físicamente antes de GREEN” | **Protocolo local, no gate histórico de CI** | El script `verify-red-failure` existe y sus self-tests pasan. El workflow invoca `--self-test` ([workflow](../../.github/workflows/gate-validator.yml#L33)), pero no ejecuta `verify-red-failure` contra cada commit RED ni registra evidencia del fallo de la aserción. El validador de historial solo exige archivo de test y prefijo. |
| “Scope-coupled TDD” | **Defectuoso: bypass reproducible** | Ambos validadores permiten que un módulo activo `auth` coincida con cualquier módulo terminado en `/auth`. PoC y resultado abajo. |
| “Dual-mode autonomy (Invariant vs HITL)” | **Mayormente procedimental** | Hay reglas que ordenan escalar a HITL y un script que configura revisiones obligatorias/CODEOWNERS ([setup_branch_protection.py](../../scripts/setup_branch_protection.py#L51)). No encontré un controlador de ejecución que aplique por sí mismo el límite de intentos, congele al agente o garantice HITL. La revisión de GitHub efectiva no fue observable. |
| “Polyglot TS/Python” | **Correcta para los ejemplos y gates incluidos** | Hay implementación de ejemplo, validadores, tests, cobertura y jobs para ambos lenguajes. Los validadores son duplicados y deben conservar paridad. No implica soporte probado para todos los lenguajes que los comentarios del gate enumeran. |
| “Runtime real E2E” | **Sobreafirmada** | Los casos E2E ejercitan el motor matemático dentro del proceso de test; no despliegan una aplicación/servicio ni prueban red, persistencia o integración con un sistema real. Son buenos tests funcionales de extremo a extremo del ejemplo, pero “runtime real/live” sugiere una amplitud mayor. |
| “Auditoría ofensiva de 10 dominios ASVS L3” | **No equivale a certificación** | El script ejecutó 12 pruebas/probes y usa heurísticas estáticas/dinámicas. No se verificó cobertura integral de ASVS L3. Su informe actual tiene hallazgos discutibles/contradichos; ver la sección Red Team. |
| “Elimina/cura vibe coding” | **Claim de marketing, no verificable como absoluto** | Los gates pueden reducir ciertas clases de cambios sin tests y mejorar trazabilidad. No prueban calidad semántica del test, corrección del diseño, ausencia de alucinaciones ni que el agente obedeciera el protocolo antes de crear el commit. |

## Hallazgos adversariales

### F-01 — Bypass de scope por coincidencia de sufijo

**Prioridad:** Alta para la integridad del claim de scope-coupled TDD.
**Estado:** Reproducido en los dos validadores.
**Ubicaciones:** [verify-gates.mjs](../../scripts/verify-gates.mjs#L230), [verify_gates.py](../../scripts/verify_gates.py#L244).

La lógica acepta un módulo de producción cuando `pModule.endsWith('/' + activeScope)` (y una condición recíproca). Esto hace que un scope genérico inferido desde el nombre base de un test se comporte como comodín implícito entre directorios distintos.

**PoC ejecutada en Node:**

```bash
node --input-type=module -e "import { validateCommitList } from './scripts/verify-gates.mjs'; const c=[{hash:'red0001',subject:'test(red): auth test',changedFiles:['tests/auth.test.ts']},{hash:'green01',subject:'feat(green): modify billing auth',changedFiles:['src/billing/auth.ts']}]; console.log(JSON.stringify(validateCommitList(c)));"
```

**Salida:** `[]` (ninguna violación).

**PoC ejecutada en Python:**

```bash
python -c "from scripts.verify_gates import validate_commit_list; c=[('red0001','test(red): auth test',['tests/test_auth.py']),('green01','feat(green): modify billing auth',['src/billing/auth.py'])]; print(validate_commit_list(c))"
```

**Salida:** `[]` (ninguna violación).

El test `tests/auth.test.ts` no prueba necesariamente el módulo `src/billing/auth.ts`, pero el commit GREEN se considera acoplado. El self-test cubre scopes discordantes `auth` vs `billing` y rutas `ui/button` vs `payments/button`, no esta colisión de nombre base.

**Recomendación:** modelar el mapeo de test↔producción de forma explícita y canónica; para scopes inferidos exigir igualdad exacta de módulo, incluyendo directorios. Si se permiten submódulos, hacerlo mediante scopes explícitos/registrados, no con sufijos ambiguos. Añadir este PoC como regresión en ambos self-tests y asegurar paridad Node/Python.

### F-02 — CI no ejecuta el verificador RED sobre commits reales

**Prioridad:** Alta para la promesa de TDD “físico”; media para el riesgo general del producto.
**Ubicación:** [gate-validator.yml](../../.github/workflows/gate-validator.yml#L33), [verify-red-failure.mjs](../../scripts/verify-red-failure.mjs#L88).

En CI se ejecuta `node scripts/verify-red-failure.mjs --self-test` y `python scripts/verify_red_failure.py --self-test`. Eso demuestra que algunas funciones del verificador reconocen entradas sintéticas, no que el commit etiquetado `test(red)` haya hecho fallar una aserción antes de implementar. El validador de historial únicamente inspecciona asunto y nombres/tipos de archivos modificados.

**Riesgo concreto:** un commit `test(red)` puede incluir una prueba que ya pasa, ser etiquetado como RED, y después habilitar un GREEN; el gate de historial no conserva ni comprueba el fallo físico previo. Ejecutar el verificador localmente es una instrucción/documentación, no evidencia obligatoria en el workflow revisado.

**Recomendación:** definir una forma reproducible de asociar el test y su resultado al commit RED (por ejemplo, workflow por commit/PR que ejecute el test añadido contra el padre del commit), o rebajar el texto del README a “el protocolo requiere ejecutar verify:red localmente”. Evitar inferir legitimidad solo de patrones de salida genéricos.

### F-03 — Falta de relación verificable entre cambio de código y spec aprobada

**Prioridad:** Media.
**Ubicaciones:** [README.es.md](../../README.es.md#L25), [gate-validator.yml](../../.github/workflows/gate-validator.yml#L81), [verify-gates.mjs](../../scripts/verify-gates.mjs#L291).

`openspec validate --all` valida el esquema/consistencia de specs y changes presentes. El validador de commits prohíbe editar directamente `openspec/specs/` con ciertos prefijos, pero no exige que un cambio en `src/` corresponda a una change identificable, revisada y aceptada. Tampoco se detecta una “aprobación previa” en el diff del PR.

**Recomendación:** si “ningún código sin spec aprobada” es un requisito de enforcement, añadir metadatos/IDs de change a commits o PRs y validar su existencia/estado contra los artefactos OpenSpec. De lo contrario, describirlo con claridad como protocolo del agente y no como gate mecánico.

### F-04 — Branch protection activa no verificada

**Prioridad:** Alta como precondición de despliegue; no es una vulnerabilidad local confirmada.
**Ubicaciones:** [setup_branch_protection.py](../../scripts/setup_branch_protection.py#L51), [BRANCH_PROTECTION.md](../../docs/BRANCH_PROTECTION.md#L34).

El workflow produce estados de CI, y existe código para solicitar checks requeridos, revisiones y Code Owner reviews. Pero la protección de rama es configuración remota, no queda activada solo por almacenar el workflow/script. La consulta a `GET /repos/rayrabbit-ai/ai-engineering/branches/main/protection` devolvió `403 Resource not accessible by integration`; además, `git remote -v` no devolvió remotos en el checkout.

**Recomendación:** publicar una captura/exportación verificable de rulesets/protección activa o marcarla explícitamente como requisito de instalación. Confirmar que los nombres de checks configurados corresponden a los status checks actuales y que los owners de CODEOWNERS son equipos/usuarios GitHub válidos.

### F-05 — El reporte red team incluido tiene señal insuficiente

**Prioridad:** Media (calidad de auditoría y confianza en el informe).
**Evidencia:** ejecución local de `node scripts/redteam-audit.mjs`.

El script concluyó “0 críticos/altos” y reportó dos hallazgos medios:

- **F-01 del reporte: hash SHA-256 ausente en `guard-agent.mjs`.** Es correcto que no hay verificación criptográfica de hash, pero el guard sí comprueba existencia, longitud mínima y anclas semánticas de reglas, y longitud de workflows ([guard-agent.mjs](../../scripts/guard-agent.mjs#L58)). No se mostró un bypass/exploit que permita que un PR no confiable altere esos archivos; el workflow además contiene controles de PR/CODEOWNERS. La ausencia de hashes por sí sola no demuestra una vulnerabilidad explotable. Un manifiesto de hash podría endurecerlo, pero no es una corrección obligatoria demostrada por este PoC.
- **F-02 del reporte: cobertura de branches Python no separada.** Contradicho por el código: [check_python_coverage.py](../../scripts/check_python_coverage.py#L71) calcula ramas por separado y falla debajo del mínimo en L94; el workflow lo invoca después de generar JSON ([gate-validator.yml](../../.github/workflows/gate-validator.yml#L152)). `pyproject.toml` tiene `fail_under = 80`, pero la compuerta independiente adicional establece líneas ≥80 y ramas ≥75. El hallazgo parece basarse solo en leer `fail_under` y omite el checker real.

El script red team contiene probes útiles, pero no debe presentarse como una certificación ASVS L3 ni como prueba exhaustiva: en esta ejecución fueron 12 casos, dos conclusiones medias no demostradas y no se verificó todo el espacio de estados/configuración de GitHub.

### F-06 — “E2E de runtime real” sobredimensiona lo probado

**Prioridad:** Baja (precisión del claim).
**Ubicaciones:** [tests/ts/e2e/calculator.e2e.spec.ts](../../tests/ts/e2e/calculator.e2e.spec.ts), [tests/e2e/test_calculator_e2e.py](../../tests/e2e/test_calculator_e2e.py).

Las suites prueban una tubería de operaciones en el runtime Node/Python y no usan mocks en ese ejemplo. No arrancan un proceso de servicio, no prueban red/persistencia y no validan despliegue. Son útiles como E2E funcional del motor de muestra; la etiqueta “sistema vivo/runtime real” sugiere validación operativa que no observé.

### F-07 — Madurez del repositorio y alcance real

Los metadatos públicos de GitHub consultados indican creación el **2026-10-14**, `pushed_at` el **2026-10-15** y 0 estrellas al consultar. El historial disponible aquí contiene solo `bc4c030 Initial commit`, tratado por ambos gates como semilla válida. Esto no invalida el diseño, pero significa que no se puede evaluar una historia real de ciclos RED/GREEN, adopción, incidentes, compatibilidad sostenida ni funcionamiento sobre aplicaciones diversas a partir de este checkout.

## Pruebas y resultados

### Pruebas que pasaron

| Comando | Resultado observado |
|---|---|
| `npm run verify:gates:self-test && npm run verify:gates:py:self-test` | Ambos self-tests pasan; casos sintéticos de causalidad/SDD cubiertos por el propio script. |
| `npm run verify:red:self-test && npm run verify:red:py:self-test` | Ambos self-tests pasan; esto no es una ejecución de RED real sobre el historial. |
| `npm run spec:validate` | 2 pasados, 0 fallidos (`spec/math-engine`, `change/math-engine`). |
| `npm run test:ts:coverage` | 5 archivos, 22 tests pasan; líneas 87,61%, ramas 77,27%, funciones 100%. |
| `npm run build` | `tsc` termina sin errores. |
| `npm run test:ts:e2e` | 1 archivo, 1 test pasa. |
| `npm run guard` | Todos los contratos, anclas y workflows requeridos pasan. |
| `npm audit --audit-level=high` | 0 vulnerabilidades reportadas por npm audit. |
| `pytest -m legacy_baseline --tb=short` | 2 pasados, 18 excluidos. |
| `pytest -m e2e --tb=short` | 1 pasado, 19 excluidos. |
| `npm run verify:gates -- --allow-dirty` | Pasa, pero solo acepta el commit raíz `Initial commit` como semilla; no valida ciclos TDD reales. |
| `npm run verify:gates:py -- --allow-dirty` | Mismo resultado: acepta el commit raíz como semilla. |
| `node scripts/redteam-audit.mjs` | 12 probes; 2 medios, 0 críticos/altos. Las dos observaciones medias requieren la corrección indicada en F-05. |
| PoC scope Node y Python | Ambos retornan lista vacía de violaciones para `auth → billing/auth`; bypass reproducido. |

### Verificaciones bloqueadas/incompletas

- `npm run test:py:coverage` **no pudo ejecutarse**: el `pytest` del contenedor pertenece a `/usr/local/py-utils/venvs/pytest/bin/python` y no encuentra `pytest-cov`; por eso rechaza `--cov`, `--cov-branch` y `--cov-report`. El entorno Python seleccionado por VS Code reportó `pytest-cov==7.1.0`, pero no es el intérprete del shim `pytest` utilizado por npm. Se comprobó con `pip show pytest-cov` e importación contra el intérprete real, que devolvieron paquete ausente. La suite de baseline y E2E sí pudo ejecutarse sin cobertura. No concluyo que el job CI vaya a fallar: CI instala `requirements-test.txt` desde cero; esta limitación es del entorno de auditoría local.
- `GET /repos/rayrabbit-ai/ai-engineering/branches/main/protection`: **403**, credenciales de integración sin permiso. La protección efectiva queda sin verificar.
- Sin remote Git configurado en este checkout, no se pudo contrastar ramas/historia remota localmente.

## Repositorios similares o mejores según el eje

Los proyectos no resuelven exactamente el mismo problema. “Mejor” depende de si se prioriza un kit SDD maduro, orquestación gobernada, metodología TDD automática o gates de commit en CI. Los recuentos de estrellas y fechas siguientes son una fotografía mutable de GitHub consultada el 2026-10-15, no una métrica de calidad.

| Proyecto | Similitud y puntos fuertes observados | Frente a RayRabbit | Referencia |
|---|---|---|---|
| **OpenSpec** | Base SDD que organiza propuesta, specs, aplicación y archivado dentro del repo; formato Markdown y workflows para agentes. GitHub mostraba ~72k estrellas y actividad el mismo día. | Más maduro como framework SDD y fuente de especificaciones/workflow. No sustituye por sí solo el gate de causalidad de commits que intenta añadir RayRabbit. | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) |
| **GitHub Spec Kit** | Toolkit general de SDD; flujo constitution → specify → plan → tasks → implement/converge; documenta integraciones con agentes, workflows, hooks de extensión y overlays. ~141k estrellas en la consulta. | Mucho más amplio/maduro para SDD y ecosistema de agentes. No se encontró en esta inspección que su objetivo central sea validar causalidad RED/GREEN por historial de commits. | [github/spec-kit](https://github.com/github/spec-kit) |
| **Spec Kitty** | Gobernanza git-native: misiones, work packages, lanes de revisión/aceptación, worktrees aislados, estado de merge y soporte multiagente. ~1,7k estrellas; actualizado el día de la consulta. | Es la alternativa más cercana si se busca un workflow gobernado de extremo a extremo y revisión trazable. Aporta más seguimiento/orquestación que el pequeño ejemplo de RayRabbit; no se debe asumir que replica exactamente sus reglas de commit sin validar versión/configuración. | [spec-kitty/spec-kitty](https://github.com/spec-kitty/spec-kitty) |
| **Superpowers** | Metodología y skills de agente para brainstorming, planes, subagentes, TDD RED/GREEN/REFACTOR y revisión entre tareas. ~300k estrellas en la consulta. | Más desarrollado como comportamiento/workflow del agente y disciplina TDD. Por sí mismo no es equivalente a un validador de commits exigido por branch protection. | [obra/superpowers](https://github.com/obra/superpowers) |

**Recomendación comparativa:**

- Si el requisito diferencial e innegociable es **rechazar ciertos historiales de commit en CI**, RayRabbit ofrece una pieza específica que los proyectos SDD/skills anteriores no necesariamente reemplazan. Primero hay que corregir F-01 y conectar F-02.
- Para **SDD más maduro y amplio**, empezar por OpenSpec o GitHub Spec Kit; no atribuirles automáticamente causalidad de commits.
- Para **gobernanza de work items, aceptación humana y trabajo paralelo aislado**, evaluar Spec Kitty.
- Para **workflow TDD en el agente**, evaluar Superpowers.
- Una combinación razonable sería OpenSpec/Spec Kit como ciclo de especificación, Superpowers como workflow de implementación y un gate CI pequeño, probado y exacto para las políticas de commits que realmente se necesiten. Spec Kitty es alternativa si la unidad central es misión/work package y coordinación multiagente.

## Recomendaciones priorizadas

1. **P0 — Cerrar el bypass de scope.** Eliminar coincidencias por sufijo para scopes inferidos; usar identidad canónica exacta test↔producción; añadir los casos `auth → billing/auth` en ambos self-tests y una prueba de paridad.
2. **P0 — Alinear claim de RED con enforcement.** Hacer que CI compruebe el fallo legítimo asociado al commit/test RED o cambiar los README/docs para declarar que la validación RED requiere ejecución local disciplinada y no está probada por el historial CI.
3. **P1 — Enlazar producción con OpenSpec.** Exigir ID/change aprobado o especificación asociada cuando una change afecte API, seguridad o comportamiento, si “ningún código sin spec” pretende ser una regla mecánica.
4. **P1 — Verificar branch protection en el repositorio real.** Hacer obligatorios los checks correctos, aplicar reviews y CODEOWNERS, comprobar que los owners son válidos y capturar evidencia del ruleset efectivo. Mientras no se verifique, llamarlo “configuración disponible”, no “merge bloqueado”.
5. **P1 — Corregir el informe red team.** Retirar o reescribir los dos hallazgos F-01/F-02 con PoCs válidos y comprobar que el auditor prueba las mitigaciones actuales antes de emitir conclusiones.
6. **P2 — Precisión en nombres/claims de E2E y ASVS.** Describir estos tests como pipeline funcional en proceso; presentar redteam como batería heurística, no como certificación ASVS L3.
7. **P2 — Probar sobre más de un ejemplo.** Añadir un fixture multi-módulo con nombres repetidos, cambios de API/spec, Python y TypeScript, además de un historial RED/GREEN real creado en una rama temporal de pruebas CI.
8. **P2 — Reducir divergencia Node/Python.** Mantener vectores de entrada/salida compartidos para fuzzing diferencial y probar equivalencia de ambos validadores en CI.
9. **P3 — Precisar el efecto prometido.** Sustituir “eliminar vibe coding” por una promesa acotada: elevar trazabilidad y bloquear clases definidas de commits, sujeto a branch protection y a la exactitud de heurísticas.

## Bitácora de comandos ejecutados

Se listan comandos de shell usados para validación o investigación, con el resultado observado. Las consultas de lectura de archivos del editor y llamadas internas de herramientas no son comandos de shell. No se ejecutó un `npm ci`, no se hizo commit y no se modificó el cambio preexistente de `package-lock.json`.

| Comando | Resultado |
|---|---|
| `git status --short --branch` | `## main`; `M package-lock.json` preexistente. |
| `git log -8 --oneline --decorate` | Solo `bc4c030 (HEAD -> main) Initial commit`. |
| `git remote -v` | Sin salida; no hay remote configurado en el checkout. |
| `npm run verify:gates:self-test && npm run verify:gates:py:self-test` | Ambos pasan. |
| `npm run spec:validate` | 2 passed, 0 failed. |
| `npm run test:ts:coverage` | 22/22 pasan; 87,61% líneas y 77,27% ramas. |
| `npm run test:py:coverage` | Falló varias veces con opciones `--cov*` no reconocidas porque el `pytest` ejecutado no carga `pytest-cov`. |
| `npm run build` | Pasa (`tsc`). |
| `node scripts/redteam-audit.mjs` | 12 pruebas; dos hallazgos medios y cero críticos/altos. No se pasó `--report`, para no sobrescribir el reporte existente. |
| `gh search repos 'spec-driven development AI coding agent harness TDD' --limit 15 --json fullName,description,url,stargazersCount,updatedAt,license` | Sin resultados útiles. |
| `gh search repos openspec --limit 10 --json fullName,description,url,stargazersCount,updatedAt,license` | Encuentra OpenSpec y proyectos relacionados. |
| `gh search repos 'spec-kit' --limit 10 --json fullName,description,url,stargazersCount,updatedAt,license` | Encuentra GitHub Spec Kit y alternativas. |
| `gh search repos 'AI coding agent TDD harness governance CI' --limit 15 --json fullName,description,url,stargazersCount,updatedAt,license` | Sin resultados útiles. |
| `gh repo view Fission-AI/OpenSpec --json description,stargazerCount,pushedAt,url,licenseInfo,repositoryTopics` | Metadata válida: ~72.024 estrellas; MIT; activo 2026-10-15. |
| `gh repo view github/spec-kit --json description,stargazerCount,pushedAt,url,licenseInfo,repositoryTopics` | Metadata válida: ~141.388 estrellas; MIT; activo 2026-10-15. |
| `gh repo view spec-kitty/spec-kitty --json description,stargazerCount,pushedAt,url,licenseInfo,repositoryTopics` | Metadata válida: ~1.685 estrellas; MIT; activo 2026-10-15. |
| `gh repo view obra/superpowers --json description,stargazerCount,pushedAt,url,licenseInfo,repositoryTopics` | Metadata válida: ~299.642 estrellas; MIT; actualizado 2026-10-10. |
| `gh api repos/rayrabbit-ai/ai-engineering --jq '{html_url,default_branch,created_at,updated_at,pushed_at,stargazers_count,license:.license.spdx_id}'` | Repo público; creado 2026-10-14; push 2026-10-15; 0 estrellas en la consulta; MIT. |
| `gh api repos/rayrabbit-ai/ai-engineering/branches/main/protection` | No verificable: HTTP 403 `Resource not accessible by integration`. |
| `gh repo view ... --json ...,license` | Falló: el campo `license` no existe en `gh repo view`; se reintentó con `licenseInfo`. |
| `gh api repos/{repo}/readme --jq .content  base64 -d  rg ...` | Falló porque `rg` no está instalado en este contenedor. |
| `gh api repos/Fission-AI/OpenSpec/readme --jq .content  base64 -d  grep -Ein 'proposal|change|spec|agent|workflow|test|apply|archive'  head -n 24` | Documentación oficial confirma flujo proposal/spec/apply/archive. |
| `gh api repos/github/spec-kit/readme --jq .content  base64 -d  grep -Ein 'specification|plan|tasks|agent|workflow|test|implementation|constitution'  head -n 24` | Confirma constitution/specify/plan/tasks, integraciones y hooks/workflows. |
| `gh api repos/spec-kitty/spec-kitty/readme --jq .content  base64 -d  grep -Ein 'charter|mission|worktree|governance|workflow|agent|test|commit|review|kanban'  head -n 24` | Confirma work packages, worktrees y gates de review/accept/merge. |
| `gh api repos/obra/superpowers/readme --jq .content  base64 -d  grep -Ein 'TDD|test-driven|brainstorm|plan|subagent|code review|agent|workflow|commit'  head -n 24` | Confirma método/skills TDD, planificación y code review. |
| `npm audit --audit-level=high` | 0 vulnerabilidades. |
| `npm run guard` | Pasa. |
| `npm run test:ts:e2e` | 1/1 pasa. |
| `pytest -m legacy_baseline --tb=short` | 2 passed, 18 deselected. |
| `pytest -m e2e --tb=short` | 1 passed, 19 deselected. |
| `npm run verify:red:self-test && npm run verify:red:py:self-test` | Ambos pasan. |
| `npm run verify:gates -- --allow-dirty` | Acepta el commit inicial de plantilla como base. |
| `npm run verify:gates:py -- --allow-dirty` | Acepta el mismo commit inicial como base. |
| PoC Node `validateCommitList` para `tests/auth.test.ts` + `src/billing/auth.ts` | `[]`; el caso es aceptado. |
| PoC Python `validate_commit_list` para `tests/test_auth.py` + `src/billing/auth.py` | `[]`; el caso es aceptado. |
| `python --version`; `command -v pytest`; `head -n 1 /usr/local/py-utils/bin/pytest`; `readlink -f /usr/local/py-utils/bin/pytest` | Python 3.14.2; shim apunta a venv separado `/usr/local/py-utils/venvs/pytest/bin/python`. |
| `/usr/local/py-utils/venvs/pytest/bin/python -m pip show pytest-cov` | Paquete ausente en el entorno del ejecutable pytest. |
| `/usr/local/py-utils/venvs/pytest/bin/python -c "import sys; print(sys.executable); import pytest_cov; print(pytest_cov.__file__)"` | `ModuleNotFoundError: pytest_cov`. |
| `git status --short` (repetido tras validaciones) | Solo `M package-lock.json`; no se generaron cambios rastreados adicionales antes de este informe. |

**Nota de entorno:** la instalación de dependencias por la herramienta de entorno Python informó éxito para el intérprete seleccionado por VS Code, pero la comprobación directa del intérprete del shim de `pytest` siguió mostrando que no tiene `pytest-cov`. Por eso prevalece el resultado observable del runner y se declara coverage Python local como no verificada.

## Alcance y evidencia no obtenida

- No se modificó código de producción/tests ni se corrigió ningún finding durante esta auditoría. El único archivo nuevo solicitado es este informe.
- Se preservó sin tocar `package-lock.json`, que ya aparecía modificado al comenzar.
- No se verificaron en vivo rulesets/protecciones de GitHub por falta de permiso API.
- No se comprobó enforcement en todos los agentes (Antigravity, Cursor, Claude Code, Copilot, etc.) ni cada combinación de versión/plugin.
- Los resultados de las suites describen este checkout/entorno; no sustituyen CI limpia en Ubuntu/Python 3.11 según el workflow.
- Los datos de popularidad de repos externos cambian con el tiempo y se incluyen solo para orientar la comparación, nunca como prueba de calidad.
