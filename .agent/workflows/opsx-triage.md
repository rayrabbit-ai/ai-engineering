---
name: opsx-triage
description: Classify an OpenSpec change or legacy defect and route to the correct workflow (R1-R5). Decision only, never edits code.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# Triage & Routing (Meta-orquestador SDD+TDD)

Input: nombre del change OpenSpec o descripción de la tarea: $ARGUMENTS

## Paso 1: Evidencia
1. Identifica los archivos involucrados en el cambio.
2. Por cada archivo determina:
   - ¿Es nuevo o legacy?
   - Si es legacy: ¿cuenta con tests de caracterización (@legacy_baseline)?
   - Deuda técnica contra umbrales: complejidad > 10, método > 20 líneas, clase > 200 líneas, duplicación > 3 líneas.

## Paso 2: Reglas de Decisión (primera que coincide gana)
- **R1 GREENFIELD**: Todos los archivos son nuevos -> /opsx-apply + ciclo TDD puro (Fases 1-6).
- **R2 BUG**: Entrada es defecto contra comportamiento vigente -> /opsx-bugfix.
- **R3 STRANGLE**: Legacy con deuda que será reescrito -> /opsx-strangle.
- **R4 LEGACY-TOUCH**: Legacy SIN caracterización previa -> /opsx-characterize primero y luego /opsx-apply --incremental + legacy-guard.
- **R5 LEGACY-COVERED**: Legacy YA caracterizado -> /opsx-apply --incremental + legacy-guard.

## Reglas Duras
- PROHIBIDO editar código o tests en este workflow.
- Si la evidencia es insuficiente: STOP y preguntar (no adivinar routing).
