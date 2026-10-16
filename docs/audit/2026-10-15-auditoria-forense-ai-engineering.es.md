# Auditoría forense del arnés RayRabbit AI Engineering

**Fecha de ejecución:** 2026-10-15 (UTC)  
**Repositorio:** [rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering)  
**Commit remoto auditado:** [`ed6a4c3b60abf6cbcf1877fe0d855844d9159f22`](https://github.com/rayrabbit-ai/ai-engineering/commit/ed6a4c3b60abf6cbcf1877fe0d855844d9159f22)  
**Asunto:** `chore(hardening): remediate independent audit findings F-01 to F-05 and align bilingual documentation (#16)`  
**Dictamen oficial:** **RECHAZADO** como evidencia de conformidad OWASP ASVS L3 / SLSA L3.  
**Dictamen funcional acotado:** Aprobado como arnés temprano de gates TDD/SDD para GitHub Actions, con las limitaciones indicadas abajo.

## 1. Alcance y contexto

Se auditó el HEAD remoto, no solo el checkout abierto en VS Code. El workspace local tenía un único commit `28f4f27 Initial commit`, no tenía remoto configurado y presentaba `M package-lock.json`. Para conservar intacto ese cambio ajeno, se obtuvo el HEAD remoto en `/tmp/ai-engineering-audit`; no se usó ese clone para modificar el workspace.

El commit auditado es el HEAD de `main`. GitHub reportó `main.protected = true`. El run `38815993785` asociado exactamente a ese SHA terminó en éxito y sus cinco jobs fueron verdes. La API pública de detalles de protección devolvió HTTP `401`, de modo que no se pudieron verificar los contexts requeridos, reglas de bypass ni revisiones configuradas realmente.

La inspección fue no destructiva. El único PoC que alteró archivos lo hizo dentro de un directorio temporal eliminado al terminar. No se hicieron commits, pushes, cambios de configuración de GitHub ni conexiones de prueba a servicios controlados por terceros.

## 2. Metodología

- Inspección de commit, workflow, `CODEOWNERS`, reglas, scripts de gates y reportes; comparación de las afirmaciones del README con el comportamiento implementado.
- Ejecución del pipeline representativo en una copia aislada del HEAD remoto: Node.js, TypeScript, Python 3.11, OpenSpec, cobertura, E2E y gates de historial.
- Autochequeos Node/Python y ejecución del auditor red-team integrado, sin `--probe-http`.
- PoC aislado de degradación semántica del guard de agentes. Pruebas de inyección CLI ya incluidas por el auditor, más revisión del código de dichos probes.
- Auditoría de dependencias mediante `npm audit` y `pip-audit` en el entorno temporal.
- Consulta de la API pública de GitHub para HEAD, protección visible de rama y resultados del run CI.
- Comparación de fuentes oficiales y metadatos de GitHub; las estrellas son una fotografía de popularidad, no un indicador de seguridad.

**Límites:** esto no es una certificación de ASVS, SLSA, OWASP LLM Top 10, ATT&CK/ATLAS ni CWE Top 25. El repositorio no contiene un servicio web ni un runtime de modelo LLM sobre el que realizar pruebas HTTP, de memoria de proceso o de prompt injection dinámico. No se hizo fuzzing generativo prolongado ni mutation testing con mutantes de producción.

## 3. Comandos y salidas observadas

Extractos literales y concisos de la ejecución. Las salidas se abrevian solo cuando se indica; los detalles completos de los informes generados por el auditor integrado permanecieron en `/tmp`.

| Comando / consulta | Salida real relevante |
|---|---|
| `git status --short` en el workspace del usuario | `M package-lock.json` |
| `git log -1 ...` en el workspace | `28f4f279a3b31626eb30ca5f84401ca9da0d5cd4` / `Initial commit`; sin remoto configurado |
| GitHub API `commits?per_page=5` | HEAD `ed6a4c3b60ab`, `2026-10-15T22:16:40Z`, asunto indicado arriba |
| GitHub API `branches/main` | `"protected": true`; SHA `ed6a4c3b60abf6cbcf1877fe0d855844d9159f22` |
| GitHub API `/branches/main/protection` | HTTP `401`, `Requires authentication` |
| GitHub Actions run `38815993785` | 5/5 jobs `completed / success`: gate commits, OpenSpec, TypeScript, Python y red team |
| `npm ci` en clone remoto | Guard pasó; `added 104 packages`; `found 0 vulnerabilities`. npm 11 avisó que el postinstall de OpenSpec no estaba aprobado por su política de install scripts; `spec:validate` pasó posteriormente. |
| `/tmp/uv-bootstrap/bin/uv python install 3.11` | `Installed Python 3.11.17` |
| Instalación editable Python inicial en venv limpio | Falló con `ModuleNotFoundError: No module named 'setuptools'`; al instalar `setuptools` en el venv temporal, `ai-engineering==1.0.0` se construyó e instaló correctamente. Es una diferencia del venv aislado, no un fallo de la suite. |
| `npm run verify:gates:self-test` | `Todas las pruebas ... pasaron exitosamente.` |
| `npm run verify:red:self-test`, `npm run verify:replay:self-test`, `npm run tdd:flow:self-test` | Los tres terminaron con `Autochequeo ... aprobado` / `pasaron con éxito`. |
| Python `verify_gates.py --self-test` y `verify_red_failure.py --self-test` | Ambos terminaron con `Todas las aserciones internas ... pasaron con éxito` / `Autochequeo ... aprobado`. |
| `node scripts/verify-gates.mjs --base 4cb664a... --head HEAD` | `TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Node.js).` Analizó 1 commit. |
| Python `verify_gates.py` en el mismo rango | `TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Python).` Analizó 1 commit. |
| `node scripts/verify-historical-replay.mjs --base HEAD^ --head HEAD` | `No hay commits 'test(red):' ... Validación omitida.` Correctamente no había RED que replayar en este commit. |
| `npm run test:ts:coverage` | `Test Files 5 passed (5)`, `Tests 22 passed (22)`, líneas `87.61%`, ramas `77.27%`. |
| `npm run test:py:coverage` con Python 3.11.17 | `17 passed, 3 deselected`; gate independiente: líneas `87.76%`, ramas `83.87%`. |
| Baseline y E2E Python | `2 passed, 18 deselected`; E2E `1 passed, 19 deselected`. |
| `npm run test:ts:baseline`, `npm run test:ts:e2e`, `npm run build` | Baseline TS `3 passed`; E2E TS `1 passed`; `tsc` terminó sin error. |
| `npm run spec:validate` | `Totals: 3 passed, 0 failed (3 items)`. |
| `npm audit --audit-level=high` | `found 0 vulnerabilities`. |
| `pip-audit -r requirements-test.txt` | `No known vulnerabilities found`. |
| `node scripts/redteam-audit.mjs` | `1 hallazgos totales (0 Críticos/Altos) | 12 pruebas ejecutadas`; F-01 reportado como medio. |
| PoC temporal de `guard-agent.mjs` | Se sustituyó `INVARIANTS.md` por un marcador de más de 50 caracteres que conserva un ancla, sin reglas operativas. Salida: `exit=0` y `Todos los contratos, invariantes, firmas y workflows están protegidos e intactos.` |

## 4. Claims frente a evidencia

| Afirmación | Evidencia observable | Evaluación |
|---|---|---|
| Gates CI con causalidad RED/GREEN y scope coupling | Validadores Node/Python, self-tests, workflow PR/push y verificación local del último commit; run remoto verde. | **Sustentada para los casos codificados**, no prueba que cualquier comportamiento imaginable sea ineludible. |
| Replay histórico físico de commits `test(red)` | El workflow usa historial completo y un worktree aislado; hay self-tests. El commit auditado no contenía RED, por lo que el replay se omitió. | **Implementado**, con resultado verde en el CI de HEAD; sin replay aplicable a este commit particular. |
| OpenSpec conectado mecánicamente | `spec:validate` pasó; los gates exigen metadatos OpenSpec para commits productivos. | **Parcialmente sustentada**. Validar metadatos no demuestra aprobación humana previa de cada requisito. |
| Merge físicamente bloqueado | La API indica `main.protected=true` y el run de HEAD tiene cinco checks exitosos; el helper declara contexts y revisiones requeridos. | **Parcialmente sustentada**. No se pudieron leer las reglas exactas por HTTP 401. |
| “CWE-78 immune” | Los procesos usan arrays de argumentos y `shell:false`; el auditor envió payloads de shell y observó rechazo. | **Sobreafirmación absoluta**: los probes pasan, pero no prueban inmunidad general. |
| Auditoría de “10 dominios ASVS L3” | Hay escáneres regex, probes concretos y siete vectores fijos de gates; no existe matriz de requisitos ASVS L3 con evidencia/cobertura. | **No acredita ASVS L3**. El nombre del job no es una evaluación de conformidad. |
| Taint analysis / differential fuzzing / mutation testing | D1 busca patrones de sinks; D7 ejecuta una matriz estática de siete casos prefijados; D9 inspecciona configuración de cobertura. No se encontraron mutadores ni score de mutación. | **Parcial o no demostrado**. No es análisis de flujo de taint, fuzzing generativo ni mutation testing real. |
| OWASP LLM Top 10 / MITRE ATLAS | Se buscan caracteres bidi y archivos/configuración de agentes; no hay aplicación LLM ni pruebas de interacción con modelo. Se hallaron referencias puntuales, no un mapeo integral. | **No acreditado**. |
| SLSA L3 / verificación cripto de artefactos | Actions están fijadas por SHA, lockfiles presentes y SCA sin avisos conocidos. No se halló workflow de publicación, SBOM, attestations, provenance firmada o validación de release. El análisis ZIP solo se activa si hay ZIP en `dist/`. | **No acreditado SLSA L3**. |
| E2E en runtime real | E2E de calculadora TS/Python pasan. No prueban servicios HTTP externos, despliegue ni runtime de agente. | **Sustentada solo para la calculadora de ejemplo**. |

## 5. Hallazgos

### F-01 — El guard acepta una sustitución semánticamente vacía

- **Severidad:** Moderada, control de integridad local; no se demostró una vía remota. **CVSS v4.0:** no se asigna puntuación independiente; depende de permisos de escritura y de la protección efectiva de la rama. El `6.5` del auditor integrado no se acepta sin validar su vector y modelo de amenaza.
- **CWE:** CWE-693 (Protection Mechanism Failure); relacionado con CWE-353 (Missing Support for Integrity Check).
- **Ubicación:** [guard-agent.mjs](../../scripts/guard-agent.mjs).
- **Evidencia:** `guard-agent` requiere una regla con más de 50 caracteres y que contenga **al menos uno** de varios anchors. El PoC aislado reemplazó el contenido de invariantes por texto sin políticas, preservó un anchor y el proceso salió `0`.
- **Impacto:** el guard es una comprobación de presencia/tamaño/anchor, no una prueba de integridad semántica ni un hash criptográfico. Una regla vaciada literalmente se detectaría; una regla degradada que conserve un anchor puede pasar.
- **Remediación:** reemplazar los anchors débiles por verificaciones de requisitos críticos estructurados y pruebas de contrato; si se requiere integridad contra cambios, mantener un manifiesto de hashes firmado fuera del mismo árbol que se protege. Mantener branch protection y revisión CODEOWNERS como límites de confianza separados.

### F-02 — El propio informe automático describe mal F-01

- **Tipo:** defecto de calidad/evidencia de la herramienta de auditoría; CVSS no aplicable.
- **Ubicación:** [redteam-audit.mjs](../../scripts/redteam-audit.mjs).
- **Evidencia:** el informe automático afirma que el guard solo consulta `existsSync` y que permite truncar a cero bytes. El código sí rechaza contenido de menos de 50 caracteres y exige un anchor. Por tanto, la conclusión “no hay hashing” es cierta, pero el mecanismo PoC descrito es incorrecto. Nuestro PoC demuestra un bypass diferente y reproducible.
- **Impacto:** un informe que no representa el control real puede producir falsos positivos y reduce la confianza en la etiqueta “cero críticos/altos”. El auditor también presenta etiquetas de estándares y scores sin una matriz formal de cobertura.
- **Remediación:** escribir el finding desde el comportamiento probado, añadir regresión para contenido corto y anchor preservado, y hacer que el generador valide sus propios claims antes de emitir un dictamen.

### Brechas de aseguramiento (no son vulnerabilidades explotables confirmadas)

- **ASVS L3:** no se entregó matriz completa de requisitos aplicables, alcance, evidencia y resultado por requisito; las detecciones regex no equivalen a verificación L3.
- **SLSA L3:** no hay evidencia observable de procedencia de build verificable, aislamiento/identidad de builder y attestations firmadas para artefactos de release.
- **OWASP LLM / MITRE:** no hay ejecución de un modelo ni mapeo completo; las pruebas son estáticas sobre reglas y contenido del repo.
- **Protección de rama:** `protected=true` es observable, pero no se pudieron confirmar los checks obligatorios, excepciones de bypass o revisión CODEOWNER efectiva.

## 6. Cadena de suministro y CI/CD

Controles positivos: Actions de terceros observadas en el workflow están fijadas a SHA; workflow declara `permissions: contents: read`; los cinco jobs del HEAD pasaron; `npm audit` y `pip-audit` no encontraron vulnerabilidades conocidas en los conjuntos evaluados; dependencias de Python están fijadas a versiones.

Límites: `requirements-test.txt` no fija hashes; el pipeline no genera ni firma SBOM/provenance; no hay release publicado en la consulta realizada; el estado de protección HTTP detallado requiere credenciales. El éxito de pruebas y SCA no es evidencia suficiente para SLSA L3.

## 7. Comparativa del ecosistema

Estrellas/actividad consultadas mediante GitHub API el 2026-10-15; cambian con el tiempo y no son una medida de seguridad.

| Proyecto | Señal observada | Fortaleza frente a este repo | Diferencia / límite |
|---|---:|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | ~141k estrellas | Toolkit SDD más amplio: procesos composables, extensiones, workflows, presets, catálogos e integraciones; mayor adopción visible. | No se observó en su flujo base el mismo gate específico que valida commits RED/GREEN por módulo y reproduce RED histórico. |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | ~72k estrellas | Framework SDD establecido, flexible para brownfield, con cambios, specs y archivo; es la base utilizada por RayRabbit. | Complemento más que reemplazo: no es por sí solo un validador de causalidad de commits. |
| [Superpowers](https://github.com/obra/superpowers) | ~300k estrellas | Metodología de skills para agentes, TDD red/green, planificación y varios hosts; adopción e integraciones muy superiores. | Enfoque principal en workflow del agente; no equivale a enforcement de branch protection/historial en CI. |
| [Spec Kitty](https://github.com/spec-kitty/spec-kitty) | ~1.7k estrellas | Gobernanza repo-native, paquetes de trabajo, revisión/aceptación, aislamiento en worktrees y ejecución multiagente. | Más orientado a fábrica de software/equipos; no se verificó equivalencia exacta de sus reglas RED/GREEN con este validador. |
| [RayRabbit AI Engineering](https://github.com/rayrabbit-ai/ai-engineering) | 0 estrellas; repo creado 2026-10-14; 9 issues abiertas en la consulta | Se especializa en causalidad de commits, validadores paralelos Node/Python y replay histórico con GitHub Actions. | Proyecto muy reciente y de alcance estrecho; protección efectiva visible, pero la auditoría integrada sobrerrepresenta cobertura de estándares y tiene F-01 reproducible. |

**Lectura:** RayRabbit ofrece una combinación útil y más específica de enforcement TDD a nivel de commit. Spec Kit es más completo para construir/extender procesos SDD; Superpowers cubre mejor la disciplina del agente; Spec Kitty ofrece gobernanza de trabajo multiagente. Ninguno debe considerarse sustituto directo del gate de commits sin validar/añadir enforcement CI equivalente.

## 8. Acciones recomendadas

1. Corregir F-01 con pruebas que fallen ante placeholders con anchors conservados; no presentar hashes como condición si no son necesarios para el modelo de amenaza.
2. Corregir el generador de informes para que mecanismo, PoC, severidad y vector CVSS correspondan con el comportamiento real; publicar el score solo con vector v4 completo y reproducible.
3. No etiquetar el job como “ASVS L3” hasta publicar una matriz de requisitos aplicables y evidencia verificable; separar “escáner red-team interno” de “conformidad”.
4. Si se busca SLSA L3, añadir provenance/attestation verificable y un proceso de publicación con identidad y aislamiento de builder; no inferirlo de SHA pins o lockfiles.
5. Registrar con permisos de lectura autenticados la configuración exacta de branch protection y los contexts requeridos.
6. Mantener TDD/SDD gates: los resultados ejecutados apoyan este objetivo y son el valor diferencial más claro del proyecto.

## 9. Dictamen oficial

**RECHAZADO** para una afirmación de auditoría/conformidad bajo **OWASP ASVS L3, OWASP LLM Top 10 y SLSA L3**: la cobertura normativa no está demostrada, no existe evidencia de provenance L3 y el informe automático contiene un mecanismo incorrecto. Se confirma una debilidad moderada del guard local mediante PoC.

**Aprobación funcional acotada:** el HEAD auditado compila, valida OpenSpec, supera suites Node/Python, cobertura, SCA y gates del último commit; GitHub expone `main` como protegida y su run más reciente está verde. Esto no revoca el rechazo de conformidad ni convierte el resultado en certificación.

**Cambios en el workspace:** solo este informe y su versión inglesa son nuevos. El `package-lock.json` previamente modificado se preservó; no se hizo commit ni push.