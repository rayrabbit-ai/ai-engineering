# Tasks: Single-Source Path Policy & Runtime Coherence

- [x] 1. Single-source Path Policy Specification & Verification Engine <!-- id: 1-single-source-spec -->
  - [x] 1.1 Create `scripts/path-policy.json` with productionRoots, testRoots, excludedRoots, extensions, and critical config patterns.
  - [x] 1.2 Create `scripts/path-policy.fixtures.json` with comprehensive shared truth table (63 test cases).
  - [x] 1.3 Create `scripts/verify-policy-coherence.mjs` verifying invariants I1–I5 against `tsconfig.json`, `vitest.config.ts`, `pyproject.toml`, and `package.json`.
  - [x] 1.4 Wire `verify:policy` and `verify:policy:self-test` into `package.json`.

- [x] 2. Polyglot Gate & Historical Replay Alignment (Node & Python) <!-- id: 2-polyglot-gates -->
  - [x] 2.1 Refactor `scripts/verify-gates.mjs` to consume `path-policy.json` and enforce the first-directory marker rule.
  - [x] 2.2 Refactor `scripts/verify_gates.py` to consume `path-policy.json` and ensure 100% parity against shared fixtures.
  - [x] 2.3 Refactor `scripts/verify-red-failure.mjs`, `scripts/verify_red_failure.py`, and `scripts/verify-historical-replay.mjs` to delegate route classification to the single policy.

- [x] 3. Adversarial Vectors C1-C6 (Non-ASCII, Merge Commits, Symlinks, Homoglyphs) <!-- id: 3-adversarial-vectors -->
  - [x] 3.1 Adopt `-z --raw --no-renames --root -m --first-parent` for null-byte separated git tree extraction.
  - [x] 3.2 Implement Cyrillic homoglyph folding (`foldHomoglyphs` / `fold_homoglyphs`) and Unicode NFC normalization.
  - [x] 3.3 Implement merge commit detection and rejection in `validateCommitList` / `validate_commit_list`.
  - [x] 3.4 Implement symlink (`120000`) and submodule (`160000`) detection and rejection.

- [x] 4. Critical Configuration Gating & CI Pipeline Hardening <!-- id: 4-ci-hardening -->
  - [x] 4.1 Enforce `isCriticalConfigFile` requiring `chore(...)` commits for configuration changes.
  - [x] 4.2 Move gate modification security barrier ahead of dependency install in `.github/workflows/gate-validator.yml`.
  - [x] 4.3 Configure `npm ci --ignore-scripts` and `persist-credentials: false` across all CI checkout steps.
  - [x] 4.4 Add vectors `V-09` and `V-10` plus policy coherence probe to `scripts/redteam-audit.mjs` (24 total probes).

- [x] 5. Bilingual Audit Dossier & Verification Matrix Synchronization <!-- id: 5-docs-sync -->
  - [x] 5.1 Import independent forensic audit report into `docs/audit/2026-10-16-auditoria-forense-a95896c.es.md`.
  - [x] 5.2 Synchronize audit dossier tables and 24-probe count in `docs/audit/README.md` and `docs/audit/README.en.md`.
  - [x] 5.3 Synchronize `README.md` and `README.es.md` with updated script catalogs and probe counts.
  - [x] 5.4 Execute full verification matrix and validate agent guard contracts (`guard-agent.mjs`).
