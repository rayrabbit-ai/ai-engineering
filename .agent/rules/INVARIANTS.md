# Universal TDD + SDD Invariants (Mandatory for All AI Coding Agents)

[English](INVARIANTS.md) | [Español](INVARIANTS.es.md)

These 15 invariants constitute the non-negotiable rules of deterministic software engineering for any AI coding assistant (Google Antigravity, Claude Code, Cursor, Roo Code, GitHub Copilot).

> **Enforcement Architecture:** Invariants 1, 2, 3, 4, 6, 12, 14, and 15 are mechanically verified by CI (`verify-gates.mjs`, `verify_gates.py`, `check_python_coverage.py`, and GitHub Actions test suites). Invariants 5, 7, 8, 9, 10, 11, and 13 govern agent reasoning protocols, prompt adapters, and local pre-commit workflows.

1. **Commit per Gate & Scope Coupling**: Atomic independent commits for `RED`, `GREEN`, `REFACTOR`, `BASELINE`, `ROUTING`, `FIX`. Every `feat(green)` or `fix` commit must be scope-coupled to the exact module of the preceding `test(red)`. Any rollback equals a clean `git revert` of that exact commit.
2. **Immutable Baseline**: Tests tagged `@legacy-baseline` are immutable. They can only be modified via an explicit commit `test(baseline): update <x> due to <y>`.
3. **All Bugs Enter via RED**: Regression test first with legitimate failure demonstrated in the terminal before touching production code, consuming the bug scope upon green fix.
4. **Coverage per Phase**: Mandatory thresholds reported per cycle: **Lines ≥ 80%**, **Branches ≥ 75%**, **Critical Paths 100%**.
5. **Mandatory Refactoring Triggers**: Refactoring triggers when: Cyclomatic complexity > 10, Function/Method > 20 lines, Class > 200 lines, Duplication > 3 lines.
6. **Continuous Legacy-Guard**: After every GREEN or REFACTOR on legacy code, run the `@legacy-baseline` suite. If any test flips, STOP and execute Failure Recovery.
7. **Formal DoD Gate & Clean Working Tree**: No change is archived without: Phases 1 to 6 complete, clean working tree, synced specs, formal archive, and defect escape metrics logged.
8. **Hard Anti-Pattern Prohibitions**: Forbidden to write implementation before tests, write tests that pass immediately, relax assertions to pass, skip refactor, or ignore failing tests.
9. **Incremental Mode by Default**: Use `--incremental` (test-by-test) when encountering legacy or uncertainty; use `--suite` only with mature specifications.
10. **Deterministic Failure Recovery**: STOP immediately → Rollback to the last valid gate commit → Resume from the correct phase → Document the lesson learned.
11. **Config Precedence over Refactor**: Architectural wire invariants, protocol conventions, and immutable paths take precedence over cosmetic refactoring.
12. **Suite Separation by Markers**: Suites decoupled by test tags (`unit`, `integration`, `legacy-baseline`, `e2e`). Fast RED/GREEN cycles must run in < 5 seconds.
13. **Zero Warning Tolerance on Archive**: If the change tool surfaces warnings or incomplete tasks, archiving is strictly blocked.
14. **Pre-Code Contract Gate & Consolidated Spec Immutability**: Any change altering APIs, data schemas, or security requires an approved spec and design delta before touching code. Direct editing of consolidated `openspec/specs/` during implementation commits is strictly forbidden; updates must consolidate via `spec(sync):`.
15. **Real Runtime E2E Gate, Adversarial Audit & HITL**: Real environment validation and pre-push adversarial audit (`/opsx-audit`). Maximum 3 automated fix attempts; critical or persistent failures mandate human escalation (Human-in-the-Loop).
