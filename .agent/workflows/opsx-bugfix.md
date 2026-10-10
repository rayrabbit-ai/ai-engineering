---
name: opsx-bugfix
description: Fix defects with strict regression-test-first (RED-GREEN-REFACTOR) and legacy-guard protection.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Bugfix Regression-First

Input: descripción del bug: $ARGUMENTS

## Pasos

1. **Evaluación de Contrato**:
   ¿El bugfix cambia contratos pactados en las specs? Si SÍ -> actualizar spec primero antes de tocar código.
2. **RED (Test de Regresión Obligatorio)**:
   Escribe un test en `tests/` que reproduzca exactamente el defecto. Ejecútalo en terminal mostrando el fallo.
   Commit: `test(red): reproduce <bug>`
3. **GREEN (Fix Mínimo)**:
   Implementa la corrección mínima indispensable.
   Ejecuta la suite completa y valida la suite `@legacy_baseline`.
   Commit: `fix: <descripcion>`
4. **REFACTOR**:
   Si activan triggers, refactorizar manteniendo verde.
5. **Métricas**:
   Registrar métrica de escape de defectos (+1).
