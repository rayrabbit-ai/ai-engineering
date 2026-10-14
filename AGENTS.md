# RayRabbit AI Engineering — Autonomous Agent Instructions

> **Target Audience:** AI Coding Assistants (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot, Codex, Cascade).

Before making any code changes in this repository, you must read and adhere to:
* [`.agent/rules/INVARIANTS.md`](./.agent/rules/INVARIANTS.md) (The 15 Universal Invariants)
* [`.agent/rules/SDD_GATE.md`](./.agent/rules/SDD_GATE.md) (Spec-Driven Development gate)
* [`.agent/rules/AGENTS.md`](./.agent/rules/AGENTS.md) (Agent DNA and integration paths)

## Operating Protocol & Enforcement Boundaries

1. **Strict TDD Gate Causality:**
   - When creating a `test(red)` commit, only modify test files (`tests/` or `*.spec.*`).
   - Run `npm run verify:red` (or `npm run verify:red:py`) to physically verify that the test fails due to a legitimate assertion error (`AssertionError`, `FAIL`), not a syntax error or import failure.
   - Every `feat(green)` or `fix` commit must modify production files corresponding to the active `test(red)` scope.
2. **Local Commit Verification:**
   - Run `npm run verify:gates` (and `npm run verify:gates:py`) before pushing or creating a PR.
3. **Automated CI Checks:**
   - GitHub Actions mechanically audits commit prefixes, scope coupling, baseline tests, 100% build pass, supply chain dependencies (`npm audit --audit-level=high`), and independent coverage thresholds (Lines ≥ 80%, Branches ≥ 75%).
4. **Human Review & Branch Protection:**
   - GitHub branch protection and human approval (CODEOWNERS review) are mandatory layers that enforce physical merge blocking on `main`.
