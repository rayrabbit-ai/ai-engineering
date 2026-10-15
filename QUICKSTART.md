# Quickstart Guide: AI Engineering in 3 Minutes

[English](QUICKSTART.md) | [Español](QUICKSTART.es.md)

Welcome to the official **RayRabbit AI Engineering** template. This guide walks you through bootstrapping a new project with deterministic, agent-governed software development.

---

## Step 1: Initialize Your Repository

### Option A: Via GitHub
Click the green **"Use this template"** button at [https://github.com/rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering).

### Option B: Clone Locally
```bash
git clone https://github.com/rayrabbit-ai/ai-engineering.git my-new-project
cd my-new-project
```

---

## Step 2: Install Dependencies

### TypeScript / Node.js:
```bash
npm ci
npm run test:ts:coverage
```

### Python:
```bash
python -m pip install -r requirements-test.txt
python -m pip install --no-deps --no-build-isolation -e .
npm run test:py:coverage
```

---

## Step 3: Enable Physical Branch Protection (1 Command)

GitHub templates do not copy branch protection automatically. To activate physical merge blocking on `main` and enforce required status checks:

```bash
# Option A: Automatic via GitHub CLI (recommended)
npm run setup:branch-protection

# Option B: Via GitHub Web Settings
# Follow the step-by-step guide in docs/BRANCH_PROTECTION.md
```

---

## Step 4: Your First SDD + TDD Cycle with the Agent

Open your preferred AI coding assistant (Google Antigravity, Cursor, Claude Code, Roo Code, Copilot):

1. **Create a Specification**:
   Add or edit a spec in `openspec/specs/<capability>/spec.md` with Given/When/Then scenarios.
   Validate with:
   ```bash
   npm run spec:validate
   ```

2. **Execute Triage**:
   Prompt the agent:
   ```text
   /opsx-triage my-change
   ```
   The agent audits the affected files and applies routing rules R1 to R5 without editing any code.

3. **Execute the TDD Cycle**:
   Prompt the agent:
   ```text
   /opsx-apply my-change
   ```
   The agent implements tasks through strict gates: RED -> GREEN -> REFACTOR -> INTEGRATION -> HARDENING, performing atomic commits per phase with strict scope-coupling.

4. **Verify Gates Before Pushing**:
   Before opening a PR, run the deterministic gate audit:
   ```bash
   # Node.js gate validator
   npm run verify:gates

   # Python gate validator
   npm run verify:gates:py

   # Automated 10-domain adversarial red team suite
   npm run audit:redteam

   # Or the full pre-push adversarial audit workflow
   /opsx-audit
   ```

When opening a Pull Request on GitHub, `.github/workflows/gate-validator.yml` automatically verifies all commit gates, coverage thresholds, and specification schemas before GitHub allows the merge.
