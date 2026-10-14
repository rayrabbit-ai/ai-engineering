# Claude Code Directives — Deterministic AI Engineering Harness

Welcome, Claude Code. This repository uses the **RayRabbit Deterministic AI Engineering Harness** with CI-enforced Git commit gates, Spec-Driven Development (OpenSpec), and strict TDD causality.

## 1. Core Development DNA & Rules
You MUST read and follow the canonical rules defined in:
- [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md): The 15 Universal Laws of Deterministic AI Engineering.
- [`.agent/rules/SDD_GATE.md`](.agent/rules/SDD_GATE.md): Spec-Driven Development (SDD) gates and workflow.
- [`.agent/rules/AGENTS.md`](.agent/rules/AGENTS.md): Coding assistant execution guidelines.

## 2. Commit per Gate Conventions (MANDATORY)
Every commit you create must follow the strict gate prefixes. CI rejects any commit not following these prefixes:
- `test(red): <description>`: Adds or updates a failing test. MUST NOT touch production code!
- `feat(green): <description>`: Minimal production code to make the test pass. Scope MUST match preceding `test(red)`.
- `refactor: <description>`: Code cleanup preserving green tests.
- `test(baseline): update <reason>`: Required when modifying characterization suites.
- `spec(sync): <description>`: Consolidating changes into `openspec/specs/`.
- `fix: <description>`: Bugfix following RED -> GREEN causality.

## 3. Essential Commands
- Run Node gate self-test: `npm run verify:gates -- --self-test`
- Run Python gate self-test: `npm run verify:gates:py -- --self-test`
- Run TypeScript tests & coverage: `npm run test:ts:coverage`
- Run Python tests & coverage: `npm run test:py:coverage`
- Guard contracts & agent rules: `npm run guard`
- Validate OpenSpec specifications: `npm run spec:validate`
