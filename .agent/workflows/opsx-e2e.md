---
name: opsx-e2e
description: Universal E2E and system gate against real runtime with auto-correction loop and HITL escalation.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: rayrabbit-ai
  version: "1.0"
  generatedBy: "1.6.0"
---

# E2E / System Gate

1. **Verificación de Runtime Real**:
   Asegurar que los servicios o entorno de pruebas estén activos.
2. **Ejecución de Suite E2E**:
   ```bash
   pytest -m e2e
   ```
3. **Evaluación de Compuerta**:
   - **VERDE**: Compuerta aprobada -> proceder a cierre.
   - **ROJO**:
     - Analizar trazas de error.
     - Si es error crítico o cambio irreversible: STOP inmediato y consultar al operador humano (HITL).
     - Si no: iniciar bucle de autocorrección (máximo 3 reintentos). Superado el límite: STOP (HITL).
