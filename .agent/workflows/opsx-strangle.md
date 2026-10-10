---
name: opsx-strangle
description: Migrate legacy modules to new implementation via Strangler Fig pattern with parity testing.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Strangler Migration

Input: módulo legacy + objetivo: $ARGUMENTS

## Precondiciones
- Debe existir `@legacy_baseline` del módulo. Si no existe, ejecutar `/opsx-characterize` primero.

## Pasos
1. **Implementación Paralela**: Crear la nueva implementación en archivo/namespace nuevo con TDD estricto Fases 1 a 6.
2. **Parity Test**: Ejecutar la suite `@legacy_baseline` contra la nueva implementación. Debe pasar al 100%.
3. **Conmutación Reversible**: Commit único que desvía consumidores hacia la nueva implementación.
4. **Limpieza**: Borrado del código legacy muerto tras verificación completa.
