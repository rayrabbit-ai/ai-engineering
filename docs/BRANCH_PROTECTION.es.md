# Guía de Branch Protection y Enforcement en CI de GitHub

[English](BRANCH_PROTECTION.md) | [Español](BRANCH_PROTECTION.es.md)

> **Mecanismo de Bloqueo Físico de Merges (Physical Enforcement)**  
> Este documento detalla la interacción entre los validadores de CI de RayRabbit AI Engineering y las reglas de protección de rama de GitHub.

---

## 1. El Principio de Enforcement en Dos Capas

Para garantizar que ningún código de agente autónomo pueda fusionarse si viola las compuertas deterministas, el sistema opera en dos capas complementarias:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DOS CAPAS DE ENFORCEMENT DETERMINISTA                 │
└─────────────────────────────────────────────────────────────────────────────┘

  [ CAPA 1: WORKFLOW DE CI (.github/workflows/gate-validator.yml) ]
     ├── Autochequeo de reglas adversariales (npm run verify:gates:self-test)
     ├── Guard de contratos e integridad de reglas (node scripts/guard-agent.mjs)
     ├── Auditoría de commits por compuerta (Causalidad TDD y aislamiento RED)
     ├── Validación de especificaciones OpenSpec (openspec validate --all)
     ├── Replay histórico físico de tests en worktree (scripts/verify-historical-replay.mjs)
     ├── Suites de pruebas y cobertura (Líneas ≥80%, Ramas ≥75% en TS y Python)
     └── Batería heurística de chequeos de seguridad (npm run audit:redteam)
           │
           ▼ Produce estado de commit: Pass / Fail
  [ CAPA 2: BRANCH PROTECTION (GitHub Rulesets / Protección de Ramas) ]
     └── Bloqueo FÍSICO del botón de Merge: GitHub rechaza cualquier PR
         si alguno de los status checks requeridos no finalizó en estado Pass.
```

---

## 2. Checks Requeridos Obligatorios

En la configuración del repositorio en GitHub (`Settings` -> `Branches` -> `Branch protection rules` o `Rulesets`), los siguientes checks deben marcarse como **Required** en la rama `main`:

| Nombre del Check en GitHub | Finalidad del Bloqueo |
|---|---|
| `Auditoría de Commits por Compuerta (Invariantes 1 y 3)` | Rechaza PRs si hay GREEN sin RED previo, contrabando multirruta o código en RED |
| `Validación de Especificaciones OpenSpec` | Rechaza PRs si hay cambios de código sin spec aprobada, tareas desvinculadas o formato inválido |
| `Suite TypeScript / Node.js & Cobertura` | Rechaza si fallan tests, se rompe @legacy-baseline o cobertura < 80% líneas / < 75% ramas |
| `Suite Python & Cobertura` | Rechaza si fallan tests pytest, se rompe baseline o cobertura < 80% líneas / < 75% ramas |
| `Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)` | Rechaza PRs si el escáner heurístico detecta vulnerabilidades o rupturas de contrato críticas o altas |
| `Require Pull Request Reviews` (≥1 review + CODEOWNERS) | Exige revisión humana obligatoria y aprobación de CODEOWNERS en compuertas y reglas |

> **Snapshot Verificable de Configuración**: Dado que la API de GitHub responde `HTTP 401/403` ante consultas no autenticadas sobre `/repos/<owner>/<repo>/branches/main/protection` o `/rulesets`, el repositorio conserva una captura autenticada del Ruleset activo en `main` (`id: 25150565`, `enforcement: active`) en [`docs/audit/github-ruleset-main.json`](audit/github-ruleset-main.json).

---

## 3. Configuración Automatizada en 1 Paso

Puedes aplicar esta configuración automáticamente utilizando los scripts incluidos:

### Con Shell (Linux / macOS / Git Bash):
```bash
./scripts/setup-branch-protection.sh rayrabbit-ai/ai-engineering main
```

### Con Python (Multiplataforma Windows / Linux / macOS):
```bash
python scripts/setup_branch_protection.py --repo rayrabbit-ai/ai-engineering --branch main
```

*(Requiere GitHub CLI `gh auth login` con permisos de administración sobre el repositorio).*
