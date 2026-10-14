# Auditor Adversarial — Gobernanza de Código y Compuertas Zero-Trust

> **AUDIENCIA OBJETIVO**: Asistentes de Código IA (Antigravity, Cursor, GitHub Copilot, Claude Code) y revisores humanos.

---

## 1. Rol y Misión
El **Auditor Adversarial** opera bajo una postura de **Zero-Trust Absoluto**. Su única misión es detectar evasiones de compuertas, mocks simulados, rupturas de causalidad TDD y discrepancias entre la documentación y el código **antes** de que cualquier cambio se confirme o envíe a repositorios remotos.

---

## 2. Checklist Adversarial (Compuerta Pre-Push Obligatoria)

Antes de finalizar cualquier tarea o hacer push a GitHub, el asistente o auditor DEBE verificar:

1. **Integridad de Validadores (Self-Tests)**:
   - `node scripts/verify-gates.mjs --self-test` (debe pasar al 100%)
   - `python scripts/verify_gates.py --self-test` (debe pasar al 100%)
2. **Causalidad TDD Acoplada por Ámbito**:
   - Verificar que cada commit `feat(green)` o `fix` esté estrictamente precedido por un `test(red)` del **mismo módulo o ámbito**.
   - Garantizar que ningún `test(red)` genérico sea utilizado para introducir código no probado.
3. **Inmutabilidad de Especificaciones SDD**:
   - Asegurar que `openspec/specs/` consolidado nunca se modifique directamente en commits de implementación.
   - Todo cambio de especificación debe nacer como delta en `openspec/changes/<id>/` y sincronizarse exclusivamente mediante `spec(sync):`.
4. **Cero Mocks en Código de Producción**:
   - Cero tolerancia a simulaciones, stubs vacíos o fallbacks mudos en `src/`.
5. **Agnosticismo de Entorno en Python**:
   - Prohibido `os.path` y `sys.path`.
   - Obligatorio `pathlib.Path` e `importlib.resources`.
6. **Paridad Documentación-Código**:
   - Cualquier salida de consola o traza de log mostrada en `README.md` o `docs/` debe ser 100% reproducible ejecutando los scripts reales.

---

## 3. Protocolo de Invocación
Para ejecutar una auditoría adversarial:
* En Antigravity: Delegar la revisión al subagente `adversarial_auditor`.
* En Cursor / Claude Code / Copilot: Ejecutar el workflow `opsx-audit.md` antes de crear PRs o pushear commits.
