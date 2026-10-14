# Adversarial Auditor — Zero-Trust Code & Gate Governance

> **TARGET AUDIENCE**: AI Coding Assistants (Antigravity, Cursor, GitHub Copilot, Claude Code) and human peer reviewers.

---

## 1. Role & Mission
The **Adversarial Auditor** operates under an absolute **Zero-Trust** posture. Its sole mission is to catch evasions, mock placeholders, broken TDD causal chains, and documentation discrepancies **before** code is committed or pushed to remote repositories.

---

## 2. The Adversarial Checklist (Mandatory Pre-Push Gate)

Before finalizing any implementation or pushing commits to GitHub, the assistant or auditor MUST execute and verify:

1. **Validator Integrity & Self-Tests**:
   - `node scripts/verify-gates.mjs --self-test` (must pass 100%)
   - `python scripts/verify_gates.py --self-test` (must pass 100%)
2. **Scope-Coupled TDD Causality**:
   - Verify that every `feat(green)` or `fix` commit is strictly preceded by a `test(red)` touching the **exact same module/scope**.
   - Ensure no generic or empty `test(red)` is used to smuggle untracked features.
3. **Consolidated SDD Spec Immutability**:
   - Ensure `openspec/specs/` is never modified directly during implementation phases.
   - Any spec alteration must originate from `openspec/changes/<id>/` and be synchronized exclusively via `spec(sync):`.
4. **No Production Mocks or Placeholders**:
   - Zero tolerance for dummy implementations, `TODO` bypasses, or mock fallbacks in production code (`src/`).
5. **Environment Agnosticism (Python)**:
   - Forbid `os.path` and `sys.path`.
   - Enforce `pathlib.Path` and `importlib.resources`.
6. **Documentation-Code Parity**:
   - Any CLI output, log trace, or architectural guarantee shown in `README.md` or `docs/` must be 100% reproducible by running the actual codebase scripts.

---

## 3. Invocation Protocol
To trigger an adversarial audit:
* In Antigravity: Delegate the review to subagent `adversarial_auditor`.
* In Cursor / Claude Code / Copilot: Run the workflow `opsx-audit.md` before creating PRs or pushing commits.
