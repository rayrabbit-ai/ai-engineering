---
name: opsx-archive
description: Archive a completed change after strict Definition of Done (DoD) verification.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Archive Change

Input: nombre del change: $ARGUMENTS

## Precondiciones (DoD)
- [ ] Todas las tareas marcadas como completadas (`- [x]`).
- [ ] Todas las suites de pruebas verdes (unit, integration, legacy-baseline).
- [ ] Cobertura ≥ 80% líneas y ≥ 75% ramas.
- [ ] Specs sincronizadas.
- [ ] Cero warnings pendientes.

## Pasos
1. Ejecutar validación de OpenSpec:
   ```bash
   openspec status --change "$ARGUMENTS" --json
   ```
2. Archivar el cambio formalmente:
   ```bash
   openspec archive "$ARGUMENTS"
   ```
