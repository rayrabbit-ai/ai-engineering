# Informe de auditoría técnica externa

> **Actualización:** este informe conserva los hallazgos observados antes de las correcciones. Para el estado de remediación, pruebas posteriores y opciones para obtener los archivos actualizados, consulta [el informe de correcciones](informe-correcciones-auditoria.es.md).

**Objeto:** verificación de las afirmaciones públicas y búsqueda de vulnerabilidades en `rayrabbit-ai/ai-engineering`  
**Fecha de corte:** 14 de octubre de 2026  
**Alcance:** revisión estática del repositorio disponible, ejecución local de pruebas y gates, análisis de dependencias y búsqueda pública de proyectos comparables.  
**Tipo de informe:** evaluación técnica externa basada en evidencia accesible; no es una certificación formal ni una prueba de penetración del servicio GitHub.

## Opinión ejecutiva

**Conclusión: las afirmaciones son parcialmente ciertas, pero el nivel de enforcement anunciado está sobreestimado.** El repo contiene una base útil: OpenSpec, pruebas TS/Python, validadores de historial, workflows y documentación de proceso. Sin embargo, varios requisitos descritos como deterministas o físicamente bloqueados dependen de convenciones para el agente o de configuración de GitHub no comprobada. Los validadores tienen bypasses reproducibles y una vulnerabilidad de inyección de comandos.

**Prioridad inmediata:** no presentar el acoplamiento de commits como una garantía estricta hasta resolver los hallazgos **F-01 a F-05**. El análisis de dependencias también encontró advisories graves en el toolchain Node, incluido RCE en `tinypool`.

El intérprete Python ya estaba instalado en el entorno (`Python 3.14.2`). Para ejecutar la suite se instalaron los extras de test del proyecto; no se instaló otro intérprete ni se modificó ningún archivo versionado. El cambio de esta tarea se limita a este informe.

## Alcance y criterios

Se revisaron README en inglés/español, reglas de agente, workflows, scripts Python/Node, configuración de cobertura, configuración de rama, documentación OpenSpec y pruebas. Se ejecutaron los self-tests de ambos validadores, suites TS/Python, OpenSpec, auditorías de dependencias y dos probes de seguridad inocuos.

Criterios de evaluación:

- **Enforcement efectivo:** la condición debe producir un fallo mecánico en el código o en un control independiente, no depender solo de instrucciones al agente.
- **Causalidad TDD:** debe existir evidencia de un test que falló antes de la implementación y una relación verificable entre el test y el código.
- **Integridad del gate:** un PR no debe poder reemplazar la política que evalúa ese mismo PR sin revisión o fuente confiable independiente.
- **Bloqueo GitHub:** requiere workflows exitosos y configuración activa de branch protection/rulesets; un README no acredita dicha configuración.
- **Comparables:** se comparan por función y alcance, no solo por estrellas.

**Límite de acceso:** el endpoint público de protección de `main` respondió HTTP 401. No se contó con permisos autenticados para verificar en GitHub la protección activa, los checks requeridos, las reglas de review ni los permisos del repositorio. Por tanto, este informe no afirma que la rama esté desprotegida; afirma que no pudo verificarse desde este entorno.

## Evaluación de las afirmaciones

| Afirmación | Dictamen | Evidencia y matiz |
|---|---|---|
| “Deterministic AI engineering harness” | **Parcial** | Los validadores son deterministas sobre los commits que reciben, pero sus entradas y sus propias reglas no están protegidas de forma independiente. Hay bypasses demostrados (F-01, F-02). |
| OpenSpec + TDD estricto | **Parcial** | OpenSpec valida correctamente la estructura existente. CI no exige que cada cambio de producción tenga un change aprobado enlazado ni registra que el test RED haya fallado. |
| Causalidad TDD acoplada por scope | **No demostrada como garantía** | Se validan prefijos y nombres de archivos; no la ejecución del test. Una ruta de test con módulo vacío permite scope universal y GREEN no relacionado (F-03). |
| Gates de commits impuestos por CI | **Existe implementación, con bypasses** | El workflow corre en PR, pero ejecuta scripts procedentes del mismo checkout que está evaluando. Un PR puede debilitar el gate y sus self-tests (F-01). El job de `push` usa un rango base que normalmente coincide con HEAD (F-04). |
| Bloqueo físico de merge | **No verificable en vivo** | El workflow existe y hay un script para configurar branch protection; la configuración real no fue accesible por API. Además, el script de setup establece `required_pull_request_reviews: null` (F-05). |
| Dual-mode “Invariant vs HITL” | **Playbook, no mecanismo automatizado** | Las reglas documentan invariantes y escalamiento tras reintentos. No se encontró un controlador que limite intentos, aplique HITL o supervise el modo de autonomía. |
| Soporte Antigravity, Cursor, Claude Code y más | **Documentado, integración dispar** | Hay una estructura `.agent/`; no se encontraron `CLAUDE.md`, `.cursor/rules/`, `GEMINI.md` ni adaptadores equivalentes en la raíz. No se demuestra que todos esos clientes carguen las mismas reglas automáticamente. |
| Polyglot TS/Python | **Cierto para estos dos stacks** | Ambos tienen pruebas, cobertura y jobs. El detector reconoce extensiones adicionales, pero no existe suite ni pipeline completo de Go/Rust/Java en este repo. |
| Evidencia empírica A/B | **Caso narrado, reproducibilidad limitada** | La documentación describe sesiones, pero no se hallaron datos brutos, scripts del benchmark, identificadores de modelos, prompts íntegros ni réplica automatizada del experimento. No equivale a un benchmark independiente reproducible. |
| Cobertura Python líneas ≥80% y ramas ≥75% | **Umbral separado no demostrado** | `branch = true` activa medición de ramas y `fail_under = 80` aplica un único mínimo global combinado; el job no configura un mínimo independiente de ramas de 75%. |

Referencias principales: [README en español](../README.es.md#L25), [workflow de gates](../.github/workflows/gate-validator.yml#L4), [validador Node](../scripts/verify-gates.mjs#L117), [validador Python](../scripts/verify_gates.py#L138), [setup de branch protection](../scripts/setup_branch_protection.py#L48), [guard de archivos](../scripts/guard-agent.mjs#L52), [configuración de cobertura Python](../pyproject.toml#L36), [caso de estudio A/B](ab-testing-and-coverage.md#L10).

## Hallazgos

### F-01 — El PR puede modificar el gate que lo evalúa

**Severidad: Alta | Confianza: Alta | Tipo: integridad de CI / bypass de controles**

El workflow hace checkout del código del evento y después ejecuta `scripts/verify-gates.mjs`, `scripts/guard-agent.mjs` y sus self-tests desde ese mismo checkout. No se encontró `CODEOWNERS` ni un mecanismo que exija revisión independiente de `.github/workflows/`, `scripts/verify-*` o las reglas. `guard-agent.mjs` comprueba principalmente la existencia de archivos; no compara hashes ni valida su contenido.

**Impacto:** un PR puede modificar el validador, sus self-tests o el guard para aceptar cambios que la versión confiable habría rechazado. Eso anula el propósito de que el status check sea una barrera independiente. El script de branch protection, además, no exige revisiones.

**Recomendación:** mover la política crítica a un workflow reusable ubicado en una referencia protegida e inmutable; proteger workflows, validadores y reglas con `CODEOWNERS` más aprobación obligatoria; impedir que un PR cambie el job requerido a una implementación no confiable. Hacer que el guard valide hashes o contratos concretos, no solo existencia.

Evidencia: [workflow y ejecución de self-test](../.github/workflows/gate-validator.yml#L26), [verificación solo de existencia](../scripts/guard-agent.mjs#L52), [sin requisito de review en el setup](../scripts/setup_branch_protection.py#L53).

### F-02 — Inyección de comandos en ambos validadores

**Severidad: Alta si el argumento es controlable por terceros; Media en invocación exclusivamente local confiable | Confianza: Alta | CWE-78**

El validador Node concatena `--base`/`--head` en comandos enviados a `execSync`. El Python usa `subprocess` con `shell=True` y concatena los mismos valores. Una referencia Git diseñada puede ejecutar comandos arbitrarios con los permisos del proceso.

La prueba se hizo únicamente con `printf`: `--base 'HEAD; printf "NODE_INJECTION_PROBE|test(red): injected"'` y su variante Python. Ambos procesos informaron dos commits aunque el historial solo contiene uno; el texto inyectado fue convertido en una entrada de commit falsa y procesado por el validador. No se escribió ni borró ningún archivo.

**Impacto:** ejecución de comandos en la máquina o runner donde se invoque el script con una referencia no confiable. En CI la explotabilidad remota depende de quién puede influir el argumento; sigue siendo un defecto claro de la interfaz CLI.

**Recomendación:** no usar shell para invocar Git. Pasar argumentos como arrays (`spawnSync('git', [...])` en Node y `subprocess.run([...], shell=False)` en Python); validar referencias con `git check-ref-format --allow-onelevel` y resolverlas a SHA antes de formar rangos. Añadir pruebas negativas con metacaracteres de shell.

Evidencia: [Node ejecuta comandos de shell](../scripts/verify-gates.mjs#L92), [Node interpola HEAD y base](../scripts/verify-gates.mjs#L408), [Python activa shell](../scripts/verify_gates.py#L116), [Python interpola referencias](../scripts/verify_gates.py#L383).

### F-03 — Bypass reproducible del scope RED → GREEN

**Severidad: Alta para la promesa central del producto | Confianza: Alta**

Ambas implementaciones convierten a scope universal `*` un `test(red)` cuando hay archivo de test, pero no se pudo inferir el nombre del módulo. La ruta `tests/test_.py` es reconocida como test; al quitar `test_`, el módulo queda vacío y se añade `*`. Cualquier archivo de producción queda entonces cubierto por ese RED.

La prueba en memoria con `tests/test_.py` seguida de `src/unrelated.ts` devolvió **cero errores** en Node y Python. Los self-tests actuales no prueban este caso.

**Impacto:** un commit RED vacío o mal nombrado puede habilitar un GREEN de otro módulo; por tanto, el scope coupling anunciado puede eludirse sin falsificar Git.

**Recomendación:** no convertir scopes vacíos en universales. Rechazar RED sin módulo explícito identificable y exigir scope explícito/normalizado. Añadir prueba adversarial idéntica en ambas implementaciones; considerar compartir una sola implementación para evitar deriva.

Evidencia: [fallback universal Node](../scripts/verify-gates.mjs#L156), [uso de scope universal Node](../scripts/verify-gates.mjs#L182), [fallback universal Python](../scripts/verify_gates.py#L177).

### F-04 — El evento `push` puede auditar un rango vacío

**Severidad: Media | Confianza: Alta sobre el rango; impacto sujeto a configuración de rama**

El workflow se dispara en `push` a `main`. Cuando `github.base_ref` no está definido, usa `origin/main` como base y compara `origin/main..HEAD`. En un push posterior al evento, la referencia remota normalmente ya apunta al commit enviado; el validador puede no ver ningún commit nuevo. El evento `pull_request` sí dispone de una base de PR distinta.

**Impacto:** el job de push no constituye una auditoría confiable del commit recién enviado. No se concluye que sea posible escribir directamente en `main`, porque no se pudo inspeccionar la branch protection real.

**Recomendación:** para push comparar `github.event.before` con `github.event.after`/HEAD, manejar explícitamente el SHA cero del primer push y mantener la auditoría de PR como camino requerido. Añadir una prueba de workflow que demuestre el rango esperado.

Evidencia: [triggers](../.github/workflows/gate-validator.yml#L4), [base calculada desde `base_ref` o `main`](../.github/workflows/gate-validator.yml#L34), [lectura del rango por el validador](../scripts/verify-gates.mjs#L456).

### F-05 — El script de branch protection elimina la exigencia de reviews

**Severidad: Alta si se ejecuta en el repositorio objetivo | Confianza: Alta sobre el payload**

Ambos scripts envían `required_pull_request_reviews: null` en una petición PUT de branch protection. En la API de GitHub ese valor representa ausencia de regla de revisión requerida; no es una forma de exigir revisión humana.

**Impacto:** quien ejecute el script esperando “bloqueo físico” puede dejar los status checks requeridos pero sin revisión de PR obligatoria, y puede reemplazar la configuración de branch protection existente con este payload.

**Recomendación:** no enviar `null` para un control que se pretende exigir. Configurar explícitamente `required_approving_review_count` y las reglas deseadas; leer/respaldar la configuración existente, mostrar el diff y requerir confirmación antes de sobrescribir settings.

Evidencia: [payload Python](../scripts/setup_branch_protection.py#L53), [payload Bash](../scripts/setup-branch-protection.sh#L40).

### F-06 — Vulnerabilidades en dependencias de desarrollo Node

**Severidad: Alta en el toolchain CI/local; 3 advisories críticos reportados | Confianza: Alta; `npm audit`**

`npm audit` reportó **10 vulnerabilidades** en el árbol de desarrollo del lockfile: 3 críticas, 5 altas y 2 moderadas. Entre las rutas afectadas aparecen `tinypool` (prototype pollution con RCE; GHSA-5gmw-xhrv-c9v3 y GHSA-85c8-ppgw-ccpr), `vitest`/`@vitest/coverage-v8`, `vite`/`vite-node`, `esbuild`, y `@fission-ai/openspec` mediante `fast-glob`/`micromatch`/`braces`.

El arreglo que `npm audit` propuso requiere saltos mayores (Vitest 5 y OpenSpec 0.17.2 según el resolvedor; `isSemVerMajor: true`). No se aplicó `npm audit fix --force`. `npm audit --omit=dev` encontró cero vulnerabilidades en dependencias de runtime; `package.json` no declara dependencias de runtime, pero el código vulnerable sí se instala y ejecuta en CI y desarrollo.

**Recomendación:** actualizar en una rama dedicada y validar compatibilidad, primero Vitest/coverage y el paquete OpenSpec; fijar versiones; introducir Dependabot/Renovate y `npm audit` como gate con política de severidad. No aceptar la ausencia de dependencias runtime como razón para ignorar RCE en runners.

Advisories: [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

### F-07 — La validación inicial local falla en el commit base actual

**Severidad: Media para adopción/operación | Confianza: Alta**

Este checkout tiene un solo commit (`be293ec`, `Initial commit`) y no tiene remoto configurado. Ejecutar `npm run verify:gates` y `python scripts/verify_gates.py` hace que el fallback audite el commit inicial, cuyo subject no pertenece a los prefijos admitidos; ambos terminan con exit code 1.

**Impacto:** el Quickstart invita a ejecutar `npm run verify:gates`, pero en un clone inicial sin remoto el comando falla antes de que exista un flujo de trabajo útil. Tampoco permite distinguir un historial semilla de una violación real.

**Recomendación:** definir una política explícita para el commit raíz/template; documentar el primer commit válido o permitir un baseline configurado, sin relajar la validación para commits posteriores.

### F-08 — RED no demuestra que una prueba falló ni que la spec fue aprobada

**Severidad: Media | Confianza: Alta**

El validador comprueba que el mensaje tenga `test(red)`, que se haya tocado una ruta reconocida como test y que el archivo de producción corresponda al módulo inferido. No captura resultado de ejecución, transcript firmado ni artefacto del test fallido. Tampoco exige que un cambio de producción tenga un proposal/change OpenSpec aprobado; la validación OpenSpec revisa documentos presentes, no la relación entre esos documentos y cada commit.

Las reglas de aprobación humana, “no código antes de tests”, reintentos máximos y escalamiento HITL residen principalmente en documentos/workflows del agente. El workflow CI no ejecuta tests E2E de Python: sus pasos ejecutan `legacy_baseline` y luego `unit or integration`, con lo que `e2e` queda excluido.

**Recomendación:** reformular la garantía como “verifica convenciones de historial” hasta añadir attestations verificables de ejecución, vínculo de tarea/change a commits, y job E2E real cuando sea requisito. No afirmar enforcement humano/HITL donde solo hay instrucciones.

### F-09 — El umbral Python no es 80% líneas y 75% ramas por separado

**Severidad: Media | Confianza: Alta**

`pyproject.toml` habilita branch coverage y un único `fail_under = 80`; el job también pasa `--cov-branch --cov-fail-under=80`. Esto no configura dos límites independientes (líneas 80 y ramas 75). En la ejecución local, pytest-cov reportó 86.60% total combinado y 87% redondeado, pero no se configuró un fallo separado para ramas.

**Recomendación:** medir y comparar métricas de líneas y ramas por separado en CI con umbrales explícitos; documentar con precisión lo que el comando sí garantiza.

### F-10 — Riesgo de cadena de suministro y reproducibilidad

**Severidad: Media | Confianza: Alta sobre la configuración**

Los workflows ejecutan `npx --yes @fission-ai/openspec` sin versión, aunque el paquete está declarado en `package.json`. El job TS usa `npm ci || npm install`, permitiendo un fallback no reproducible si falla la instalación bloqueada. Python instala rangos abiertos (`pytest>=8`, `pytest-cov>=5`) sin lockfile. No se establecen `permissions:` mínimos a nivel de workflow y las acciones se referencian por tags mayores (`@v4`, `@v5`).

**Recomendación:** instalar desde lockfiles (`npm ci`, constraints/lock Python); ejecutar la versión instalada de OpenSpec; quitar fallback silencioso; fijar actions por SHA según política del equipo; definir `permissions: contents: read` y ampliar solo cuando sea indispensable.

## Comentarios de auditoría adicionales

- `guard-agent.mjs` se describe como guardián de integridad, pero solo comprueba presencia de archivos requeridos; no detecta contenido debilitado, versiones sustituidas o borrado de reglas y recreación de directorios.
- El clasificador de archivos y scope utiliza heurísticas de rutas/nombres. Puede tener colisiones de basename, extensiones no previstas y falsos positivos/negativos en repositorios reales.
- El self-test tiene casos adversariales útiles, pero no incluye el scope vacío, metacaracteres de shell, modificación del propio validador ni el caso del commit inicial.
- La implementación Node/Python duplica lógica de seguridad. Los dos aceptaron el mismo bypass; mantener equivalencia requerirá pruebas diferenciales compartidas.
- `npx --yes` en ambos workflows se resuelve desde el registro al ejecutar CI; la validación local pasó, pero eso no fija la versión usada en cada ejecución futura.
- La respuesta HTTP 401 al consultar branch protection es una limitación de acceso, no evidencia de que falte protección.

## Repositorios comparables

Las estrellas y forks son una captura de la API pública de GitHub consultada el **14-10-2026**; cambian con el tiempo y no son una medida de corrección o seguridad. Se revisaron README/metadatos de los proyectos, no se hizo una auditoría de seguridad equivalente de cada uno.

| Proyecto | Popularidad observada | Qué resuelve | Comparación útil |
|---|---:|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | 141.199 estrellas | Toolkit SDD oficial de GitHub, con especificación, planificación e implementación para agentes | Mucho mayor adopción y cobertura de flujo SDD. No se presenta aquí como reemplazo demostrado del gate causal RED/GREEN de commits. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 71.890 estrellas | SDD basado en artefactos de cambio/spec y workflows para asistentes; es el motor que usa este repo | Buena elección para la capa de specs; por sí solo no acredita gates causales de Git. |
| [Superpowers](https://github.com/obra/superpowers) | 298.854 estrellas | Framework de skills/metodología para agentes; README cubre TDD y varios clientes, incluidos Claude Code, Antigravity y Cursor | Más maduro/popular para instrucciones y workflows multi-agente; no equivale automáticamente a branch protection independiente. |
| [Probity](https://github.com/nizos/probity) | 227 estrellas | Hooks que inspeccionan cada escritura/comando; reglas TDD para Claude Code, Codex y GitHub Copilot CLI | Candidato fuerte para impedir pasos ilegales dentro de la sesión del agente. Distinto al historial auditable de commits; revisar límites del hook antes de adoptarlo. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | 1.682 estrellas | SDD con gobernanza organizacional, misiones/work packages, estados de revisión y worktrees aislados; declara soporte multi-agente | El más cercano en gobernanza repo-native y ejecución de varios agentes. No se verificó que fuerce exactamente un test fallido por commit. |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | 3.766 estrellas | Plugin de SDD que declara integración con Antigravity y Claude Code | Opción concreta si la integración Antigravity es prioritaria; no sustituye por sí mismo a un gate de historial. |
| [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 54.117 estrellas | Metodología ágil con agentes/roles para desarrollo de software | Más amplio en planificación y coordinación; no es un auditor estricto de causalidad de commits. |
| [TDD Guard](https://github.com/nizos/tdd-guard) | 2.361 estrellas | Enforcement TDD para Claude Code; su README dirige a Probity como sucesor | Útil como referencia histórica; evaluar Probity para nuevas instalaciones. |
| [Another Agent Skills](https://github.com/juandelossantos/another-agent-skills) | 1 estrella | Declara hooks locales, TDD gate, required CI check y adapters para varios agentes | Es la descripción pública más parecida a este repo en commit gates; adopción muy baja y no auditamos su implementación, por lo que no se recomienda sin revisión propia. |

### Recomendación comparativa

No hay un “mejor” único para todos los objetivos. Una composición pragmática sería mantener **OpenSpec** para las especificaciones, evaluar **Spec Kit** o **Superpowers** para mejorar workflow/integraciones de agentes, y probar **Probity** si se necesita enforcement durante la sesión. Si se busca gobernanza multi-agente repo-native, evaluar **Spec Kitty**. Ninguna de esas elecciones elimina la necesidad de proteger la política de CI con permisos, revisiones y una fuente confiable.

El diferenciador potencial de este repo es el historial Git explícitamente etiquetado por fases. Antes de promoverlo como ventaja determinista hay que cerrar F-01 a F-05, enlazar los commits con evidencia real del RED, separar coverage Python y proteger dependencias.

## Plan de remediación priorizado

### P0 — Antes de afirmar “enforcement determinista”

- Reemplazar `shell=True`/`execSync` de strings por invocaciones de Git con argumentos seguros y validar refs.
- Proteger la fuente del gate frente al PR que está siendo evaluado: CODEOWNERS/reviews, workflow reusable confiable y permisos mínimos.
- Eliminar el scope universal como fallback; rechazar módulos vacíos y agregar casos adversariales en ambos lenguajes.
- Corregir `required_pull_request_reviews` y verificar con credenciales autorizadas la branch protection real.

### P1 — Cerrar brechas de CI y dependencias

- Usar `github.event.before`/`after` para auditorías de `push`; probar rangos PR y push.
- Resolver los advisories npm con upgrades revisados, empezando por `tinypool`/Vitest y OpenSpec transitivo; no usar `--force` a ciegas.
- Hacer que Python y Node consuman una matriz de pruebas de comportamiento compartida.
- Fijar OpenSpec y dependencias Python; retirar fallback silencioso de `npm install`.

### P2 — Alinear documentación y calidad

- Establecer umbrales distintos para líneas y ramas Python, y ejecutar E2E si se presenta como gate.
- Exigir y enlazar change OpenSpec con el código que modifica; distinguir aprobación documentada de validación automática.
- Crear adapters reales para cada agente anunciado o acotar la lista de compatibilidad.
- Etiquetar el A/B como estudio de caso ilustrativo o publicar datos/procedimiento reproducible.
- Definir comportamiento explícito para el commit inicial del template y verificar que `npm run verify:gates` funcione en un clone nuevo.

## Resultados de pruebas y análisis

| Comprobación | Resultado |
|---|---|
| Self-test Node `verify-gates.mjs --self-test` | Pasa; no detecta F-03 ni F-02. |
| Self-test Python `verify_gates.py --self-test` | Pasa; no detecta F-03 ni F-02. |
| TypeScript baseline | 1 archivo, 3/3 pruebas pasan. |
| TypeScript cobertura | 3 archivos, 20/20 pasan; líneas 90.64%, ramas 78.48%, funciones 94.11%, statements 90.64%. |
| Python baseline | 2 pasan, 18 seleccionados fuera. |
| Python unit/integration + cobertura | 17 pasan, 3 fuera; total combinado 86.60% (87% redondeado). Requirió instalar `.[test]`. |
| OpenSpec `validate --all` | 2 válidos, 0 fallidos. |
| Gate real Node/Python en HEAD | Ambos fallan por `Initial commit` sin prefijo aceptado; exit code 1. |
| Probe scope vacío | Node y Python aceptan `tests/test_.py` → `src/unrelated.ts` sin errores. |
| Probe shell | Ambos ejecutan salida inyectada inocua y la procesan como commit falso. |
| `npm audit` | 10 vulnerabilidades: 3 críticas, 5 altas, 2 moderadas, todas en árbol de desarrollo. |
| `npm audit --omit=dev` | 0 vulnerabilidades. |
| `pip-audit` sobre extras instalados de test | No se encontraron vulnerabilidades conocidas en esas versiones instaladas. No es un lockfile de proyecto. |
| Branch protection de GitHub | No comprobable: endpoint público respondió 401 sin autenticación. |
| Guard de agentes | Se intentó ejecutar; la herramienta no devolvió salida verificable. No se considera un resultado aprobado. |

## Registro de comandos ejecutados

Se registran los comandos de terminal de esta auditoría, incluidos intentos fallidos o con salida no capturada. Las búsquedas de archivos/lecturas realizadas desde las herramientas del editor no son comandos de shell y se describen en “Alcance”. Los comandos HTTP consultaron endpoints públicos; no se usaron credenciales.

| # | Comando | Resultado |
|---:|---|---|
| 1 | `git status --short && rg -n "commit|gate|scope|causal|Invariant|HITL|autonomy|OpenSpec|TDD|Antigravity|Cursor|Claude Code|polyglot" README.md README.es.md CONTRIBUTING.md CONTRIBUTING.es.md QUICKSTART.md QUICKSTART.es.md MANUAL_OPERATIVO.md MANUAL_OPERATIVO.es.md OPERATIONAL_MANUAL.md package.json pyproject.toml scripts openspec .github 2>/dev/null` | Estado limpio; la búsqueda con `rg` no produjo evidencia en esa llamada. Más tarde se observó que `rg` no está instalado en la shell. |
| 2 | `pwd` | `/workspaces/ai-engineering`. |
| 3 | `node scripts/verify-gates.mjs --self-test` | Pasa. |
| 4 | `python scripts/verify_gates.py --self-test` | Pasa. |
| 5 | `curl -fsSL 'https://api.github.com/search/repositories?q=spec-driven+development+AI+coding+agent&sort=stars&order=desc&per_page=10' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research'` | Búsqueda pública; respuesta extensa/truncada en la vista, por lo que se repitieron consultas filtradas. |
| 6 | `npm run test:ts:baseline && npm run test:ts:coverage` | Pasa: 3 baseline y 20 pruebas totales; cobertura TS anotada arriba. |
| 7 | `pytest -m legacy_baseline --tb=short && pytest -m 'unit or integration' --cov=src --cov-branch --cov-fail-under=80 --cov-report=term-missing` | Primera ejecución: baseline 2 pasan, falla el segundo comando porque faltaba `pytest-cov`. Se repitió después de instalar extras. |
| 8 | `npx --yes @fission-ai/openspec validate --all` | Pasa: 2 specs/changes válidos. |
| 9 | `curl -fsSL 'https://api.github.com/search/repositories?q=%22TDD%22+%22commit+gate%22+AI+agent&sort=stars&order=desc&per_page=10' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.items[] \| [.full_name, (.stargazers_count\|tostring), .pushed_at, .html_url, (.description // "")] \| @tsv'` | Encontró `another-agent-skills` entre resultados. |
| 10 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers bmad-code-org/BMAD-METHOD rayrabbit-ai/ai-engineering; do curl -fsSL "https://api.github.com/repos/$repo" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '[.full_name, (.stargazers_count\|tostring), (.forks_count\|tostring), .pushed_at, .html_url, (.description // "")] \| @tsv'; done` | Metadatos públicos de proyectos y repo auditado. |
| 11 | `python -m pip install -e '.[test]' && pytest -m legacy_baseline --tb=short && pytest -m 'unit or integration' --cov=src --cov-branch --cov-fail-under=80 --cov-report=term-missing` | Instaló `pytest`, `pytest-cov` y transitivas en el entorno; Python baseline 2 pasan; unit/integration 17 pasan; cobertura total 86.60%. No alteró archivos versionados. |
| 12 | `node --input-type=module -e 'import {validateCommitList} from "./scripts/verify-gates.mjs"; const errors=validateCommitList([{hash:"red0001",subject:"test(red): empty module",changedFiles:["tests/test_.py"]},{hash:"green01",subject:"feat(green): unrelated implementation",changedFiles:["src/unrelated.ts"]}]); console.log(errors.length ? errors.join("\n") : "BYPASS: el validador aceptó RED vacío -> GREEN de módulo no relacionado");'` | Reproduce bypass; reporta `BYPASS`. |
| 13 | `python -c 'from scripts.verify_gates import validate_commit_list; errors=validate_commit_list([("red0001", "test(red): empty module", ["tests/test_.py"]), ("green01", "feat(green): unrelated implementation", ["src/unrelated.ts"])]); print("\n".join(errors) if errors else "BYPASS: el validador aceptó RED vacío -> GREEN de módulo no relacionado")'` | Reproduce el mismo bypass en Python. |
| 14 | `for query in 'TDD+guard+Claude+Code+hooks' 'AI+coding+agent+commit+gate+TDD' 'spec-driven+development+coding+agents'; do curl -fsSL "https://api.github.com/search/repositories?q=$query&sort=stars&order=desc&per_page=8" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.items[] \| [.full_name, (.stargazers_count\|tostring), .pushed_at, .html_url, (.description // "")] \| @tsv'; done` | Búsqueda de TDD guard, commit gate y SDD. Encontró TDD Guard/Probity, Spec Kitty, Conductor y otros. |
| 15 | `find . -maxdepth 4 -type f \( -name 'AGENTS.md' -o -name 'CLAUDE.md' -o -name 'GEMINI.md' -o -path '*/.cursor/rules/*' -o -path '*/.claude/*' -o -path '*/.antigravity/*' -o -name '.pre-commit-config.yaml' -o -path '*/.husky/*' \) -print; curl -sS -o /dev/null -w 'branch-protection-http=%{http_code}\n' 'https://api.github.com/repos/rayrabbit-ai/ai-engineering/branches/main/protection' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research'` | Solo apareció `.agent/rules/AGENTS.md`; API respondió 401. |
| 16 | `python --version && python3 --version && git status --short && git log -6 --oneline --decorate` | Python y Python3 son 3.14.2; HEAD `be293ec (Initial commit)`. |
| 17 | `npm run verify:gates; node_status=$?; python scripts/verify_gates.py; python_status=$?; printf '\nRESULT node=%s python=%s\n' "$node_status" "$python_status"; exit 0` | Ambos validadores fallan sobre el commit inicial; ambos status 1. |
| 18 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers nizos/tdd-guard spec-kitty/spec-kitty gemini-cli-extensions/conductor bmad-code-org/BMAD-METHOD juandelossantos/another-agent-skills; do curl -fsSL "https://api.github.com/repos/$repo" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '[.full_name, (.stargazers_count\|tostring), (.forks_count\|tostring), .pushed_at, .default_branch, .html_url, (.description // "")] \| @tsv'; done` | Captura de métricas de comparables. |
| 19 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers nizos/tdd-guard spec-kitty/spec-kitty gemini-cli-extensions/conductor juandelossantos/another-agent-skills; do printf '\n### %s\n' "$repo"; curl -fsSL "https://api.github.com/repos/$repo/readme" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| rg -ni -m 10 'spec.driven|test.driven|TDD|commit|hook|agent|workflow|CI|enforc|Claude Code|Cursor|Antigravity' \| head -n 8; done` | Intento inicial falló: `rg: command not found`; se repitió usando `grep`. |
| 20 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers nizos/tdd-guard spec-kitty/spec-kitty gemini-cli-extensions/conductor juandelossantos/another-agent-skills; do printf '\n### %s\n' "$repo"; curl -fsSL "https://api.github.com/repos/$repo/readme" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| grep -inE -m 12 'spec.driven|test.driven|TDD|commit|hook|agent|workflow|CI|enforc|Claude Code|Cursor|Antigravity' \| head -n 8; done` | Lee extracts de README; identifica alcances de integración declarados. |
| 21 | `curl -fsSL 'https://api.github.com/repos/nizos/probity' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '[.full_name, (.stargazers_count\|tostring), (.forks_count\|tostring), .pushed_at, .html_url, (.description // "")] \| @tsv'; printf '\n'; curl -fsSL 'https://api.github.com/repos/nizos/probity/readme' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| grep -inE -m 18 'TDD|enforc|Claude|Codex|Copilot|hook|gate|commit|test|CI' \| head -n 14` | Probity metadata/README: hooks y TDD; 227 estrellas. |
| 22 | `npm audit --audit-level=moderate` | Exit no cero; 10 vulnerabilidades en árbol de desarrollo. No se ejecutó `npm audit fix`. |
| 23 | `npm audit --omit=dev` | 0 vulnerabilidades. |
| 24 | `python -m pip install pip-audit` | Instaló scanner temporal en el entorno, no en dependencias del proyecto. |
| 25 | `pip-audit -r <(python -m pip freeze \| grep -Ei '^(pytest|pytest-cov|coverage|pluggy|iniconfig|packaging|pygments)(==|@)')` | Ninguna vulnerabilidad conocida en versiones instaladas auditadas. |
| 26 | `npm audit --json \| jq -r '"SUMMARY " + (.metadata.vulnerabilities\|tojson), (.vulnerabilities\|to_entries[]\|[.key,.value.severity,(.value.isDirect\|tostring),.value.range,(.value.fixAvailable\|tojson),([.value.via[]\|if type=="object" then (.title+" ("+.url+")") else . end]\|join("; "))]\|@tsv)'` | Inventario: 3 críticas, 5 altas, 2 moderadas; fixes sugeridos por npm requieren saltos mayores. |
| 27 | `node scripts/verify-gates.mjs --base 'HEAD; printf "NODE_INJECTION_PROBE\|test(red): injected"' --head HEAD; node_status=$?; python scripts/verify_gates.py --base 'HEAD; printf "PYTHON_INJECTION_PROBE\|test(red): injected"' --head HEAD; python_status=$?; printf '\nRESULT node=%s python=%s\n' "$node_status" "$python_status"; exit 0` | Ambas salidas procesaron un falso commit `[NODE_IN]`/`[PYTHON_]`; confirma inyección con `printf` inocuo. |
| 28 | `node scripts/guard-agent.mjs && git status --short` | Se intentó como comprobación final, pero la herramienta informó `outcome_unknown` y no guardó salida; no se atribuye aprobado. |
| 29 | `git status --short && git remote -v && git log -6 --oneline --decorate && node scripts/guard-agent.mjs && npm run verify:gates` | Intento compuesto cuya salida no quedó disponible en el wrapper; se repitieron por separado `git log` y ambos gates con salida capturada. |
| 30 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers nizos/tdd-guard spec-kitty/spec-kitty gemini-cli-extensions/conductor bmad-code-org/BMAD-METHOD juandelossantos/another-agent-skills; do curl -fsSL "https://api.github.com/repos/$repo" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '[.full_name, (.stargazers_count\|tostring), (.forks_count\|tostring), .pushed_at, .default_branch, .html_url, (.description // "")] \| @tsv'; done` | Intento paralelo con salida no conservada; después se repitió y quedó capturado en #18. |
| 31 | `for repo in github/spec-kit Fission-AI/OpenSpec obra/superpowers nizos/tdd-guard spec-kitty/spec-kitty gemini-cli-extensions/conductor juandelossantos/another-agent-skills; do printf '\n### %s\n' "$repo"; curl -fsSL "https://api.github.com/repos/$repo/readme" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| rg -ni -m 10 'spec.driven|test.driven|TDD|commit|hook|agent|workflow|CI|enforc|Claude Code|Cursor|Antigravity' \| head -n 8; done` | Intento paralelo con salida no conservada; más tarde se repitió con `grep` y resultado capturado. |
| 32 | `git status --short && git remote -v && git log -6 --oneline --decorate && node scripts/guard-agent.mjs && npm run verify:gates` | Intento paralelo con salida no conservada; partes relevantes se repitieron y están registradas arriba. |
| 33 | `pytest --help \| rg -n -C 2 'cov-fail-under|cov-branch|cov-report' && rg -n 'push:|pull_request:|--base|REQUIRED_CHECKS|required_status_checks|required_pull_request_reviews|test\\(red\\)|active_red_scopes|fileScopes|Coverage|pre-push|HITL|attempt|CLAUDE.md|cursor/rules|GEMINI.md' .github scripts package.json pyproject.toml README.md README.es.md .agent docs` | Intento paralelo con salida no conservada; el shell no dispone de `rg`. La configuración se inspeccionó por otras lecturas/búsquedas. |
| 34 | `for repo in nizos/probity spec-kitty/spec-kitty github/spec-kit Fission-AI/OpenSpec obra/superpowers; do curl -fsSL "https://api.github.com/repos/$repo" -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '[.full_name, (.stargazers_count\|tostring), (.forks_count\|tostring), .pushed_at, .html_url, (.description // "")] \| @tsv'; done; printf '\n### Probity README evidence\n'; curl -fsSL 'https://api.github.com/repos/nizos/probity/readme' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| grep -inE -m 18 'TDD|enforc|Claude|Codex|Copilot|hook|gate|commit|test|CI' \| head -n 14; printf '\n### Spec Kitty README evidence\n'; curl -fsSL 'https://api.github.com/repos/spec-kitty/spec-kitty/readme' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-research' \| jq -r '.content' \| base64 -d \| grep -inE -m 20 'govern|gate|commit|hook|CI|merge|agent|worktree|TDD|test' \| head -n 14` | Intento paralelo con salida no conservada; Probity se consultó después con resultado capturado. |

**Nota sobre el registro:** los comandos de búsqueda de código ejecutados mediante herramientas del editor (`grep_search`, `file_search`, `read_file`) no son procesos de shell. Sus resultados se usaron para citar archivos y líneas. En los comandos con salida no capturada se indica explícitamente la limitación, en vez de inferir un resultado.

## Limitaciones y conclusión final

Esta revisión no confirma reglas activas de GitHub, permisos, branch protection ni el resultado de un PR real; tampoco ejecuta un ataque remoto contra runners. Las pruebas de shell se limitaron a `printf`, sin persistencia ni modificación del repo. Las métricas públicas de terceros son una instantánea y sus READMEs son declaraciones de sus autores.

La descripción más defendible hoy sería: **“plantilla SDD con OpenSpec y validadores iniciales de convenciones TDD por historial Git para TypeScript/Python, acompañada de workflows CI que pueden configurarse como checks requeridos”**. No está demostrado todavía que proporcione causalidad TDD inviolable, aprobación de spec en cada cambio, HITL mecánico o bloqueo físico activo en el repo remoto.
