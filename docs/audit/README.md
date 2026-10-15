# RayRabbit AI Engineering — Auditorías de Seguridad y Resiliencia

Este directorio consolida el expediente histórico de auditorías externas, revisiones adversariales independientes y certificaciones de cumplimiento de seguridad de grado bancario/militar para el arnés determinista de **RayRabbit AI Engineering**.

---

## 📂 Expediente de Auditorías y Certificaciones

| Fecha | Documento | Tipo / Autor | Estado | Veredicto |
| :--- | :--- | :--- | :--- | :--- |
| **2026-10-14** | [Auditoría Técnica Externa (Copilot GPT-6 Luna)](2026-10-14-auditoria-externa-copilot-luna.es.md) | Auditoría Externa de Afirmaciones y Bypasses Iniciales | Histórico | Bypasses encontrados (F-01 a F-05) |
| **2026-10-14** | [Informe de Correcciones de Auditoría Inicial](2026-10-14-informe-correcciones.es.md) | Remediación Fase 1 (Branch Protection & Gates) | Resuelto | Mitigación inicial aplicada |
| **2026-10-15** | [Auditoría Forense y Penetración Adversarial ASVS L3](auditoria-adversarial-forense-asvs-l3.es.md) | Red Team / Auditor Adversarial Ofensivo (OWASP ASVS L3) | Rigor Máximo | Identificados 10 vectores sutiles (F-01 a F-10) |
| **2026-10-15** | [Certificación de Remediación Definitiva](certificacion-remediacion-final.es.md) | Certificación Física de Cierre de Brechas (Exit Code 0) | Vigente | APROBADO — GRADO DE PRODUCCIÓN |
| **2026-10-15** | [Informe Automatizado de Red Team (10 Dominios)](informe-redteam.es.md) | Suite Automatizada `redteam-audit.mjs` (Fuzzing Diferencial) | **Vigente** | **APROBADO (0 CRITICAL / HIGH)** |

---

## 🛡️ Estándares y Marcos de Referencia Aplicados

1. **OWASP ASVS L3 (Application Security Verification Standard Level 3):**
   - El nivel más alto de rigor para aplicaciones críticas, transaccionales y de defensa.
2. **OWASP Top 10 CI/CD Security Risks:**
   - Mitigación absoluta de Poisoned Pipeline Execution (PPE), Dependency Chain Abuse e Insufficient Flow Control.
3. **MITRE ATT&CK & MITRE ATLAS:**
   - Defensa en profundidad ante manipulación de modelos de lenguaje, inyección de prompts y envenenamiento de agentes de software.
4. **SLSA Nivel 3 (Supply-chain Levels for Software Artifacts):**
   - Inmutabilidad de dependencias, scripts de construcción aislados y auditoría de procedencia de código.
5. **Causalidad TDD Estricta y Determinismo Criptográfico:**
   - Verificación mecánica de commits previa a cualquier cambio en código fuente de producción.

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

# Cobertura estricta e independiente (Líneas >=80%, Ramas >=75%)
npm run test:ts:coverage
npm run test:py:coverage

# Pruebas End-to-End en runtime real
npm run test:ts:e2e
pytest -m e2e --tb=short

# Validación de especificaciones OpenSpec
npm run spec:validate

# Suite completa de Red Teaming y Fuzzing Diferencial (10 dominios)
npm run audit:redteam
```
