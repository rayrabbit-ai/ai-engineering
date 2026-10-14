<!--
trigger: always_on
-->

# Compuerta SDD — Invariante 14 (Pre-Código Obligatoria)

[English](SDD_GATE.md) | [Español](SDD_GATE.es.md)

> **REGLA ABSOLUTA**: Antes de crear, editar o eliminar CUALQUIER archivo de producción o test, el agente DEBE ejecutar esta evaluación de compuerta mentalmente y por escrito. Sin excepción.

---

## 1. Evaluación Pre-Código

### Paso 1: Clasificar el Impacto
¿El cambio propuesto modifica contratos públicos de API, esquemas de persistencia, protocolos de red o modelos de seguridad?
- **NO**: Proceder con el ciclo TDD habitual (RED -> GREEN -> REFACTOR) con acoplamiento de ámbito.
- **SÍ**: **STOP OBLIGATORIO**:
  1. No tocar código de producción ni tests.
  2. Redactar el delta de especificación (`spec.md`) y diseño (`design.md`) en `openspec/changes/<id>/`.
  3. Solicitar aprobación explícita al operador humano.
  4. Solo tras recibir aprobación, comenzar con el test en rojo (RED).

---

## 2. Inmutabilidad de Especificaciones Consolidadas

* **Prohibición de Edición Directa**: Está estrictamente prohibido que commits de implementación (`feat(green)`, `test(red)`, `refactor`, `fix`) modifiquen directamente archivos en `openspec/specs/`.
* **Ruta de Sincronización Exclusiva**: Las especificaciones maestras consolidadas solo pueden actualizarse a través de commits `spec(sync):` o `chore(archive):` tras la validación completa del cambio.
* **Enforcement en CI**: El validador `verify-gates` rechazará automáticamente con código 1 cualquier commit que altere `openspec/specs/` sin el prefijo autorizado.
