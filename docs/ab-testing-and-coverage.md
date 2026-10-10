# Guide: A/B Testing Experiment & Code Coverage

> **RayRabbit AI Engineering Standard**  
> *How to execute the deterministic A/B testing experiment and master code coverage as a quality gate.*

---

## Part 1: The A/B Contrast Experiment (AI Engineering vs. Vibe Coding)

This reproducible experiment demonstrates why unconstrained AI assistance ("vibe coding") introduces silent regression, and how the deterministic AI Engineering framework catches it immediately.

### Baseline (Session 1: Under Deterministic Governance)
In `ai-engineering`, the `math-engine` component was implemented following SDD + TDD:
1. **Spec**: Defined in `openspec/changes/math-engine/` and `openspec/specs/math-engine/spec.md`.
2. **Gates**: Sequential commits: `test(red)` -> `feat(green)` -> `refactor` -> `test(integration)` -> `chore(hardening)`.
3. **Legacy Guard**: Characterization suite tagged with `@legacy-baseline` frozen in:
   - TypeScript: `tests/ts/characterization/calculator.legacy.spec.ts`
   - Python: `tests/characterization/test_calculator_legacy.py`
4. **Result**: 100% tests pass, >90% line coverage, 0 gate errors (`npm run verify:gates`).

---

### The Experiment (Session 2: Unconstrained "Vibe Coding")
Open a fresh agent session without strict rules or pretend an unconstrained assistant is given this prompt:
> *"Add a modulo operator `%` and power operator `^` to the calculator, and modify division so dividing by zero returns `null` instead of raising an error."*

#### What the Unconstrained Agent Does:
1. Edits `src/calculator.ts` directly without writing a failing test first.
2. Changes division logic to return `null`, breaking the existing contract.
3. Makes a single commit: `feat: add modulo and power operators`.
4. Writes no tests for edge cases or writes superficial tests that pass immediately.

#### The Forensic Audit (Returning to Session 1):
When the team runs the automated quality checks:
```bash
# 1. Audit commit history and TDD causality
npm run verify:gates
```
**Caught Violations:**
* ❌ **TDD Causality Violation (Invariant 1 & 3)**: Commit `feat:` lacks an antecedent `test(red):` commit in the branch.
* ❌ **Legacy-Guard Failure (Invariant 2 & 6)**: The `@legacy-baseline` characterization test fails because division by zero no longer raises the contracted error.
* ❌ **Contract Gate Violation (Invariant 14)**: The API contract was changed without an approved delta spec in `openspec/`.

```bash
# 2. Check coverage regression
npm run test:ts:coverage
```
* ❌ **Coverage Drop (Invariant 4)**: New uncovered branches in the modulo/power evaluation drop coverage below the 80% threshold, blocking CI.

---

## Part 2: How to Use and Interpret Code Coverage

### 1. Running Coverage
```bash
# TypeScript / Vitest (Istanbul / v8)
npm run test:ts:coverage

# Python (pytest-cov)
npm run test:py:coverage
```

### 2. Viewing the HTML Interactive Report
Open in your browser:
```text
file:///your-repo-path/ai-engineering/coverage/index.html
```

#### Understanding the Metrics:
* **Statements**: Percentage of executable code statements executed by tests.
* **Branches**: Percentage of decision paths (`if / else`, ternary operators, `switch` cases) evaluated in both truthy and falsy states.
* **Functions**: Percentage of declared methods called during testing.
* **Lines**: Percentage of lines visited.

#### Identifying Gaps Visually:
* **Green Highlight**: Code executed and validated.
* **Red Highlight**: Dead code, untested error handlers, or unreached logic branches.
* **Excluding Re-export / Barrel Files**: Entry points that only re-export modules (such as `src/index.ts`) can be excluded from coverage calculation in `vitest.config.ts`:
  ```typescript
  coverage: {
    exclude: ['src/index.ts', 'dist/**'],
    lines: 80,
    branches: 75,
  }
  ```

### 3. Coverage as a Hard Gate in CI/CD
In `.github/workflows/gate-validator.yml`, coverage is not merely informational; it is an immutable gate:
* If line coverage < 80% or branch coverage < 75%, the CI workflow exits with code `1`, preventing any merge into `main`.
