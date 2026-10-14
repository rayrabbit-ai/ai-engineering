# RayRabbit AI Engineering — Deterministic Development Template

[English](README.md) | [Español](README.es.md)

[![OpenSpec 1.6](https://img.shields.io/badge/OpenSpec-1.6.0-blue.svg)](https://openspec.dev)
[![CI Gate Validator](https://img.shields.io/badge/CI-Gate--Validator-green.svg)](.github/workflows/gate-validator.yml)
[![TDD Strict](https://img.shields.io/badge/Methodology-SDD%20%2B%20Strict%20TDD-orange.svg)](.agent/rules/INVARIANTS.md)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Python-blueviolet.svg)](#supported-stacks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Official RayRabbit AI Template Repository**  
> *Operational framework and blueprint to build mission-critical software with Autonomous Coding Agents (Google Antigravity, Claude Code, Cursor, Roo Code, and more).*

---

## 1. The Problem: The Danger of "Vibe Coding"

Unconstrained usage of AI coding assistants ("vibe coding") produces:
* **Architectural Drift**: The agent silently rewrites contracts, destroys interfaces, and adds unnecessary dependencies.
* **False Positives ("Fake Greens")**: The model writes superficial tests or relaxes assertions to pass on the first attempt.
* **Legacy Code Regressions**: Modifying existing code without an immutable safety net breaks undocumented historical behaviors.

### The Solution: Deterministic AI Engineering
This template fuses **Spec-Driven Development (OpenSpec)** with **Strict Test-Driven Development (TDD)** and **CI-Enforced Causal Git Commit Gates**:
1. **Zero code without prior approved specification** (`openspec/specs/`).
2. **Zero production code without a verified failing test (`test(red)`) in the terminal with scope/module coupling and strict isolation** (production files strictly forbidden and test files mandatory in `test(red)`).
3. **Physical merge blocking in CI via Branch Protection**: Pull Requests cannot be merged if they violate TDD commit causality, baseline immutability, or coverage thresholds (see [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md)).
4. **Built-in Adversarial Audit & Guard**: Pre-push and CI enforcement via [`guard-agent`](scripts/guard-agent.mjs), [`adversarial_auditor`](.agent/rules/ADVERSARIAL_AUDITOR.md), and [`/opsx-audit`](.agent/workflows/opsx-audit.md).

> 🔬 **Empirical Evidence**: Read our [Live A/B Benchmark Case Study](./docs/ab-testing-and-coverage.md) documenting how an unconstrained agent falls into the *"TDD Illusion"* and gets blocked by the CI gate validator.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC AI ENGINEERING PIPELINE                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Requirement / Bug Report
          │
          ▼
   [ P0. TRIAGE ] ────────────► Classification R1–R5 (New vs Legacy)
          │
    ┌─────┴─────────────────────────────────┐
    │ Greenfield                            │ Legacy Detected
    ▼                                       ▼
 [ SDD: Spec + Proposal ]            [ P1. CHARACTERIZE ]
    │                                       │ (Golden Master / @legacy-baseline)
    ▼                                       ▼
 [ P2. RED ] ◄──────────────────────────────┘
    │ (Test fails legitimately in terminal. Commit: test(red))
    ▼
 [ P3. GREEN ]
    │ (MINIMAL implementation. Commit: feat(green) + Coverage ≥80%)
    ▼
 [ P4. REFACTOR ]
    │ (SOLID, Complexity <10, Methods <20L. Commit: refactor)
    ▼
 [ P5. INTEGRATION ]
    │ (Interface contracts. Fail-first. Commit: test(integration))
    ▼
 [ P6. HARDENING ]
    │ (Edge cases & stress. Commit: chore(hardening))
    ▼
 [ P7. GATE E2E ]
    │ (Real runtime live tests. Max 3 retries -> HITL)
    ▼
 [ P8. CLOSE & ARCHIVE ]
    │ (Sync Specs + Archive Change)
    ▼
  GitHub PR (Physically enforced via .github/workflows/gate-validator.yml + Branch Protection)
```

---

## 2. The 15 Universal Invariants

Any coding agent operating in this repository must strictly adhere to the rules codified in [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md):

* **Automated CI & Commit Gates** (Mechanically verified on every PR and commit):
  1. **Commit per Gate & Scope Coupling**: Atomic independent commits (`RED`, `GREEN`, `REFACTOR`, `BASELINE`, `FIX`). Every production file modified in `feat(green)` must be coupled to an active `test(red)` scope.
  2. **Immutable Baseline**: Tests tagged `@legacy-baseline` are never modified without explicit `test(baseline): update`.
  3. **Isolation & Test Mandatory in RED**: Production files are strictly forbidden in `test(red)`, and at least one real test file must be changed.
  4. **Coverage per Phase**: Lines ≥ 80%, Branches ≥ 75% mechanically checked in CI for TS and Python.
  6. **Continuous Legacy-Guard**: Characterization suite must remain 100% green on every step.
  - **OpenSpec Spec Immutability**: Direct tampering with consolidated `openspec/specs/` is blocked.

* **Autonomous Agent Playbook & Protocol** (Enforced by Agent DNA & workflows):
  5. **Mandatory Refactoring Triggers**: Complexity > 10, Method > 20 lines, Class > 200 lines, Duplication > 3 lines.
  7. **Formal DoD Gate**: Closed changes require completed phases 1 to 6, green suites, and synced specs.
  8. **Hard Anti-Pattern Prohibitions**: Zero code before tests, zero assertion relaxation, zero ignored test failures.
  9. **Incremental Mode by Default**: Step-by-step progress (`--incremental`) when facing legacy or uncertainty.
  10. **Deterministic Failure Recovery**: Immediate STOP upon invariant violation, rollback to the last valid gate commit.
  11. **Config Precedence over Refactor**: Architectural wire invariants take precedence over cosmetic refactoring.
  12. **Suite Separation by Markers**: `unit`, `integration`, `legacy-baseline`, `e2e`.
  13. **Zero Warning Tolerance on Archive**: Incomplete artifacts or pending tasks strictly block archiving.
  14. **Pre-Code Contract Gate**: API or security changes require approved spec deltas before touching code.
  15. **Real Runtime E2E Gate & HITL**: Maximum 3 automated fix attempts before mandatory human escalation.

---

## 3. Supported Stacks

| Stack | Testing Engine | Coverage Provider | CI Enforcement Status |
|---|---|---|---|
| **TypeScript / Node.js** | Vitest (`tests/ts/`) | `@vitest/coverage-v8` (Lines ≥80%, Branches ≥75%) | Full CI suite + commit gate validator (`verify-gates.mjs`) |
| **Python** | Pytest (`tests/`) | `pytest-cov` (Lines ≥80%, Branches ≥75%) | Full CI suite + commit gate validator (`verify_gates.py`) |
| **Others (Go, Rust, Java)** | Native runners | Standard toolchain | Commit gates validator is polyglot; plug in your test runner in CI |

---

## 4. Repository Structure

```text
.
├── .github/workflows/
│   ├── gate-validator.yml       # PR Gatekeeper: verifies TDD causality & coverage
│   └── validate-specs.yml       # OpenSpec schema validator
├── .agent/                       # Context & workflows for Antigravity, Cursor, Claude Code
│   ├── rules/                   # 15 Invariants, Pre-Code Gate & Agent DNA
│   ├── skills/                  # Runnable skills (TDD cycle, OpenSpec)
│   └── workflows/               # Orchestration workflows (/opsx-triage, /opsx-apply...)
├── openspec/                     # Spec-driven engine
│   ├── config.yaml
│   ├── specs/                   # Living specifications
│   └── changes/                 # Active changes (proposal, design, tasks)
├── scripts/
│   ├── verify-gates.mjs         # Native Node.js commit gate auditor (zero-dependency)
│   ├── verify_gates.py          # Python commit gate auditor
│   └── guard-agent.mjs          # Workflow and contract preservation guardian
├── src/                         # Production code (TypeScript & Python examples)
├── tests/                       # Structured suites (unit, integration, characterization, e2e)
├── docs/                        # A/B Testing & Coverage guide
├── package.json
└── pyproject.toml
```

---

## 5. Quickstart

See [`QUICKSTART.md`](./QUICKSTART.md) to get started in 3 minutes.

```bash
# 1. Clone the template
git clone https://github.com/rayrabbit-ai/ai-engineering.git my-project
cd my-project

# 2. Install dependencies
npm install

# 3. Audit commit gates at any time
npm run verify:gates

# 4. Run tests with coverage
npm run test:ts:coverage     # TypeScript
npm run test:py:coverage     # Python
```

---

## 6. Additional Documentation
* [GitHub Branch Protection & Physical Merge Blocking](./docs/BRANCH_PROTECTION.md)
* [Empirical A/B Benchmark Case Study & Coverage Guide](./docs/ab-testing-and-coverage.md)
* [Operational Manual and Prompt Sequences (P0 - P11)](./OPERATIONAL_MANUAL.md)
* [The 15 Universal Invariants](.agent/rules/INVARIANTS.md)
* [Pre-Code SDD Gate](.agent/rules/SDD_GATE.md)
