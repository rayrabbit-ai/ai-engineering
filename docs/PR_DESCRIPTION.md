## 🛡️ Pull Request Summary

This Pull Request consolidates the technical remediation of all security, contract, and causality findings identified across internal and independent forensic audits of the harness.

Additionally, it integrates the hardened semantic contract guardian (`scripts/guard-agent.mjs` with `--self-test`), the internal heuristic security and contract scanner (`scripts/redteam-audit.mjs`), verifiable GitHub Ruleset configuration (`docs/audit/github-ruleset-main.json`), and bilingual documentation alignment.

---

### 📦 Key Changes Implemented

1. **Semantic Contract Guardian Hardening (`scripts/guard-agent.mjs`):**
   - Replaced disjunction check (`anchors.some()`) and shallow length threshold (`50` chars) with strict conjunction (`anchors.every()`), per-contract `minLength`, and structural verification of all 15 numbered invariant clauses (`1.`–`15.`) in `INVARIANTS.md` and `INVARIANTS.es.md`, 6 numbered clauses in `ADVERSARIAL_AUDITOR.md`/`.es.md`, and routing rules `R1`–`R5` in `AGENTS.md`/`.es.md`.
   - Added `--self-test` mode (`npm run verify:guard:self-test`) verifying that single-anchor placeholder replacement of `INVARIANTS.md` is rejected with exit code `1`.

2. **Internal Heuristic Security & Contract Scanner (`scripts/redteam-audit.mjs`):**
   - Removed inaccurate static findings and unsubstantiated compliance headers; dynamically executes `guard-agent.mjs --self-test` and in-memory `validateGuardContracts` checks in Domain 3.
   - Renamed CI job in `.github/workflows/gate-validator.yml` and GitHub Ruleset `25150565` to `Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)`.

3. **Historical RED Replay & Assertion Verification (`scripts/verify-historical-replay.mjs`):**
   - `classifyTestResult` and `assertLegitimateRed` enforce explicit assertion failure evidence in isolated `git worktree` replays, blocking syntax/collection errors in fail-closed mode.
   - Preserves untrimmed trailing newlines on `git diff` patches so `git apply` never skips commits.

4. **TDD Causality & Hierarchical Scope Coupling (`scripts/verify-gates.mjs` & `scripts/verify_gates.py`):**
   - Preserves relative directory hierarchy (`ui/button` vs `payments/button`), prevents multi-module scope smuggling, and classifies non-canonical directories accurately.

5. **Independent Line & Branch Coverage Gates:**
   - `scripts/check_python_coverage.py` and `vitest.config.ts` enforce statement/line coverage (`>= 80%`) and branch coverage (`>= 75%`) independently.

6. **Verifiable GitHub Ruleset Snapshot (`docs/audit/github-ruleset-main.json`):**
   - Added authenticated snapshot of active GitHub Ruleset `25150565` on `main` (`enforcement: active`, 5 required status checks, pull request review & CODEOWNERS enforcement).

---

### 🧪 Physical Verification Matrix (13/13 Passed Locally)

- `node scripts/guard-agent.mjs` -> **Exit 0**
- `npm run verify:guard:self-test` -> **Exit 0** (5/5 passed)
- `npm run verify:gates:self-test` -> **Exit 0** (17/17 passed)
- `npm run verify:gates:py:self-test` -> **Exit 0** (16/16 passed)
- `npm run verify:red:self-test` -> **Exit 0** (4/4 passed)
- `npm run verify:red:py:self-test` -> **Exit 0** (4/4 passed)
- `npm run verify:replay:self-test` -> **Exit 0** (9/9 passed)
- `npm run test:ts:coverage` -> **Lines: 87.61% | Branches: 77.27%**
- `npm run test:ts:e2e` -> **Exit 0**
- `npm run test:py:coverage` -> **Lines: 87.76% | Branches: 83.87%**
- `pytest -m e2e` -> **Exit 0**
- `npm run spec:validate` -> **Exit 0**
- `npm run audit:redteam` -> **Exit 0 (0 findings across 13 checks)**
