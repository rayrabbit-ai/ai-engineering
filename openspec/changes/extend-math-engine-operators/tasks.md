# Tasks: Extend Math Engine with Modulo, Power, and Safe Zero Division

## 1. Baseline Update & Failing Tests (Phase 1 & 2: RED)

- [ ] 1.1 Update legacy baseline characterization tests for division by zero returning null/None (`tests/ts/characterization/calculator.legacy.spec.ts` and `tests/characterization/test_calculator_legacy.py`)
- [ ] 1.2 Write failing unit tests for modulo `%`, power `^`, and zero-division returning null/None in TypeScript (`tests/ts/unit/calculator.spec.ts`)
- [ ] 1.3 Write failing unit tests for modulo `%`, power `^`, and zero-division returning null/None in Python (`tests/unit/test_calculator.py`)
- [ ] 1.4 Execute test suites and verify legitimate RED failures in terminal

## 2. Minimal Implementation (Phase 3: GREEN)

- [ ] 2.1 Implement `modulo`, `power`, and non-throwing `divide` in TypeScript (`src/calculator.ts`)
- [ ] 2.2 Implement `modulo`, `power`, and non-throwing `divide` in Python (`src/calculator.py`)
- [ ] 2.3 Verify all unit tests and baseline tests pass

## 3. Precedence Parser & Refactor (Phase 4 & 5: REFACTOR & INTEGRATION)

- [ ] 3.1 Extend expression parser with `^`, `%`, `/` precedence in TypeScript (`src/calculator.ts`)
- [ ] 3.2 Extend expression parser with `^`, `%`, `/` precedence in Python (`src/calculator.py`)
- [ ] 3.3 Add failing integration tests for compound expressions with `^` and `%` in TS (`tests/ts/integration/calculator.spec.ts`) and Python (`tests/integration/test_calculator_integration.py`)
- [ ] 3.4 Verify all integration tests pass

## 4. Hardening & Verification (Phase 6: HARDENING)

- [ ] 4.1 Update E2E test workflow in Python (`tests/e2e/test_calculator_e2e.py`)
- [ ] 4.2 Verify line coverage >= 80% and branch coverage >= 75% for both TS and Python
- [ ] 4.3 Validate gate scripts and OpenSpec compliance
