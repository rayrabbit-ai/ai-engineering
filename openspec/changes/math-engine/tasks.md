# Tasks: Safe Math Engine Implementation

## 1. Specification & Test Setup (Phase 1 & 2: RED)

- [x] 1.1 Define test suite in TypeScript (`tests/ts/unit/calculator.spec.ts`) demonstrating initial failing tests
- [x] 1.2 Define test suite in Python (`tests/unit/test_calculator.py`) demonstrating initial failing tests
- [x] 1.3 Freeze `@legacy-baseline` characterization suites in both languages

## 2. Minimal Implementation (Phase 3: GREEN)

- [x] 2.1 Implement `SafeMathEngine` arithmetic methods in TypeScript (`src/calculator.ts`)
- [x] 2.2 Implement `SafeMathEngine` arithmetic methods in Python (`src/calculator.py`)
- [x] 2.3 Verify all unit tests pass with zero production mocks

## 3. Precedence Parser & Refactor (Phase 4 & 5: REFACTOR & INTEGRATION)

- [x] 3.1 Implement two-phase operator precedence evaluation in TypeScript
- [x] 3.2 Implement two-phase operator precedence evaluation in Python
- [x] 3.3 Add integration tests verifying precedence without unsafe `eval()`

## 4. Hardening & Certification (Phase 6: HARDENING)

- [x] 4.1 Verify branch coverage exceeds 75% and line coverage exceeds 80% (achieved 92.9% in TS, 88.9% in Python)
- [x] 4.2 Verify legacy-guard passes without regression flips
- [x] 4.3 Validate gate validator scripts (`scripts/verify-gates.mjs` and `scripts/verify_gates.py`)
