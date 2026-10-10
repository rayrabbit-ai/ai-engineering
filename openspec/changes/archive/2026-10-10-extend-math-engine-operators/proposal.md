# Proposal: Extend Math Engine with Modulo, Power, and Null on Zero Division

## Why
AI agents and calculating workflows need support for modulo (`%`) and exponentiation (`^`) operators. Furthermore, division by zero should yield a graceful `null` (TypeScript) / `None` (Python) rather than crashing the pipeline with an unhandled exception, matching resilient data-flow requirements.

## What Changes
- Add modulo operator (`%`) and method `modulo` (alias `mod`) to `SafeMathEngine`.
- Add exponentiation operator (`^`) and method `power` (alias `pow`) to `SafeMathEngine`.
- Modify `divide` so that dividing by zero returns `null` (TS) / `None` (Python) instead of raising an error.
- Update expression parsers (`evaluateSimple` / `evaluate_simple`) to support `^`, `%`, and `/`, respecting standard mathematical operator precedence (`^` before `*`, `/`, `%` before `+`, `-`).
- Update baseline characterization tests and unit/integration tests across TypeScript and Python suites.

## Capabilities

### Modified Capabilities
- `math-engine`: Enhanced with modulo and power operations, and non-throwing zero division returning null/None.

## Impact
- Core logic in `ai-engineering/src/calculator.ts` and `ai-engineering/src/calculator.py`.
- Tests in `tests/ts/` and `tests/`.
- Baseline characterization suite updated with intentional design change.

## Rollback Plan
Revert commit changes to restore exception-based division by zero and remove `%` and `^` methods.
