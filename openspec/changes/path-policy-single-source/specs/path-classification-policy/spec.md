## ADDED Requirements

### Requirement: Single Source of Truth Path Classification
The commit gate verification infrastructure SHALL read all root directories, file extensions, and path patterns from a single declarative JSON policy (`scripts/path-policy.json`), prohibiting local ad-hoc regex definitions in individual validation scripts.

#### Scenario: Unified path classification across runtimes
- **WHEN** an arbitrary file path is evaluated by `verify-gates.mjs` or `verify_gates.py`
- **THEN** both implementations SHALL yield identical classification results matching the shared test fixtures (`scripts/path-policy.fixtures.json`).

### Requirement: Deterministic Production Root Fail-Closed Boundary
The path classifier SHALL apply a deterministic first-directory marker rule: when a path begins with a production root directory (e.g. `src/`), all files under that directory SHALL be classified as production code regardless of subfolder names or suffixes, excluding only documentation formats (`.md`, `.txt`).

#### Scenario: Rejection of test-named paths under production roots
- **WHEN** a `test(red)` commit includes a file located at `src/tests/calc.ts` or `src/test_calc.py`
- **THEN** the commit gate validator SHALL classify the file as production code and reject the `test(red)` commit with Invariant 1 violation.

#### Scenario: Production code acceptance in feat(green)
- **WHEN** a `feat(green)` commit modifies `src/calc.ts` or `src/tests/calc.ts` coupled to an active RED scope
- **THEN** the commit gate validator SHALL classify the file as production code and accept the commit.

### Requirement: Critical Configuration Gating via Chore Commits
The commit gate validator SHALL restrict modifications to critical configuration files (including package manifests, lockfiles, CI workflows, compiler settings, and agent governance rules) strictly to `chore(...)` commits.

#### Scenario: Rejection of critical config tampering in non-chore gates
- **WHEN** a commit with prefix `docs:`, `feat:`, `spec:`, `test:`, or `triage:` modifies `package.json`, `pyproject.toml`, or `.github/workflows/gate-validator.yml`
- **THEN** the validator SHALL reject the commit with an Invariant of Critical Configuration violation.

#### Scenario: Legitimate configuration updates in chore
- **WHEN** a commit with prefix `chore(deps):` or `chore(hardening):` modifies `package.json` or `.github/workflows/gate-validator.yml`
- **THEN** the validator SHALL accept the configuration modification.

### Requirement: Runtime Policy Coherence Invariants (I1-I5)
The harness SHALL provide an automated verifier (`scripts/verify-policy-coherence.mjs`) that inspects compiler configuration (`tsconfig.json`), test runner settings (`vitest.config.ts`, `pyproject.toml`), and coverage scripts (`package.json`), enforcing that declared policy roots strictly match real runtime execution roots.

#### Scenario: Detection of compiler and policy divergence
- **WHEN** `tsconfig.json` includes a directory not registered in `productionRoots` or includes a directory registered in `testRoots`
- **THEN** the coherence verifier SHALL fail with an Invariant I1 or I2 violation.

#### Scenario: Detection of runner and policy divergence
- **WHEN** `vitest.config.ts` or `pyproject.toml` runs tests from a directory not registered in `testRoots`
- **THEN** the coherence verifier SHALL fail with an Invariant I3 violation.

### Requirement: Integrity Guard against Merge Commits and Symlink Injection
The commit gate validator SHALL inspect raw Git tree objects and commit metadata, rejecting any commit that introduces symlinks, submodules, or non-linear merge commits in the TDD causal history.

#### Scenario: Rejection of merge commits
- **WHEN** a commit in the Pull Request range has more than one parent commit
- **THEN** the validator SHALL reject the commit with a Causal History Linearity violation.

#### Scenario: Rejection of symlink objects
- **WHEN** a commit introduces or modifies a file with Git object mode `120000` (symlink)
- **THEN** the validator SHALL reject the commit with a Git Tree Object Integrity violation.
