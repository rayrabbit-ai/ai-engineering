# Invariantes TDD + SDD Universales (Obligatorias para todo Agente de IA)

[English](INVARIANTS.md) | [Español](INVARIANTS.es.md)

Estas 15 invariantes constituyen las reglas no negociables de desarrollo determinista para cualquier asistente de codificación (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot).

1. **Commit por Compuerta**: Commits atómicos e independientes para `RED`, `GREEN`, `REFACTOR`, `BASELINE`, `ROUTING`, `FIX`. Cualquier rollback equivale al `git revert` de ese commit exacto.
2. **Baseline Inmutable**: Los tests marcados con `@legacy_baseline` son inmutables. Solo se modifican con un commit explícito `test(baseline): update <x> por decisión <y>`.
3. **Todo Bug entra por RED**: Test de regresión primero con fallo legítimo verificado en terminal antes de tocar código de producción.
4. **Cobertura por Fase**: Cobertura mínima obligatoria: **Líneas ≥ 80%**, **Ramas (Branches) ≥ 75%**, **Paths Críticos 100%**.
5. **Triggers de Refactor Obligatorios**: Se activa refactoring si: Complejidad ciclomática > 10, Función/Método > 20 líneas, Clase > 200 líneas, Duplicación > 3 líneas.
6. **Legacy-Guard Continuo**: Tras cada GREEN o REFACTOR sobre legacy, ejecutar la suite `@legacy_baseline`. Si algún test flipa, STOP y Failure Recovery.
7. **Cierre Formal DoD**: Ningún change se cierra sin: Fases 1 a 6 completas, sincronización de specs, archivado formal y métricas de escape registradas.
8. **Prohibiciones Duras**: Prohibido implementar antes de tests, tests que pasen a la primera, modificar tests para pasar, saltar refactor o ignorar fallos.
9. **Modo Incremental por Defecto**: Usar `--incremental` ante incertidumbre o código heredado; usar `--suite` solo ante especificaciones maduras.
10. **Failure Recovery Determinista**: STOP inmediato → Rollback al último commit válido de compuerta → Retomar desde la fase correcta → Documentar lección.
11. **Precedencia de Configuración sobre Refactor**: Convenciones de arquitectura, transporte y paths inmutables priman sobre triggers de refactor cosméticos.
12. **Separación de Suites por Markers**: Suites desacopladas mediante marcadores (`unit`, `integration`, `legacy_baseline`, `e2e`). Las fases RED/GREEN deben correr en < 5 segundos.
13. **Política de Cero Warnings en Archive**: Si la herramienta detecta advertencias o tareas incompletas, se prohíbe el archivado.
14. **Compuerta Pre-Código para Contratos y Seguridad**: Todo cambio que altere APIs, esquemas de datos o seguridad exige un delta de spec y diseño aprobado antes de tocar código.
15. **Gate E2E en Runtime Real & HITL**: Validación en sistema vivo. Máximo 3 intentos de autocorrección automática; ante fallos críticos o persistentes se requiere intervención humana obligatoria (Human-in-the-Loop).
