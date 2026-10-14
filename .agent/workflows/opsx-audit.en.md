---
description: "Pre-push adversarial audit workflow for TDD gates, SDD spec immutability, and validator integrity."
---

# /opsx-audit — Pre-Push Adversarial Audit Protocol

This workflow must be executed before committing release tags or pushing commits to remote branches (`main`, `develop`).

## 1. Deterministic Validator Self-Tests
Execute polyglot self-tests to ensure rules have not degraded:

```bash
# Node.js validator
node scripts/verify-gates.mjs --self-test

# Python validator
python scripts/verify_gates.py --self-test
```
*Criterion:* Both commands must exit with code `0` and verify that the Copilot adversarial test (unrelated RED and GREEN) is rejected.

## 2. Working Tree Cleanliness Check
Ensure there are no untracked files or unplanned unstaged modifications:

```bash
git status --porcelain
```
*Criterion:* Clean working tree or documented intentional diffs.

## 3. Scope-Coupled TDD Causality Verification
Audit that all branch commits strictly satisfy scope-coupled causality:

```bash
node scripts/verify-gates.mjs --base origin/main --head HEAD
```
*Criterion:* Zero gate errors reported.

## 4. OpenSpec Specification Validation
Ensure all specifications and changes are synchronized and syntactically valid:

```bash
npx --yes @fission-ai/openspec validate --all
```

## 5. Zero-Trust Adversarial Code Inspection
Review manually or via the `adversarial_auditor` subagent:
- [ ] Are there dummy stubs, mocks, or temporary `TODO`s in `src/`?
- [ ] Were any `os.path` or `sys.path` imported in Python instead of `pathlib.Path`?
- [ ] Do documentation examples and CLI output logs match the actual script execution 100%?
