# Contributing Guide — RayRabbit AI Engineering

[English](CONTRIBUTING.md) | [Español](CONTRIBUTING.es.md)

Thank you for contributing to **RayRabbit AI Engineering**. This repository adheres to a strict discipline of deterministic, CI-enforced software engineering.

---

## 1. Golden Rules

1. **Zero Code Without Prior Specification**: Every architectural change or new feature must begin with an OpenSpec proposal (`openspec/changes/<id>/`).
2. **Strict Scope-Coupled TDD Causality**: Every Pull Request must demonstrate that each `feat(green)` or `fix` commit is preceded by a `test(red)` commit covering the **exact same module or scope**.
3. **Consolidated Specification Immutability**: Never directly edit `openspec/specs/` during code implementation; use deltas and synchronize via `spec(sync):`.
4. **Zero Production Mocks**: All code inside `src/` must be 100% production-ready and functional.
5. **Environment Agnosticism in Python**: Always use `pathlib.Path` and `importlib.resources`. Never use `os.path` or tamper with `sys.path`.

---

## 2. Pull Request Workflow

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/ai-engineering.git
   cd ai-engineering
   ```

2. **Install Dependencies**:
   ```bash
   # TypeScript / Node.js
   npm install

   # Python
   pip install -e .[test]
   ```

3. **Execute the TDD Cycle**:
   - Write failing test: `git commit -m "test(red)(<module>): description"`
   - Implement minimal code: `git commit -m "feat(green)(<module>): description"`
   - Refactor cleanly: `git commit -m "refactor: description"`

4. **Local Pre-Push Audit**:
   Before opening a Pull Request, run the deterministic gate checks:
   ```bash
   # Node.js gate validator
   npm run verify:gates

   # Python gate validator
   npm run verify:gates:py

   # Adversarial self-tests
   node scripts/verify-gates.mjs --self-test
   python scripts/verify_gates.py --self-test

   # Test coverage (must reach ≥ 80%)
   npm run test:ts:coverage
   npm run test:py:coverage
   ```

If all gates pass with exit code 0, open your Pull Request. GitHub Actions will automatically verify every gate.
