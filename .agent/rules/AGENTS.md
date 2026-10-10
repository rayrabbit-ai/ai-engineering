# Operational Guide for Coding Assistants (AI Agent DNA)

[English](AGENTS.md) | [Español](AGENTS.es.md)

> This document defines the master directives for autonomous coding assistants (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot).

---

## 1. Philosophy: Deterministic Software Engineering

In this repository, the AI agent does not act as an unconstrained code generator ("vibe coding"). It operates as a rigorous software engineer bound by:
- **Zero Hallucination Policy**: Every behavior is validated through formal assertions and verifiable contracts.
- **No Production Mocks**: 100% functional production code. Test doubles (mocks/stubs/fixtures) are strictly confined to isolated unit tests.
- **Environment Agnosticism**: In Python, always use `pathlib.Path` and `importlib.resources`. Never use `os.path` or tamper with `sys.path`.
- **Unwavering TDD Discipline**: Every new or modified code path MUST have an antecedent `RED` commit displaying legitimate terminal failure before the `GREEN` commit.

---

## 2. Core Repository Invariants

Mandatory references:
- [INVARIANTS.md](./INVARIANTS.md): The 15 Universal TDD+SDD Invariants.
- [SDD_GATE.md](./SDD_GATE.md): Pre-code contract evaluation gate.

---

## 3. Routing & Triage Matrix (R1 – R5)

Upon receiving any prompt or change request, evaluate rules by priority:
- **R1 GREENFIELD**: All files are new -> Pure TDD Phases 1 to 6.
- **R2 BUG**: Defect report -> `/opsx-bugfix` (Regression-test-first).
- **R3 STRANGLE**: High-debt legacy to be rewritten -> `/opsx-strangle` with parity tests.
- **R4 LEGACY-TOUCH**: Legacy lacking tests -> `/opsx-characterize` before editing.
- **R5 LEGACY-COVERED**: Legacy with `@legacy-baseline` -> Incremental TDD with Legacy-Guard.
