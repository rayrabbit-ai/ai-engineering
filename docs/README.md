# RayRabbit AI Engineering — Documentación y Arquitectura

[English](README.en.md) | [Español](README.md)

Bienvenido a la documentación oficial de **RayRabbit AI Engineering**, el estándar abierto y plantilla determinista de ingeniería de software asistida por inteligencia artificial para erradicar el "vibe coding".

---

## 📚 Mapa de Contenidos

### 1. 🛡️ Expediente de Seguridad y Auditorías Adversariales
Para consultar el historial de auditorías técnicas externas y la batería heurística de seguridad (ningún documento constituye certificación formal OWASP ni SLSA):
* **[Expediente Completo de Auditorías (`docs/audit/`)](audit/README.md)**: Historial completo de auditorías, estado de hallazgos y delimitación de alcance.
* **[Auditoría Forense Independiente (Vigente — Ola 2)](audit/2026-10-15-auditoria-forense-ai-engineering.es.md)**: Auditoría externa independiente sobre `main` con estado de remediaciones 100 % verificadas.
* **[Informe Forense Independiente (Ola 1)](audit/2026-10-15-informe-forense-independiente.es.md)**: Evaluación externa independiente previa.
* **[Informe del Escáner Heurístico Interno](audit/informe-redteam.es.md)**: Escáner automatizado de seguridad y contratos (`redteam-audit.mjs`, 13 chequeos).
* **[Auditoría Técnica Externa Histórica (Copilot GPT-6 Luna)](audit/2026-10-14-auditoria-externa-copilot-luna.es.md)**: Evaluación externa original.

### 2. 🔒 Protección de Ramas y Gobernanza
* **[Guía de Branch Protection y Rulesets de GitHub](BRANCH_PROTECTION.es.md)**: Configuración requerida de GitHub para activar el bloqueo físico de merge, status checks obligatorios y revisiones de código CODEOWNERS.

### 3. 📊 Evidencia Empírica y Benchmarks
* **[Caso de Estudio: Benchmark A/B en Vivo y Cobertura](ab-testing-and-coverage.es.md)**: Comparativa empírica entre desarrollo descontrolado ("Vibe Coding") y el arnés determinista RayRabbit.

### 4. 📖 Manual Operativo y Prompts
* **[Manual Operativo y Runbook de Prompts (P0 – P12)](../MANUAL_OPERATIVO.es.md)**: Secuencias de prompts y compuertas operativas para dirigir agentes de forma determinista.

### 5. 📢 Difusión y Comunicados
* **[Anuncio en LinkedIn](LINKEDIN_ANNOUNCEMENT.md)**: Manifiesto público sobre el nuevo estándar de AI Engineering.

