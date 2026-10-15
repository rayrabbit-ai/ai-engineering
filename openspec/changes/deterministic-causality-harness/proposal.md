## Why

A rigorous external adversarial forensic audit revealed three critical architectural gaps in the governance harness of `rayrabbit-ai/ai-engineering`:
1. **Scope Suffix Bypass (F-01)**: The module resolver accepted production files when `pModule.endsWith('/' + activeScope)`, allowing a generic test like `tests/auth.test.ts` (`auth`) to illegally authorize touching `src/billing/auth.ts` (`billing/auth`).
2. **Unverified RED Causality in CI (F-02)**: GitHub Actions validated commit log syntax (`test(red)` followed by `feat(green)`), but never verified historical execution against the parent commit, allowing commits where tests already passed or failed only on syntax errors.
3. **Unlinked Code & Specifications (F-03)**: OpenSpec validation was purely syntactic, lacking mechanical validation that production commits cite active OpenSpec Change IDs.

To build the industry's first true mechanical Git commit-gate harness for AI coding agents, we must eliminate all scope heuristics, enforce physical test failure replay in CI, and establish a developer-friendly DX workflow (`npm run tdd:red`, `npm run tdd:green`, `npm run tdd:refactor`).

## What Changes

- **Canonical 1:1 Hierarchical Scope Resolution**: Remove `endsWith('/' + scope)` matching in `verify-gates.mjs` and `verify_gates.py`. Enforce exact canonical path identity (`billing/auth` only matches `billing/auth`).
- **Physical RED Replay in CI**: Implement `verify-historical-replay.mjs` and update `gate-validator.yml` to checkout the parent commit (`<sha>^`), apply the RED test diff, and verify that the test runner fails strictly with a valid assertion error.
- **Mechanical OpenSpec Commit Coupling**: Validate that `feat(green)` and `fix` commits cite an existing, active OpenSpec Change ID via scope or git trailer (`OpenSpec-Change:`).
- **DX TDD Automation CLI**: Introduce `scripts/tdd-flow.mjs` with `npm run tdd:red`, `npm run tdd:green`, and `npm run tdd:refactor` to automate test failure assertion, coverage verification, scope computation, and commit formatting.
- **Documentation & Claims Realignment**: Align `README.md` and `README.es.md` with verified engineering capabilities, replacing marketing hyperbole with precise specifications and incorporating the external forensic audit report into `docs/audit/`.

## Capabilities

### New Capabilities
- `commit-causality-gate`: Strict 1:1 hierarchical scope coupling, CI historical test failure replay, OpenSpec change commit linkage, and DX automation helpers for deterministic AI TDD.

### Modified Capabilities
<!-- None: math-engine remains unchanged -->

## Impact

- **Affected Code**: `scripts/verify-gates.mjs`, `scripts/verify_gates.py`, `.github/workflows/gate-validator.yml`, `package.json`, `README.md`, `README.es.md`.
- **New Scripts**: `scripts/verify-historical-replay.mjs`, `scripts/tdd-flow.mjs`.
- **Dependencies**: No new external runtime dependencies; uses existing Node.js and Python test runners.
- **Breaking Changes**: Commits relying on suffix matching (e.g. `auth` matching `billing/auth`) will now be rejected. Commits must declare exact canonical scopes or explicit scopes.
