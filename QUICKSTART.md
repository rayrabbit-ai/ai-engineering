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

### If your stack is TypeScript / Node.js:
```bash
npm install
npm run test:ts:coverage
```

### If your stack is Python:
```bash
pip install -e .[test]
pytest --cov=src --cov-fail-under=80
```

---

## Step 3: Your First SDD + TDD Cycle with the Agent

Open your preferred AI coding assistant (Google Antigravity, Cursor, Claude Code, Roo Code, Copilot):

1. **Create a Specification**:
   Add or edit a spec in `openspec/specs/<capability>/spec.md` with Given/When/Then scenarios.
   Validate with:
   ```bash
   npx @fission-ai/openspec validate
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
   The agent implements tasks through strict gates: RED -> GREEN -> REFACTOR -> INTEGRATION -> HARDENING, performing atomic commits per phase.

4. **Verify Gates Before Pushing**:
   Before opening a PR, run:
   ```bash
   npm run verify:gates
   ```
   The gate auditor ensures your commits obey TDD causality and baseline invariants.

You are done! When opening a Pull Request on GitHub, `.github/workflows/gate-validator.yml` automatically enforces these gates.
