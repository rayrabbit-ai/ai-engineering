## ADDED Requirements

### Requirement: Canonical Hierarchical Scope Coupling
The commit gate validators in Node.js (`verify-gates.mjs`) and Python (`verify_gates.py`) SHALL enforce exact canonical 1:1 module identity between active `test(red)` scopes and production files modified in `feat(green)` or `fix` commits, without suffix-based wildcard matching.

#### Scenario: Suffix collision rejection
- **WHEN** a `test(red)` commit modifies only `tests/auth.test.ts` (inferring scope `auth`)
- **AND** a subsequent `feat(green)` commit modifies `src/billing/auth.ts` (inferring module `billing/auth`)
- **THEN** both validators SHALL reject the commit sequence with a causality violation error and exit code 1.

#### Scenario: Exact canonical subpath match
- **WHEN** a `test(red)` commit modifies `tests/billing/auth.test.ts` (inferring scope `billing/auth`)
- **AND** a subsequent `feat(green)` commit modifies `src/billing/auth.ts` (inferring module `billing/auth`)
- **THEN** both validators SHALL accept the commit sequence as properly coupled.

#### Scenario: Explicit scope override
- **WHEN** a `test(red)(billing/auth): add test` commit explicitly declares the target scope in the commit subject
- **AND** a subsequent `feat(green)(billing/auth): implement logic` commit matches that exact scope
- **THEN** both validators SHALL accept the commit sequence.

### Requirement: Historical RED Test Failure Replay in CI
The CI workflow SHALL mechanically verify that every `test(red)` commit within a Pull Request was an authentic failing test by checking out its parent commit, applying the test diff, and verifying that the test runner fails due to an assertion error.

#### Scenario: Premature green test rejection
- **WHEN** a commit in a PR has prefix `test(red):` but its introduced test passes with exit code 0 against the parent commit codebase
- **THEN** the CI historical replay gate SHALL abort with a fraud detection error (`FRAUD: test was already passing before implementation`) and exit code 1.

#### Scenario: Syntax or import error rejection
- **WHEN** a commit has prefix `test(red):` but fails against the parent commit due to a syntax error or missing module import rather than a test assertion failure
- **THEN** the CI historical replay gate SHALL reject the commit as a non-executable test.

#### Scenario: Legitimate assertion failure certification
- **WHEN** a commit has prefix `test(red):` and fails against the parent commit strictly due to an AssertionError or expect failure
- **THEN** the CI historical replay gate SHALL certify the commit as a verified physical RED state and allow the pipeline to proceed.

### Requirement: Mechanical OpenSpec Change Linkage
The commit gate validator SHALL require all production commits (`feat(green)` and `fix`) to reference an active, valid OpenSpec Change ID.

#### Scenario: Missing OpenSpec reference rejection
- **WHEN** a `feat(green)` or `fix` commit modifies production code under `src/` without declaring an OpenSpec Change ID in its subject scope or git trailer (`OpenSpec-Change: <change>`)
- **THEN** the validator SHALL reject the commit with an SDD traceability violation.

#### Scenario: Nonexistent or archived change rejection
- **WHEN** a commit declares an `OpenSpec-Change` that does not exist under `openspec/changes/<change>/` or lacks a valid `tasks.md`
- **THEN** the validator SHALL reject the commit.

#### Scenario: Valid active change acceptance
- **WHEN** a commit references an existing `openspec/changes/<change>/` whose tasks are currently active
- **THEN** the validator SHALL accept the OpenSpec linkage.

### Requirement: Developer Ergonomics TDD Automation CLI
The harness SHALL provide unified CLI helpers (`npm run tdd:red`, `npm run tdd:green`, `npm run tdd:refactor`) that automate test failure verification, coverage validation, canonical scope inference, and git commit formatting.

#### Scenario: Automated RED commit creation
- **WHEN** developer runs `npm run tdd:red -- "<description>"`
- **THEN** the tool executes the relevant test runner, asserts that the test physically fails, infers the canonical scope from changed test files, and executes `git commit -m "test(red)(<scope>): <description>"`.

#### Scenario: Automated GREEN commit creation
- **WHEN** developer runs `npm run tdd:green -- "<description>"`
- **THEN** the tool executes the full test suite, verifies minimum coverage (lines >= 80%, branches >= 75%), ensures active RED scope coverage, and executes `git commit -m "feat(green)(<scope>): <description>"`.
