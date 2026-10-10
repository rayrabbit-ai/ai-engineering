---
name: opsx-apply
description: Implement tasks from an OpenSpec change enforcing the strict TDD cycle Phases 1 to 6.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Apply Change (TDD Execution Loop)

Input: nombre del change OpenSpec: $ARGUMENTS

## Pasos

1. **Verificar Change Activo**:
   ```bash
   openspec status --change "$ARGUMENTS" --json
   ```
2. **Obtener Instrucciones de Tareas**:
   ```bash
   openspec instructions apply --change "$ARGUMENTS" --json
   ```
3. **Ejecutar Bucle TDD por cada Tarea Pendiente**:
   - **Fase 2 (RED)**: Escribir test unitario que falle. Mostrar fallo legítimo en terminal. Commit `test(red): <tarea>`. STOP.
   - **Fase 3 (GREEN)**: Implementación mínima. Suite verde + cobertura ≥80%. Validar suite `@legacy_baseline`. Commit `feat(green): <tarea>`. STOP.
   - **Fase 4 (REFACTOR)**: Refactorizar respetando triggers. Tests en verde. Commit `refactor: <tarea>`. STOP.
   - **Fase 5 (INTEGRATION)**: Tests de interacción fail-first. Commit `test(integration): <tarea>`.
   - **Fase 6 (HARDENING)**: Casos borde y stress. Commit `chore(hardening): <tarea>`.
4. **Marcar Tarea como Completada**:
   Actualizar checkbox en `tasks.md`: `- [ ]` -> `- [x]`.
