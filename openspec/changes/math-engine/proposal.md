# Proposal: Safe Math Engine

## Why
AI coding assistants and autonomous agent workflows require deterministic, safe mathematical operations without falling prey to arbitrary code execution risks (such as unsafe `eval()`) or silent type coercion bugs. This foundation provides a robust, polyglot mathematical evaluation engine governed by strict TDD.

## What Changes
- Implement `SafeMathEngine` with arithmetic operations (`add`, `subtract`, `multiply`, `divide`).
- Controlled error handling on division by zero (`ValueError` / `Error`).
- Expression parser evaluating basic arithmetic strings respecting operator precedence (`*` before `+` and `-`).
- Polyglot implementation in TypeScript (`src/calculator.ts`) and Python (`src/calculator.py`).
- 100% test coverage and baseline preservation (`@legacy-baseline`).

## Capabilities

### New Capabilities
- `math-engine`: Deterministic math calculations with type safety and precedence evaluation.

### Modified Capabilities

## Impact
- Core logic in `src/calculator.ts`, `src/calculator.py`, `src/index.ts`, `src/__init__.py`.
- Test suites in `tests/ts/` and `tests/`.
