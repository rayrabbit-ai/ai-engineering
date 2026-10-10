---
name: opsx-sync
description: Sync delta specs from an active change into master specifications in openspec/specs/.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Sync Delta Specs

Input: nombre del change: $ARGUMENTS

1. Comparar delta specs del change con las specs maestras en `openspec/specs/`.
2. Actualizar las specs maestras incorporando los nuevos requerimientos y escenarios.
3. Confirmar que `openspec validate` se mantenga verde.
