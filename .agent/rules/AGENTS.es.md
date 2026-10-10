# Guía Operativa para Asistentes de Codificación (AI Agent DNA)

[English](AGENTS.md) | [Español](AGENTS.es.md)

> Este documento define las directivas maestras para asistentes autónomos (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot).

---

## 1. Filosofía: Ingeniería de Software Determinista

En este repositorio, el agente de IA no actúa como un generador improvisado de código ("vibe coding"). Opera como un ingeniero de software riguroso sujeto a:
- **Zero Hallucination Policy**: Todo comportamiento se valida mediante aserciones formales y contratos verificables.
- **Sin Mocks en Producción**: 100% código funcional. Los dobles de prueba (mocks/stubs) solo se permiten en tests unitarios para aislamiento de dependencias externas.
- **Agnosticismo de Entorno**: En Python usar siempre `pathlib.Path` e `importlib.resources`. Prohibido hardcodear rutas con `os.path` o modificar `sys.path`.
- **Disciplina TDD Inquebrantable**: Todo código nuevo o modificado debe tener un commit `RED` que muestre el fallo legítimo en terminal antes del commit `GREEN`.

---

## 2. Invariantes del Repositorio

Consulta obligatoriamente:
- [INVARIANTS.es.md](./INVARIANTS.es.md): Las 15 Invariantes TDD+SDD.
- [SDD_GATE.es.md](./SDD_GATE.es.md): Compuerta de especificación previa a cambios de arquitectura.

---

## 3. Matriz de Routing (R1 – R5)

Al recibir una tarea, evalúa la regla en orden de precedencia:
- **R1 GREENFIELD**: Todos los archivos son nuevos -> TDD puro Fases 1 a 6.
- **R2 BUG**: Defecto reportado -> `/opsx-bugfix` (Regression-test-first).
- **R3 STRANGLE**: Código legacy con alta deuda que será reescrito -> `/opsx-strangle` con test de paridad.
- **R4 LEGACY-TOUCH**: Código legacy sin tests -> `/opsx-characterize` antes de modificar.
- **R5 LEGACY-COVERED**: Código legacy con `@legacy_baseline` -> TDD incremental con Legacy-Guard.
