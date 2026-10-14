# GitHub Branch Protection & CI Enforcement Guide

> **Mecanismo de Bloqueo Físico de Merges (Physical Enforcement)**  
> Este documento detalla la relación entre los validadores de CI de RayRabbit AI Engineering y las reglas de protección de rama de GitHub.

---

## 1. El Principio de Enforcement en Dos Capas

Para garantizar que ningún código de agente autónomo pueda fusionarse si viola las compuertas deterministas, el sistema opera en dos capas complementarias:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DOS CAPAS DE ENFORCEMENT DETERMINISTA                 │
└─────────────────────────────────────────────────────────────────────────────┘

  [ CAPA 1: WORKFLOW DE CI (gate-validator.yml) ]
     ├── Autochequeo de reglas adversariales (verify-gates.mjs --self-test)
     ├── Guard de contratos e integridad de reglas (guard-agent.mjs)
     ├── Auditoría de commits por compuerta (Causalidad TDD y aislamiento RED)
     ├── Validación de especificaciones OpenSpec (openspec validate --all)
     └── Suites de pruebas y cobertura (Líneas ≥80%, Ramas ≥75% en TS y Python)
           │
           ▼ Produce estado: Pass / Fail
  [ CAPA 2: BRANCH PROTECTION (GitHub Repository Rulesets / Protection) ]
     └── Bloqueo FÍSICO del botón de Merge: GitHub rechaza cualquier PR
         si alguno de los status checks requeridos no finalizó en estado Pass.
```

---

## 2. Checks Requeridos Obligatorios

En la configuración del repositorio en GitHub (`Settings` -> `Branches` -> `Branch protection rules` o `Rulesets`), los siguientes checks deben marcarse como **Required** en la rama `main`:

| Job / Rule en GitHub | Finalidad del Bloqueo |
|---|---|
| `Auditoría de Commits por Compuerta (Invariantes 1 y 3)` | Rechaza PRs si hay GREEN sin RED previo, contrabando multirruta o código en RED |
| `Validación de Especificaciones OpenSpec` | Rechaza PRs si hay cambios de código sin spec aprobada o formato inválido |
| `Suite TypeScript / Node.js & Cobertura` | Rechaza si fallan tests, se rompe @legacy-baseline o cobertura < 80% líneas / < 75% ramas |
| `Suite Python & Cobertura` | Rechaza si fallan tests pytest, se rompe baseline o cobertura < 80% líneas / < 75% ramas |
| `Require Pull Request Reviews` (≥1 review + CODEOWNERS) | Exige revisión humana obligatoria y aprobación de CODEOWNERS en compuertas y reglas |

---

## 3. Configuración Automatizada en 1 Paso

Puedes aplicar esta configuración automáticamente utilizando el script incluido:

### Con Shell (Linux/macOS/Git Bash):
```bash
./scripts/setup-branch-protection.sh rayrabbit-ai/ai-engineering main
```

### Con Python (Multiplataforma Windows/Linux/macOS):
```bash
python scripts/setup_branch_protection.py --repo rayrabbit-ai/ai-engineering --branch main
```

*(Requiere GitHub CLI `gh auth login` con permisos de administración sobre el repositorio).*
