# Gemini & Google Antigravity Directives — AI Engineering Harness

Welcome, Gemini / Google Antigravity. This repository enforces the **RayRabbit Deterministic AI Engineering Harness**.

## 1. Canonical Rules & Invariants
Before writing or refactoring any code, you MUST follow:
- [`.agent/rules/INVARIANTS.md`](.agent/rules/INVARIANTS.md): 15 Universal Laws (Commit per gate, scope coupling, baseline immutability).
- [`.agent/rules/SDD_GATE.md`](.agent/rules/SDD_GATE.md): OpenSpec change-first specification protocol.
- [`.agent/rules/AGENTS.md`](.agent/rules/AGENTS.md): Coding assistant execution guidelines.

## 2. Commit per Gate Conventions
CI validates your commits deterministically:
- `test(red):`: Must add tests, 0 production files.
- `feat(green):`: Scope-coupled to the preceding `test(red)`.
- `refactor:`: Cleaning code without breaking tests.
- `spec(sync):`: Updating consolidated `openspec/specs/`.

## 3. Local Verification
- `npm run verify:gates -- --self-test`
- `npm run verify:gates:py -- --self-test`
- `npm run test:ts:coverage`
- `npm run test:py:coverage`
- `npm run guard`
- `npm run spec:validate`
