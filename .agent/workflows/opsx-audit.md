---
description: "Auditoría adversarial pre-push para compuertas TDD, SDD, integridad de validadores y paridad de documentación."
---

# /opsx-audit — Protocolo de Auditoría Adversarial Pre-Push

Este workflow debe ejecutarse obligatoriamente antes de confirmar commits de release o hacer push a ramas remotas (`main`, `develop`).

## 1. Autochequeo de Validadores Deterministas
Ejecutar los self-tests políglotas para garantizar que las reglas no han sido degradadas:

```bash
# Validador Node.js
node scripts/verify-gates.mjs --self-test

# Validador Python
python scripts/verify_gates.py --self-test
```
*Criterio:* Ambos comandos deben retornar código de salida `0` y confirmar que el caso adversarial de Copilot (RED y GREEN no relacionados) fue bloqueado exitosamente.

## 2. Validación de Estado del Árbol de Trabajo
Comprobar que no hay archivos sin seguimiento ni cambios sucios no planeados:

```bash
git status --porcelain
```
*Criterio:* Salida limpia o cambios intencionales documentados.

## 3. Verificación de Causalidad TDD y Ámbitos
Validar que todos los commits de la rama actual cumplen la regla de acoplamiento por ámbito:

```bash
node scripts/verify-gates.mjs --base origin/main --head HEAD
```
*Criterio:* Cero errores de compuerta reportados.

## 4. Validación de Especificaciones OpenSpec
Asegurar que todas las especificaciones y deltas están sincronizados y son sintácticamente válidos:

```bash
npx --yes @fission-ai/openspec validate --all
```

## 5. Inspección Adversarial de Código (Zero-Trust)
Revisar manualmente o mediante el subagente `adversarial_auditor`:
- [ ] ¿Hay stubs, mocks o `TODO` temporales en `src/`?
- [ ] ¿Se introdujo algún `os.path` o `sys.path` en Python en lugar de `pathlib.Path`?
- [ ] ¿Los logs de ejemplo en la documentación coinciden al 100% con la salida real de los scripts?
