# RayRabbit AI Engineering — Template de Desarrollo Determinista

[English](README.md) | [Español](README.es.md)

[![OpenSpec 1.6](https://img.shields.io/badge/OpenSpec-1.6.0-blue.svg)](https://openspec.dev)
[![CI Gate Validator](https://img.shields.io/badge/CI-Gate--Validator-green.svg)](.github/workflows/gate-validator.yml)
[![TDD Strict](https://img.shields.io/badge/Methodology-SDD%20%2B%20Strict%20TDD-orange.svg)](.agent/rules/INVARIANTS.md)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Python-blueviolet.svg)](#stacks-soportados)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Repositorio Template Oficial de RayRabbit AI**  
> *Framework operativo y repositorio base para construir software de misión crítica con Agentes Autónomos de Codificación (Google Antigravity, Claude Code, Cursor, Roo Code y GitHub Copilot).*

---

## 1. El Problema: El Peligro del "Vibe Coding"

El uso descontrolado de asistentes de IA para generar software ("vibe coding") produce:
* **Alucinación de Arquitectura**: El agente reescribe contratos, destruye interfaces y agrega dependencias innecesarias.
* **Falsos Positivos ("Fake Greens")**: El modelo escribe pruebas triviales o relaja las aserciones para que pasen a la primera.
* **Rotura de Código Legacy**: Modificar código existente sin una red de seguridad inmutable rompe funcionalidades históricas.

### La Solución: AI Engineering Determinista
Este template fusiona **Spec-Driven Development (OpenSpec)** con **Test-Driven Development (TDD) Estricto** y **Compuertas Criptográficas en CI/CD**:
1. **Ningún código sin especificación previa** (`openspec/specs/`).
2. **Ningún código de producción sin un test en rojo (`test(red)`) previo verificado en terminal**.
3. **Ningún Pull Request es aceptado si viola las 15 Invariantes o la causalidad TDD**.

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
  GitHub PR (Auditado por .github/workflows/gate-validator.yml)
```

---

## 2. Las 15 Invariantes Universales TDD + SDD

Cualquier agente que opere en este repositorio obedece obligatoriamente el decálogo definido en [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md):

1. **Commit por Compuerta**: Commits atómicos independientes (`RED`, `GREEN`, `REFACTOR`, `BASELINE`, `FIX`).
2. **Baseline Inmutable**: Los tests `@legacy-baseline` jamás se modifican para justificar código nuevo.
3. **Todo Bug entra por RED**: Test de regresión obligatorio primero con fallo demostrado en terminal.
4. **Cobertura por Fase**: Líneas ≥ 80%, Ramas ≥ 75%, Rutas críticas 100%.
5. **Triggers de Refactor Obligatorios**: Complejidad > 10, Función > 20 líneas, Clase > 200 líneas, Duplicación > 3 líneas.
6. **Legacy-Guard Continuo**: La suite de caracterización debe permanecer 100% verde tras cada cambio.
7. **Cierre Formal DoD**: Prohibido archivar sin suites verdes, cobertura cumplida y sync de specs.
8. **Prohibiciones Duras**: Cero código antes de tests, cero modificación de aserciones para pasar.
9. **Modo Incremental por Defecto**: Avance paso a paso (`--incremental`) ante incertidumbre o legacy.
10. **Failure Recovery**: Parada inmediata ante desvíos y rollback al último commit de compuerta.
11. **Precedencia de Configuración**: Las invariantes de arquitectura y transporte priman sobre refactors estéticos.
12. **Separación de Suites por Marcadores**: `unit`, `integration`, `legacy-baseline`, `e2e`.
13. **Cero Tolerancia a Advertencias**: Prohibido archivar con tareas o artefactos incompletos.
14. **Compuerta Pre-Código para Contratos**: Cambios en APIs o seguridad requieren spec previa aprobada.
15. **Gate E2E en Runtime Real & HITL**: Máximo 3 reintentos automáticos antes de intervención humana.

---

## 3. Stacks Soportados Fuera de la Caja

Este template es **100% políglota y agnóstico**:

| Stack | Framework de Pruebas | Cobertura | Validador de Compuertas |
|---|---|---|---|
| **TypeScript / Node.js** | Vitest (`tests/ts/`) | `@vitest/coverage-v8` (≥80%) | `node scripts/verify-gates.mjs` |
| **Python** | Pytest (`tests/`) | `pytest-cov` (≥80%) | `python scripts/verify_gates.py` |
| **Otros (Go, Rust, Java)** | Nativo con tags | Herramienta estándar | `node scripts/verify-gates.mjs` (agnóstico) |

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
* [Guía de Experimento A/B y Cobertura](./docs/ab-testing-and-coverage.es.md)
* [Manual Operativo y Runbook de Prompts (P0 - P11)](./MANUAL_OPERATIVO.md)
* [Las 15 Invariantes TDD+SDD](.agent/rules/INVARIANTS.md)
* [Compuerta SDD Pre-Código](.agent/rules/SDD_GATE.md)
