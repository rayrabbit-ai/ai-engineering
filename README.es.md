# RayRabbit AI Engineering — Template de Desarrollo Determinista

[English](README.md) | [Español](README.es.md)

[![OpenSpec 1.6](https://img.shields.io/badge/OpenSpec-1.6.0-blue.svg)](https://openspec.dev)
[![CI Gate Validator](https://img.shields.io/badge/CI-Gate--Validator-green.svg)](.github/workflows/gate-validator.yml)
[![TDD Strict](https://img.shields.io/badge/Methodology-SDD%20%2B%20Strict%20TDD-orange.svg)](.agent/rules/INVARIANTS.md)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Python-blueviolet.svg)](#stacks-soportados)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Repositorio Template Oficial de RayRabbit AI**  
> *Framework operativo y repositorio base para construir software de misión crítica con Agentes Autónomos de Codificación (Google Antigravity, Claude Code, Cursor, Roo Code y más).*

---

## 1. El Problema: El Peligro del "Vibe Coding"

El uso descontrolado de asistentes de IA para generar software ("vibe coding") produce:
* **Alucinación de Arquitectura**: El agente reescribe contratos, destruye interfaces y agrega dependencias innecesarias.
* **Falsos Positivos ("Fake Greens")**: El modelo escribe pruebas triviales o relaja las aserciones para que pasen a la primera.
* **Rotura de Código Legacy**: Modificar código existente sin una red de seguridad inmutable rompe funcionalidades históricas.

#### La Solución: AI Engineering Determinista
Este template fusiona **Spec-Driven Development (OpenSpec)** con **Test-Driven Development (TDD) Estricto** y **Compuertas Causales Deterministas en Git CI/CD**:
1. **Ningún código sin especificación previa** (`openspec/specs/`).
2. **Ningún código de producción sin un test en rojo (`test(red)`) previo verificado en terminal con acoplamiento de ámbito/módulo y aislamiento estricto** (código de producción estrictamente prohibido y archivos de test obligatorios en `test(red)`).
3. **Bloqueo físico de merges en CI mediante Branch Protection**: Ningún Pull Request puede fusionarse si viola la causalidad TDD, la inmutabilidad de baselines o los umbrales de cobertura (ver [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md)).
4. **Auditoría Adversarial y Guard Integrados**: Validación pre-push y en CI mediante [`guard-agent`](scripts/guard-agent.mjs), el subagente [`adversarial_auditor`](.agent/rules/ADVERSARIAL_AUDITOR.es.md) y [`/opsx-audit`](.agent/workflows/opsx-audit.md).

> 🔬 **Evidencia Empírica**: Lee nuestro [Caso de Estudio: Benchmark A/B en Vivo](./docs/ab-testing-and-coverage.es.md) donde documentamos cómo un agente cae en *"La Ilusión de TDD"* y es bloqueado por el validador de CI.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLUJO DETERMINISTA DE AI ENGINEERING                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Requerimiento / Defecto
          │
          ▼
   [ P0. TRIAGE ] ────────────► Clasificación R1–R5 (Nuevo vs Legacy)
          │
    ┌─────┴─────────────────────────────────┐
    │ Greenfield                            │ Legacy Detectado
    ▼                                       ▼
 [ SDD: Spec + Proposal ]            [ P1. CHARACTERIZE ]
    │                                       │ (Golden Master / @legacy-baseline)
    ▼                                       ▼
 [ P2. RED ] ◄──────────────────────────────┘
    │ (Test falla legítimamente en terminal. Commit: test(red))
    ▼
 [ P3. GREEN ]
    │ (Implementación MÍNIMA. Commit: feat(green) + Cobertura ≥80%)
    ▼
 [ P4. REFACTOR ]
    │ (SOLID, Complejidad <10, Métodos <20L. Commit: refactor)
    ▼
 [ P5. INTEGRATION ]
    │ (Contratos de interfaz. Fail-first. Commit: test(integration))
    ▼
 [ P6. HARDENING ]
    │ (Casos borde y stress. Commit: chore(hardening))
    ▼
 [ P7. GATE E2E ]
    │ (Runtime real en vivo. Máx 3 reintentos -> HITL)
    ▼
 [ P8. CIERRE & ARCHIVE ]
    │ (Sync de Specs + Archive del Change)
    ▼
  GitHub PR (Bloqueo físico por .github/workflows/gate-validator.yml + Branch Protection)
```

---

## 2. Las 15 Invariantes Universales TDD + SDD

Cualquier agente que opere en este repositorio obedece obligatoriamente el decálogo definido en [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md):

* **Compuertas de CI y Commits Mecanizadas** (Verificadas físicamente en cada PR y commit):
  1. **Commit por Compuerta y Acoplamiento de Ámbito**: Commits atómicos independientes (`RED`, `GREEN`, `REFACTOR`, `BASELINE`, `FIX`). Cada archivo de producción modificado en `feat(green)` debe estar acoplado a un ámbito activo de `test(red)`.
  2. **Baseline Inmutable**: Los tests `@legacy-baseline` jamás se modifican sin la convención explícita `test(baseline): update`.
  3. **Aislamiento y Test Obligatorio en RED**: Archivos de producción estrictamente prohibidos en `test(red)` y requisito de al menos un archivo de test real.
  4. **Cobertura por Fase**: Líneas ≥ 80%, Ramas ≥ 75% auditadas mecánicamente en CI para TS y Python.
  6. **Legacy-Guard Continuo**: La suite de caracterización permanece verde en cada paso.
  - **Inmutabilidad de Especificaciones OpenSpec**: Se bloquea la alteración directa de `openspec/specs/` consolidado.

* **Protocolo Operativo y Playbook del Agente** (Gobernado por el DNA del agente y workflows):
  5. **Triggers de Refactor Obligatorios**: Complejidad > 10, Función > 20 líneas, Clase > 200 líneas, Duplicación > 3 líneas.
  7. **Cierre Formal DoD**: Prohibido archivar sin suites verdes, cobertura cumplida y sync de specs.
  8. **Prohibiciones Duras**: Cero código antes de tests, cero modificación de aserciones para pasar.
  9. **Modo Incremental por Defecto**: Avance paso a paso (`--incremental`) ante incertidumbre o legacy.
  10. **Failure Recovery**: Parada inmediata ante desvíos y rollback al último commit de compuerta.
  11. **Precedencia de Configuración**: Las invariantes de arquitectura y transporte priman sobre refactors estéticos.
  12. **Separación de Suites por Marcadores**: `unit`, `integration`, `legacy-baseline`, `e2e`.
  13. **Cero Tolerancia a Advertencias**: Prohibido archivar con tareas o artefactos incompletos.
  14. **Compuerta Pre-Código para Contratos**: Cambios en APIs o seguridad requieren spec previa aprobada.
  15. **Gate E2E en Runtime Real & HITL**: Máximo 3 reintentos automáticos antes de intervención humana obligatoria.

---

## 3. Stacks Soportados Fuera de la Caja

| Stack | Framework de Pruebas | Cobertura | Estado de Integración en CI |
|---|---|---|---|
| **TypeScript / Node.js** | Vitest (`tests/ts/`) | `@vitest/coverage-v8` (Líneas ≥80%, Ramas ≥75%) | Suite completa de CI + validador de compuertas (`verify-gates.mjs`) |
| **Python** | Pytest (`tests/`) | `pytest-cov` (Líneas ≥80%, Ramas ≥75%) | Suite completa de CI + validador de compuertas (`verify_gates.py`) |
| **Otros (Go, Rust, Java)** | Runners nativos | Herramienta estándar | Validador de compuertas políglota; conecte su runner en CI |

---

## 4. Estructura del Repositorio

```text
.
├── .github/workflows/
│   ├── gate-validator.yml       # Guardián de PR: valida causalidad TDD, commits y coverage
│   └── validate-specs.yml       # Validador de esquemas OpenSpec
├── .agent/                       # Contexto operativo para Antigravity, Cursor, Claude Code
│   ├── rules/                   # Invariantes y compuerta pre-código
│   ├── skills/                  # Skills ejecutables (tdd-cycle, openspec)
│   └── workflows/               # Workflows de slash-commands (/opsx-triage, /opsx-apply...)
├── openspec/                     # Motor de especificaciones spec-driven
│   ├── config.yaml
│   ├── specs/                   # Especificaciones vivas
│   └── changes/                 # Cambios activos con proposal, design y tasks
├── scripts/
│   ├── verify-gates.mjs         # Validador de commits en Node.js (cero dependencias)
│   ├── verify_gates.py          # Validador de commits en Python
│   └── guard-agent.mjs          # Guardián de preservación de workflows
├── src/                         # Código fuente (TypeScript y Python)
├── tests/                       # Suites estructuradas (unit, integration, characterization, e2e)
├── docs/                        # Guías de A/B testing y cobertura
├── package.json
└── pyproject.toml
```

---

## 5. Inicio Rápido

Consulta [`QUICKSTART.es.md`](./QUICKSTART.es.md) para iniciar en 3 minutos.

```bash
# 1. Clonar el template
git clone https://github.com/rayrabbit-ai/ai-engineering.git mi-proyecto
cd mi-proyecto

# 2. Instalar dependencias
npm install

# 3. Validar compuertas de commits en cualquier momento
npm run verify:gates

# 4. Correr pruebas con cobertura
npm run test:ts:coverage     # Para TypeScript
npm run test:py:coverage     # Para Python
```

---

## 6. Documentación Adicional
* [Protección de Ramas en GitHub y Bloqueo Físico de Merges](./docs/BRANCH_PROTECTION.md)
* [Caso de Estudio Empírico: Benchmark A/B y Cobertura](./docs/ab-testing-and-coverage.es.md)
* [Manual Operativo y Runbook de Prompts (P0 - P11)](./MANUAL_OPERATIVO.es.md)
* [Las 15 Invariantes TDD+SDD](.agent/rules/INVARIANTS.md)
* [Compuerta SDD Pre-Código](.agent/rules/SDD_GATE.md)
