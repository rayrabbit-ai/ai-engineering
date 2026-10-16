# Proposal: Single-Source Path Policy, Runtime Coherence & Critical Configuration Gating

## Why

An independent forensic cybersecurity audit on commit `a95896c` (conducted by Copilot / GPT-6 Luna in Codespaces) issued a **REJECTED** verdict, identifying a fundamental root-cause flaw in repository route classification:
1. **Route Classification Evasion (`F-01`)**: `isTestFile` classified any path containing `/tests/` as a test file, while `isProductionFile` blindly excluded any path classified as test. Consequently, `src/tests/calc.ts` was treated as test, not production code. However, `tsconfig.json` compiles `src/**/*` into `dist/`. This allowed production-compilable code to be smuggled under a `test(red)` commit, breaking the core causal guarantee of the harness.
2. **Critical Configuration Smuggling (`F-02`)**: Configuration files (`package.json`, `pyproject.toml`, `.github/**`, lockfiles, build/runtime configs) were not classified as production code and could be modified in non-code commits (e.g. `docs: update documentation` altering dependencies or CI actions).
3. **CI Security Barrier Ordering (`R-03`)**: In `.github/workflows/gate-validator.yml`, `npm ci` was executed before the step checking for unauthorized modification of gates, allowing untrusted PR dependencies to run lifecycle scripts prior to gate verification.

Patching individual paths (e.g., adding `src/tests/` to an exclusion list) is insufficient. The root cause is that route classification rules were duplicated across 5 distinct files (`verify-gates.mjs`, `verify_gates.py`, `verify-red-failure.mjs`, `verify_red_failure.py`, and `verify-historical-replay.mjs`) using divergent heuristics, and operated independently of actual compiler and test runner configurations.

## What Changes

- **Single Declarative Source of Truth (`scripts/path-policy.json`)**: Unify production roots (`src`, `lib`, `app`, `pkg`), test roots (`tests`, `test`, `__tests__`), excluded roots (`openspec`, `docs`, `scripts`, `.agent`, `.github`, etc.), executable extensions, and critical configuration patterns in a single declarative JSON schema shared across Node.js and Python.
- **Deterministic First-Directory Marker Rule**: A path is classified strictly by the **first** recognized root directory segment. If the first marker is a production root (`src/`), the file is ALWAYS production code (fail-closed, excluding documentation `.md`/`.txt`). `src/tests/calc.ts` is strictly production code, never test.
- **Runtime Policy Coherence Engine (`scripts/verify-policy-coherence.mjs`)**: Automatically inspect `tsconfig.json`, `vitest.config.ts`, `pyproject.toml`, and `package.json` to enforce invariants I1–I5, guaranteeing that the path policy cannot diverge from real compilation and runner configurations.
- **Dedicated Critical Configuration Gating (`isCriticalConfigFile`)**: Restrict modifications to CI workflows, scripts, rules, manifests, lockfiles, and compilers strictly to `chore(...)` commits.
- **Fail-Closed Git Diff Processing (C1–C6)**: Enforce `-z --raw --no-renames --root -m --first-parent` across all diff parsers to cleanly handle non-ASCII characters without octal quotes, reject merge commits in linear TDD sequences, and reject symlink (`120000`) and submodule (`160000`) injections.
- **CI Security Barrier Hardening**: Position gate modification checks ahead of dependency installation, enforce `npm ci --ignore-scripts`, and configure `persist-credentials: false`.

## Capabilities

### New Capabilities
- `path-classification-policy`: Unified declarative single-source route classification, compiler/runner coherence verification (invariants I1–I5), critical configuration isolation, and raw Git object integrity enforcement.

### Modified Capabilities
- `commit-causality-gate`: Delegated route classification to the unified policy, blocked production smuggling in non-code gates, and enforced linear merge-free commit causality.

## Impact

- **Affected Files**: `scripts/path-policy.json`, `scripts/path-policy.fixtures.json`, `scripts/verify-policy-coherence.mjs`, `scripts/verify-gates.mjs`, `scripts/verify_gates.py`, `scripts/verify-red-failure.mjs`, `scripts/verify_red_failure.py`, `scripts/verify-historical-replay.mjs`, `scripts/redteam-audit.mjs`, `.github/workflows/gate-validator.yml`, `package.json`.
- **Breaking Changes**: PR commits containing `src/tests/` under `test(red)` or touching `package.json`/CI under non-chore gates will now be strictly rejected.
