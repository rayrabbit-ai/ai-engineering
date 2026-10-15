# GitHub Branch Protection & CI Enforcement Guide

[English](BRANCH_PROTECTION.md) | [Español](BRANCH_PROTECTION.es.md)

> **Physical Merge Blocking Mechanism**  
> This document details the interaction between RayRabbit AI Engineering CI validators and GitHub repository branch protection rulesets.

---

## 1. Two-Layer Enforcement Architecture

To guarantee that no autonomous AI agent can merge code that violates deterministic gates, the system operates across two complementary layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TWO-LAYER DETERMINISTIC ENFORCEMENT                      │
└─────────────────────────────────────────────────────────────────────────────┘

  [ LAYER 1: CI WORKFLOW (.github/workflows/gate-validator.yml) ]
     ├── Self-test of adversarial rules (npm run verify:gates:self-test)
     ├── Contract & rule integrity guard (node scripts/guard-agent.mjs)
     ├── Commit causality audit (TDD strict causality & RED isolation)
     ├── OpenSpec specification validation (openspec validate --all)
     ├── Historical test replay in isolated worktree (scripts/verify-historical-replay.mjs)
     ├── Polyglot test suites & coverage (Lines ≥80%, Branches ≥75% in TS & Python)
     └── Heuristic security audit suite (npm run audit:redteam)
           │
           ▼ Produces commit status: Pass / Fail
  [ LAYER 2: BRANCH PROTECTION (GitHub Rulesets / Branch Protection) ]
     └── PHYSICAL BLOCKING of the Merge button: GitHub declines any PR
         if any of the required status checks have not completed successfully.
```

---

## 2. Mandatory Required Status Checks

In repository settings on GitHub (`Settings` -> `Branches` -> `Branch protection rules` or `Rulesets`), the following checks MUST be configured as **Required** on the `main` branch:

| Status Check Name in GitHub | Enforcement Objective |
|---|---|
| `Auditoría de Commits por Compuerta (Invariantes 1 y 3)` | Rejects PRs containing GREEN without preceding RED, multi-path scope smuggling, or production code inside RED |
| `Validación de Especificaciones OpenSpec` | Rejects PRs with missing active OpenSpec changes, unlinked tasks, or invalid schema formatting |
| `Suite TypeScript / Node.js & Cobertura` | Rejects PRs if Vitest tests fail, legacy baseline breaks, or coverage < 80% lines / < 75% branches |
| `Suite Python & Cobertura` | Rejects PRs if pytest tests fail, baseline breaks, or coverage < 80% lines / < 75% branches |
| `Auditoría Ofensiva Red Team (10 Dominios ASVS L3)` | Rejects PRs if critical or high severity security vulnerabilities are discovered by the automated suite |
| `Require Pull Request Reviews` (≥1 review + CODEOWNERS) | Enforces mandatory human code review and CODEOWNERS sign-off on gates, workflows, and rules |

---

## 3. Automated Setup in 1 Step

You can automatically apply this configuration using the included setup scripts:

### Using Shell (Linux / macOS / Git Bash):
```bash
./scripts/setup-branch-protection.sh rayrabbit-ai/ai-engineering main
```

### Using Python (Cross-platform Windows / Linux / macOS):
```bash
python scripts/setup_branch_protection.py --repo rayrabbit-ai/ai-engineering --branch main
```

*(Requires GitHub CLI `gh auth login` with administrative permissions on the repository).*
