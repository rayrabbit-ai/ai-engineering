# RayRabbit AI Engineering — Expediente de Auditorías

Este directorio reúne las auditorías externas y adversariales del harness y el estado de remediación de cada hallazgo. **Ningún documento de este expediente es una certificación formal** (OWASP, SLSA ni ninguna otra).

---

## 📂 Expediente de Auditorías

| Fecha | Documento | Tipo | Estado |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | [Auditoría Técnica Externa](2026-10-14-auditoria-externa-copilot-luna.es.md) | Externa (claims y bypasses iniciales) | Histórico |
| 2026-10-14 | [Informe de Correcciones](2026-10-14-informe-correcciones.es.md) | Remediación fase 1 | Histórico |
| 2026-10-15 | [Auditoría adversarial interna](auditoria-adversarial-forense-asvs-l3.es.md) | Interna; el nombre del archivo menciona ASVS L3, pero **no** es una verificación ASVS | Histórico |
| 2026-10-15 | [Auditoría Forense Adversarial Externa](2026-10-15-auditoria-forense-adversarial.es.md) | Externa (causalidad y replay) | Histórico |
| 2026-10-15 | [Certificación de remediación](certificacion-remediacion-final.es.md) | Interna; **superada** por la auditoría independiente siguiente | Superado |
| 2026-10-15 | [Informe forense independiente](2026-10-15-informe-forense-independiente.es.md) | Externa e independiente: **RECHAZADO** el claim de certificación; aprobación condicionada como plantilla SDD/TDD | **Vigente** — ver estado abajo |
| 2026-10-15 | [Informe de la batería heurística](informe-redteam.es.md) | Automático (`redteam-audit.mjs`, 12 probes) | Vigente |

### Estado de los hallazgos de la auditoría independiente

| ID | Hallazgo | Estado |
| :--- | :--- | :--- |
| F-01 | El replay aceptaba como RED un fallo sin aserción | **Corregido.** `classifyTestResult` exige evidencia de aserción y `assertLegitimateRed` bloquea; hay self-tests de regresión (casos 6–9). Además se corrigió un fallo *fail-open* que no figuraba en el informe: el patch se corrompía por un `trim()` y el replay omitía el commit en silencio. Ahora bloquea. |
| F-02 | D9 reportaba un falso umbral combinado de ramas en Python | **Corregido.** D9 reconoce `check_python_coverage.py --min-branches`. |
| F-03 | Afirmaciones de capacidades sin método que las respalde | **Corregido en documentación.** Se eliminaron los claims de certificación (ver "Alcance"). |
| F-04 | Branch protection no verificable (HTTP 403) | **Pendiente:** requiere verificación manual del propietario en *Settings → Branches*. |
| F-05 | Colisión `auth`/`billing/auth` | No reproducible en HEAD; se mantiene como caso de regresión en los self-tests. |

---

## ⚖️ Alcance: qué es y qué no es

**Sí es:** una plantilla SDD/TDD con gates de commit verificados en CI (nomenclatura, acoplamiento de scope RED→GREEN, linkage con OpenSpec, replay del RED en el commit padre), cobertura de líneas y ramas con umbrales independientes (TS y Python), y una batería heurística de chequeos de seguridad.

**No es:**
- Una certificación ni una verificación conforme a OWASP ASVS L3, SLSA L3, MITRE ATT&CK/ATLAS ni CVSS.
- Análisis de taint, fuzzing generativo, mutation testing ni auditoría de memoria/HTTP. Los "dominios" de `redteam-audit.mjs` son chequeos puntuales con nombres temáticos.
- Provenance/attestation de artefactos (para eso ver in-toto/Witness).
- Un bloqueo físico de merge por sí solo: depende de que branch protection exija los checks.

---

## 🔍 Reproducibilidad y Verificación Independiente

Cualquier auditor o equipo de seguridad puede reproducir físicamente todas las verificaciones ejecutando:

```bash
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

# Batería heurística de chequeos de seguridad (no es certificación)
npm run audit:redteam
```
