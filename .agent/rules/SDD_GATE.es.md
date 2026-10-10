<!--
trigger: always_on
-->

# Compuerta SDD — Invariante 14 (Pre-Código Obligatoria)

[English](SDD_GATE.md) | [Español](SDD_GATE.es.md)

> **REGLA ABSOLUTA**: Antes de crear, editar o eliminar CUALQUIER archivo de producción o test, el agente DEBE ejecutar esta evaluación de compuerta mentalmente y por escrito. Sin excepción.

## Evaluación Pre-Código

### Paso 1: Clasificar el Impacto
¿El cambio propuesto modifica contratos públicos de API, esquemas de persistencia, protocolos de red o modelos de seguridad?
- **NO**: Proceder con el ciclo TDD habitual (RED -> GREEN -> REFACTOR).
- **SÍ**: **STOP OBLIGATORIO**:
  1. No tocar código de producción ni tests.
  2. Redactar el delta de especificación (`spec.md`) y diseño (`design.md`).
  3. Solicitar aprobación explícita al operador humano.
  4. Solo tras recibir aprobación, comenzar con el test en rojo (RED).
