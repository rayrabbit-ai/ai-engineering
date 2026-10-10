---
name: opsx-characterize
description: Generate legacy baseline characterization tests (@legacy-baseline) for legacy code before modifying it. Zero production code.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Characterization (Legacy Baseline)

Input: módulo o archivo legacy: $ARGUMENTS

## Paso 1: Inventario de Comportamiento Observable
Analiza el módulo sin modificarlo. Inventaría: entradas/salidas, efectos secundarios, contratos y bugs conocidos.

## Paso 2: Escribir Tests de Caracterización
Escribe tests en `tests/characterization/` que repliquen el comportamiento ACTUAL exacto.
- Taggear cada test con `@pytest.mark.legacy_baseline`.
- NO modificar código de producción. NO corregir bugs aquí.

## Paso 3: Verificar Verde contra Código Intocado
Ejecuta la suite en terminal:
```bash
pytest -m legacy_baseline
```
Debe ser 100% verde contra el código preexistente sin tocar.

## Paso 4: Commit Baseline
Realiza el commit atómico:
`test(baseline): characterization de <modulo>`
