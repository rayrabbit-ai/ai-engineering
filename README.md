# RayRabbit AI Engineering — Deterministic Development Template

[English](README.md) | [Español](README.es.md)

[![OpenSpec 1.6](https://img.shields.io/badge/OpenSpec-1.6.0-blue.svg)](https://openspec.dev)
[![CI Gate Validator](https://img.shields.io/badge/CI-Gate--Validator-green.svg)](.github/workflows/gate-validator.yml)
[![TDD Strict](https://img.shields.io/badge/Methodology-SDD%20%2B%20Strict%20TDD-orange.svg)](.agent/rules/INVARIANTS.md)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Python-blueviolet.svg)](#supported-stacks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Official RayRabbit AI Template Repository**  
> *Operational framework and blueprint to build mission-critical software with Autonomous Coding Agents (Google Antigravity, Claude Code, Cursor, Roo Code, and GitHub Copilot).*

---

## 1. The Problem: The Danger of "Vibe Coding"

Unconstrained usage of AI coding assistants ("vibe coding") produces:
* **Architectural Drift**: The agent silently rewrites contracts, destroys interfaces, and adds unnecessary dependencies.
* **False Positives ("Fake Greens")**: The model writes superficial tests or relaxes assertions to pass on the first attempt.
* **Legacy Code Regressions**: Modifying existing code without an immutable safety net breaks undocumented historical behaviors.

### The Solution: Deterministic AI Engineering
This template fuses **Spec-Driven Development (OpenSpec)** with **Strict Test-Driven Development (TDD)** and **CI-Enforced Causal Git Commit Gates**:
1. **Zero code without prior approved specification** (`openspec/specs/`).
2. **Zero production code without a verified failing test (`test(red)`) in the terminal with scope/module coupling**.
3. **Zero Pull Requests accepted if they violate the 15 Invariants, TDD causality, or consolidated spec immutability**.
4. **Built-in Adversarial Audit**: Pre-push validation via the [`adversarial_auditor`](.agent/rules/ADVERSARIAL_AUDITOR.md) subagent and [`/opsx-audit`](.agent/workflows/opsx-audit.md).

> 🔬 **Empirical Evidence**: Read our [Live A/B Benchmark Case Study](./docs/ab-testing-and-coverage.md) proving how an unconstrained agent falls into the *"TDD Illusion"* and gets blocked by the CI gate validator.

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
  GitHub PR (Audited by .github/workflows/gate-validator.yml)
```

---

## 2. The 15 Universal Invariants

Any coding agent operating in this repository must strictly adhere to the rules codified in [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md):

1. **Commit per Gate**: Atomic independent commits (`RED`, `GREEN`, `REFACTOR`, `BASELINE`, `FIX`).
2. **Immutable Baseline**: Tests tagged `@legacy-baseline` are never modified to justify new code.
3. **All Bugs Enter via RED**: Mandatory regression test demonstrating legitimate failure in terminal before modifying production code.
4. **Coverage per Phase**: Lines ≥ 80%, Branches ≥ 75%, Critical paths 100%.
5. **Mandatory Refactoring Triggers**: Complexity > 10, Method > 20 lines, Class > 200 lines, Duplication > 3 lines.
6. **Continuous Legacy-Guard**: The characterization suite must remain 100% green after every step.
7. **Formal DoD Gate**: Closed changes require completed phases 1 to 6, green suites, and synced specs.
8. **Hard Anti-Pattern Prohibitions**: Zero code before tests, zero assertion relaxation, zero ignored test failures.
9. **Incremental Mode by Default**: Step-by-step progress (`--incremental`) when facing legacy or uncertainty.
10. **Deterministic Failure Recovery**: Immediate STOP upon invariant violation, rollback to the last valid gate commit.
11. **Config Precedence over Refactor**: Architectural wire invariants and path conventions take precedence over cosmetic refactoring.
12. **Suite Separation by Markers**: `unit`, `integration`, `legacy-baseline`, `e2e`.
13. **Zero Warning Tolerance on Archive**: Incomplete artifacts or pending tasks strictly block archiving.
14. **Pre-Code Contract Gate**: API or security changes require approved spec deltas before touching code.
15. **Real Runtime E2E Gate & HITL**: Maximum 3 automated fix attempts before mandatory human escalation.

---

## 3. Supported Stacks

This template is **100% polyglot and agnostic**:

| Stack | Testing Engine | Coverage Provider | Gate Validator |
|---|---|---|---|
| **TypeScript / Node.js** | Vitest (`tests/ts/`) | `@vitest/coverage-v8` (≥80%) | `node scripts/verify-gates.mjs` |
| **Python** | Pytest (`tests/`) | `pytest-cov` (≥80%) | `python scripts/verify_gates.py` |
| **Others (Go, Rust, Java)** | Native with tags | Standard toolchain | `node scripts/verify-gates.mjs` (agnostic) |

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
* [Empirical A/B Benchmark Case Study & Coverage Guide](./docs/ab-testing-and-coverage.md)
* [Operational Manual and Prompt Sequences (P0 - P11)](./OPERATIONAL_MANUAL.md)
* [The 15 Universal Invariants](.agent/rules/INVARIANTS.md)
* [Pre-Code SDD Gate](.agent/rules/SDD_GATE.md)
