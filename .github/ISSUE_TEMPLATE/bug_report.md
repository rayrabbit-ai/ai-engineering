---
name: Bug Report
about: Create a report to help us improve the deterministic harness
title: "[BUG]: "
labels: ["bug", "triage"]
assignees: ""
---

## Bug Description
A clear and concise description of what the bug is.

## Component Affected
- [ ] `scripts/verify-gates.mjs` / `verify_gates.py` (Commit Gate Validators)
- [ ] `scripts/verify-red-failure.mjs` / `verify_red_failure.py` (RED Verifier)
- [ ] `scripts/verify-historical-replay.mjs` (Replay Engine)
- [ ] `scripts/verify-policy-coherence.mjs` (Runtime Coherence)
- [ ] `scripts/guard-agent.mjs` (Contract Guardian)
- [ ] `scripts/path-policy.json` (Path Classification)
- [ ] CI Workflows (`.github/workflows/gate-validator.yml`)
- [ ] Other: 

## Steps to Reproduce
1. Run command: `...`
2. With commit range or file: `...`
3. See error: `...`

## Expected Behavior
A clear and concise description of what you expected to happen according to the 15 Invariants.

## Actual Behavior / Error Logs
```text
Paste terminal logs or error trace here
```

## Environment
- OS: [e.g. Ubuntu 22.04, macOS Sonoma, Windows 11]
- Node.js version: [e.g. 22.14.0]
- Python version: [e.g. 3.11.9]
- Git version: [e.g. 2.44.0]

## Additional Context
Add any other context about the problem here (e.g., related OpenSpec change, branch protection ruleset behavior).
