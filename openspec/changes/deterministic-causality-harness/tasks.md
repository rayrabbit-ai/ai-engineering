## 1. Scope Coupling & Elimination of Suffix Bypass (F-01)

- [x] 1.1 Add regression test in `scripts/verify-gates.mjs` self-test verifying rejection of `tests/auth.test.ts` trying to authorize `src/billing/auth.ts`.
- [x] 1.2 Add regression test in `scripts/verify_gates.py` self-test verifying rejection of `tests/test_auth.py` trying to authorize `src/billing/auth.py`.
- [x] 1.3 Implement exact canonical module resolution in `scripts/verify-gates.mjs`, removing `endsWith('/' + activeScope)` heuristics.
- [x] 1.4 Implement exact canonical module resolution in `scripts/verify_gates.py`, removing `endsWith('/' + activeScope)` heuristics.
- [x] 1.5 Run polyglot self-tests in Node and Python to confirm green status and zero differential drift.

## 2. CI Historical RED Test Failure Replay Engine (F-02)

- [x] 2.1 Implement `scripts/verify-historical-replay.mjs` to inspect commit range, checkout parent `<sha>^`, apply test diff, and verify physical AssertionError failure.
- [x] 2.2 Add unit self-tests inside `scripts/verify-historical-replay.mjs` covering premature green test fraud and syntax compilation failures.
- [x] 2.3 Integrate `node scripts/verify-historical-replay.mjs` as a blocking gate step in `.github/workflows/gate-validator.yml`.
- [x] 2.4 Register `verify:replay` and `verify:replay:self-test` scripts in `package.json`.

## 3. Mechanical OpenSpec Change Linkage (F-03)

- [x] 3.1 Implement OpenSpec Change linkage validation in `scripts/verify-gates.mjs` for all `feat(green)` and `fix` commits.
- [x] 3.2 Implement identical OpenSpec Change linkage validation in `scripts/verify_gates.py`.
- [x] 3.3 Add self-test cases in Node and Python verifying rejection of orphaned production commits lacking active OpenSpec Change metadata.

## 4. Developer Ergonomics TDD Automation CLI (DX)

- [x] 4.1 Implement `scripts/tdd-flow.mjs` with commands `red`, `green`, and `refactor` automating test execution, failure verification, coverage assertion, and git commits.
- [x] 4.2 Register `tdd:red`, `tdd:green`, and `tdd:refactor` in `package.json`.
- [x] 4.3 Execute end-to-end dry-run test of `tdd-flow` commands.

## 5. Documentation Realignment & Forensic Audit Dossier

- [x] 5.1 Incorporate external forensic audit report into `docs/audit/2026-10-15-auditoria-forense-adversarial.es.md`.
- [x] 5.2 Realine `README.md` and `README.es.md` to remove marketing hyperbole and reflect verified mechanical capabilities.
- [x] 5.3 Run full verification suite (`guard`, `verify:gates`, `redteam-audit`) to validate complete repository compliance.
