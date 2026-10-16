# RayRabbit AI Engineering — Expediente de Auditorías

[English](README.en.md) | [Español](README.md)

Este directorio reúne las auditorías externas y adversariales del harness y el estado de remediación de cada hallazgo. **Ningún documento de este expediente es una certificación formal** (OWASP, SLSA ni ninguna otra).

---

## 📂 Expediente de Auditorías

| Fecha | Documento | Tipo | Estado |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | [Auditoría Técnica Externa](2026-10-14-auditoria-externa-copilot-luna.es.md) | Externa (claims y bypasses iniciales) | Histórico |
| 2026-10-14 | [Informe de Correcciones](2026-10-14-informe-correcciones.es.md) | Remediación fase 1 | Histórico |
| 2026-10-15 | [Auditoría adversarial interna](auditoria-adversarial-forense-asvs-l3.es.md) | Interna; el nombre del archivo menciona ASVS L3, pero **no** es una verificación ASVS | Histórico |
| 2026-10-15 | [Auditoría Forense Adversarial Externa](2026-10-15-auditoria-forense-adversarial.es.md) | Externa (causalidad y replay) | Histórico |
| 2026-10-15 | [Certificación de remediación](certificacion-remediacion-final.es.md) | Interna; **superada** por las auditorías independientes siguientes | Superado |
| 2026-10-15 | [Informe forense independiente (Ola 1)](2026-10-15-informe-forense-independiente.es.md) | Externa: verificación de replay, cobertura de ramas y saneamiento documental | Histórico (remediado en `ed6a4c3`) |
| 2026-10-15 | [Auditoría forense independiente (Ola 2 — `ed6a4c3`)](2026-10-15-auditoria-forense-ai-engineering.es.md) | Externa: confirmó 5/5 checks en verde y señaló `F-01` (`guard-agent.mjs`) y `F-02` (`redteam-audit.mjs`) | **Vigente** — 100 % remediado abajo |
| 2026-10-15 | [Snapshot autenticado de GitHub Ruleset](github-ruleset-main.json) | Captura JSON verificable del Ruleset activo en `main` (`id: 25150565`, `enforcement: active`) | Vigente |
| 2026-10-15 | [Informe del escáner heurístico](informe-redteam.es.md) | Automático (`redteam-audit.mjs`, 20 chequeos) | Vigente |

### Estado de los hallazgos de las auditorías independientes

| ID | Hallazgo | Estado |
| :--- | :--- | :--- |
| Ola 1 `F-01` | El replay aceptaba como RED un fallo sin aserción | **Corregido (`ed6a4c3`).** `classifyTestResult` exige evidencia de aserción y `assertLegitimateRed` bloquea; incluye self-tests de regresión (casos 6–9) y parches sin `trim()`. |
| Ola 1 `F-02` | D9 reportaba un falso umbral combinado de ramas en Python | **Corregido (`ed6a4c3`).** D9 reconoce `check_python_coverage.py --min-branches`. |
| Ola 1 `F-03` | Afirmaciones de capacidades sin método que las respalde | **Corregido.** Se eliminaron todos los claims de certificación formal en README, agentes, workflows y scripts. |
| Ola 1 `F-04` / Acción 5 | Branch protection no verificable sin token (`HTTP 401/403`) | **Corregido.** Verificado físicamente (`GH013` al intentar push directo a `main`) y versionado el snapshot autenticado en [`github-ruleset-main.json`](github-ruleset-main.json). |
| Ola 1 `F-05` | Colisión `auth`/`billing/auth` | **Verificado (`ed6a4c3`).** No reproducible en HEAD; preservado como caso de regresión en los self-tests. |
| Ola 2 `F-01` | `guard-agent.mjs` usaba `anchors.some(...)` y umbral de 50 caracteres | **Corregido.** Ahora exige **todas** las anclas (`anchors.every(...)`), `minLength` específico por contrato (2500 bytes en `INVARIANTS*`), presencia de las 15 cláusulas numeradas (`1.`–`15.`), las 6 cláusulas de `ADVERSARIAL_AUDITOR*` y las reglas `R1`–`R5` de `AGENTS*`. Incluye `npm run verify:guard:self-test`. |
| Ola 2 `F-02` | `redteam-audit.mjs` contenía un hallazgo estático desincronizado y cabeceras de estándares sobredeclaradas | **Corregido.** Se eliminó el hallazgo estático desactualizado; el Dominio 3 ejecuta dinámicamente `guard-agent.mjs --self-test` y `validateGuardContracts`. Se renombró el job de CI a `Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)`. |

---

## ⚖️ Alcance: qué es y qué no es

**Sí es:** una plantilla SDD/TDD con gates de commit verificados en CI (nomenclatura, acoplamiento de scope RED→GREEN, linkage con OpenSpec, replay del RED en el commit padre), guardián estructural y semántico de contratos (`guard-agent.mjs`), cobertura de líneas y ramas con umbrales independientes (TS y Python), y un escáner heurístico interno de seguridad y contratos (`redteam-audit.mjs`).

**No es:**
- Una certificación ni una verificación conforme a estándares formales externos de cumplimiento.
- Un motor de análisis de flujo de datos de compilador, fuzzing generativo, pruebas de mutación automáticas ni auditoría de memoria/HTTP. Los 10 dominios de `redteam-audit.mjs` son 20 chequeos heurísticos y de regresión puntuales.
- Provenance/attestation criptográfica de artefactos (para eso ver in-toto/Witness).
- Un bloqueo físico de merge por sí solo: el bloqueo físico en GitHub depende del Ruleset activo en la rama `main` (ver [`github-ruleset-main.json`](github-ruleset-main.json)).

---

## 🔍 Reproducibilidad y Verificación Independiente

Cualquier auditor o equipo de ingeniería puede reproducir físicamente todas las verificaciones ejecutando:

```bash
# Guardián estructural y semántico de contratos + self-test adversarial
node scripts/guard-agent.mjs
npm run verify:guard:self-test

# Auto-verificación de compuertas (TypeScript y Python)
npm run verify:gates:self-test
npm run verify:gates:py:self-test

# Auto-verificación de ejecutores RED anti-inyección
npm run verify:red:self-test
npm run verify:red:py:self-test

# Verificación de Replay Histórico Físico de Commits RED en CI
npm run verify:replay:self-test

# Verificación de Ergonomía CLI TDD
npm run tdd:flow:self-test

# Cobertura estricta e independiente (Líneas >=80%, Ramas >=75%)
npm run test:ts:coverage
npm run test:py:coverage

# Pruebas End-to-End en runtime real
npm run test:ts:e2e
pytest -m e2e --tb=short

# Validación de especificaciones OpenSpec
npm run spec:validate

# Escáner heurístico interno de seguridad y contratos (no es certificación)
npm run audit:redteam
```
