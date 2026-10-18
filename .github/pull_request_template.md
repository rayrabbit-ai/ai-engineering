## Pull Request Description

### Summary of Changes
Provide a clear, high-level summary of what this PR introduces or fixes.

---

### Causal TDD & SDD Compliance Checklist
All Pull Requests in this repository are verified by automated CI commit gates under GitHub Branch Protection Ruleset `25150565`. Please confirm:

- [ ] **OpenSpec Linkage**: Does this change reference an active OpenSpec change (`OpenSpec-Change:` trailer or approved spec)?
- [ ] **Scope-Coupled TDD Causality**: If introducing or modifying production code (`src/`), is each `feat(green)` preceded by a legitimate antecedent `test(red)` covering the EXACT same module?
- [ ] **Historical Replay Verified**: Did all `test(red)` commits fail legitimately by `AssertionError` against their parent commit (no premature greens or syntax errors)?
- [ ] **No Production Code in RED**: Are `test(red)` commits free from production file changes?
- [ ] **Critical Config Protection**: If touching critical configuration (`.github/**`, `scripts/**`, `package.json`, lockfiles), is the commit scoped with `chore(...)`?
- [ ] **Coverage Thresholds**: Does the code satisfy `>=80%` lines and `>=75%` branches across TypeScript (Vitest) and Python (pytest)?

---

### Mechanical Verifications Executed Locally
Run and verify exit code 0 before pushing:
```bash
node scripts/guard-agent.mjs
npm run verify:policy
npm run verify:gates:self-test
npm run verify:gates:py:self-test
npm run verify:red:self-test
npm run verify:red:py:self-test
npm run verify:replay:self-test
npm run audit:redteam
npm run test:ts:coverage
npm run test:py:coverage
npm run spec:validate
```

- [ ] All mechanical checks pass locally with exit code 0.
