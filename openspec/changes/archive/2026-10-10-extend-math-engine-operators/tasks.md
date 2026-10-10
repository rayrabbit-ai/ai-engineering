# Tasks: Extend Math Engine with Modulo, Power, and Safe Zero Division

## 1. Baseline Update & Failing Tests (Phase 1 & 2: RED)

- [x] 1.1 Update legacy baseline characterization tests for division by zero returning null/None (`tests/ts/characterization/calculator.legacy.spec.ts` and `tests/characterization/test_calculator_legacy.py`)
- [x] 1.2 Write failing unit tests for modulo `%`, power `^`, and zero-division returning null/None in TypeScript (`tests/ts/unit/calculator.spec.ts`)
- [x] 1.3 Write failing unit tests for modulo `%`, power `^`, and zero-division returning null/None in Python (`tests/unit/test_calculator.py`)
- [x] 1.4 Execute test suites and verify legitimate RED failures in terminal

## 2. Minimal Implementation (Phase 3: GREEN)

- [x] 2.1 Implement `modulo`, `power`, and non-throwing `divide` in TypeScript (`src/calculator.ts`)
- [x] 2.2 Implement `modulo`, `power`, and non-throwing `divide` in Python (`src/calculator.py`)
- [x] 2.3 Verify all unit tests and baseline tests pass

## 3. Precedence Parser & Refactor (Phase 4 & 5: REFACTOR & INTEGRATION)

- [x] 3.1 Extend expression parser with `^`, `%`, `/` precedence in TypeScript (`src/calculator.ts`)
- [x] 3.2 Extend expression parser with `^`, `%`, `/` precedence in Python (`src/calculator.py`)
- [x] 3.3 Add failing integration tests for compound expressions with `^` and `%` in TS (`tests/ts/integration/calculator.spec.ts`) and Python (`tests/integration/test_calculator_integration.py`)
- [x] 3.4 Verify all integration tests pass

## 4. Hardening & Verification (Phase 6: HARDENING)

- [x] 4.1 Update E2E test workflow in Python (`tests/e2e/test_calculator_e2e.py`)
- [x] 4.2 Verify line coverage >= 80% and branch coverage >= 75% for both TS and Python
- [x] 4.3 Validate gate scripts and OpenSpec compliance
