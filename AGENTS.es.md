# RayRabbit AI Engineering — Instrucciones para Agentes Autónomos

[English](AGENTS.md) | [Español](AGENTS.es.md)

> **Audiencia Objetivo:** Asistentes de Código IA (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot, Codex, Cascade).

Antes de realizar cualquier cambio de código en este repositorio, debes leer y cumplir estrictamente con:
* [`.agent/rules/INVARIANTS.es.md`](./.agent/rules/INVARIANTS.es.md) (Las 15 Invariantes Universales)
* [`.agent/rules/SDD_GATE.es.md`](./.agent/rules/SDD_GATE.es.md) (Compuerta Spec-Driven Development)
* [`.agent/rules/AGENTS.es.md`](./.agent/rules/AGENTS.es.md) (DNA del Agente y rutas de integración)

## Protocolo Operativo y Fronteras de Enforcement

1. **Causalidad TDD Estricta por Compuerta:**
   - Al crear un commit `test(red)`, modifica únicamente archivos de prueba (`tests/` o `*.spec.*`).
   - Ejecuta `npm run verify:red` (o `npm run verify:red:py`) para verificar físicamente que la prueba falla por un error de aserción legítimo (`AssertionError`, `FAIL`), no por un error de sintaxis o fallo de importación.
   - Todo commit `feat(green)` o `fix` debe modificar archivos de producción correspondientes al ámbito del `test(red)` activo.
2. **Verificación Local Pre-Commit:**
   - Ejecuta `npm run verify:gates` (y `npm run verify:gates:py`) antes de hacer push o abrir un Pull Request.
3. **Comprobaciones Automatizadas en CI:**
   - GitHub Actions audita mecánicamente prefijos de commit, acoplamiento de ámbito, tests baseline, compilación 100% verde, dependencias de la cadena de suministro (`npm audit --audit-level=high`) y umbrales de cobertura independientes (Líneas ≥ 80%, Ramas ≥ 75%).
4. **Revisión Humana y Branch Protection:**
   - La protección de ramas de GitHub y la aprobación humana (revisión de CODEOWNERS) son capas obligatorias que aplican el bloqueo físico de merges en `main`.
