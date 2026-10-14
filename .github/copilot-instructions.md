# GitHub Copilot Instructions (RayRabbit AI Engineering)

Before proposing or modifying any code in this repository:
1. Adhere strictly to `.agent/rules/INVARIANTS.md`, `.agent/rules/SDD_GATE.md`, and `.agent/rules/AGENTS.md`.
2. Follow strict TDD causality:
   - When writing tests in `test(red)`, touch only test files. Run `npm run verify:red` (or `npm run verify:red:py`) to verify assertion failure.
   - When implementing code in `feat(green)`, touch only production files coupled to the preceding test scope.
3. Validate commit gates before finishing your turn:
   - Run `npm run verify:gates` and `npm run verify:gates:py`.
   - Run `npm run test:ts:coverage` and `npm run test:py:coverage`.
4. Note that CI checks commit metadata, scopes, test suites, supply chain audit, and coverage thresholds; active GitHub branch protection and CODEOWNERS reviews enforce physical merge gates on `main`.
