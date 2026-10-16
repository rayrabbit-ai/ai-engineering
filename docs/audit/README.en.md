# RayRabbit AI Engineering — Audit Dossier & Forensic Timeline

[English](README.en.md) | [Español](README.md)

[![GPT-6 Luna Verdict](https://img.shields.io/badge/GitHub%20GPT--6%20Luna-APROBADO%20%2F%20APPROVED-brightgreen?style=for-the-badge&logo=github)](2026-10-16-auditoria-forense-67a2eef.es-en.md)
[![Adversarial Auditor](https://img.shields.io/badge/Adversarial%20Auditor-APPROVED-brightgreen?style=for-the-badge&logo=shield)](2026-10-16-auditoria-adversarial-hostil.es.md)
[![Branch Protection Ruleset](https://img.shields.io/badge/GitHub%20Ruleset-25150565%20ACTIVE-blue?style=for-the-badge&logo=github)](github-ruleset-main.json)
[![Verified Commit](https://img.shields.io/badge/Verified%20Commit-67a2eef-success?style=for-the-badge&logo=git)](https://github.com/rayrabbit-ai/ai-engineering/commit/67a2eef8b986b7655c2f3386bfdebc87a47dc6c5)

This directory documents the complete traceability, adversarial, and independent forensic evaluations, as well as the continuous improvement timeline between our subagent validator (`adversarial_auditor`) and GitHub's frontier model (**GPT-6 Luna** in Codespaces) for the [rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering) repository.

---

## 🏆 Official Verdict & Live Evidence (Commit `67a2eef`)

> ### **GitHub GPT-6 Luna in Codespaces Verdict:** **APROBADO / APPROVED**
> *"The five mandatory branch-protection checks are present in an active GitHub ruleset, and all ten checks returned by the API for this SHA completed successfully. Harness self-tests, policy/runtime coherence, OpenSpec, the TypeScript build, TypeScript and Python suites, coverage, E2E, npm audit, and the internal scanner passed as detailed. Two targeted mutations were killed by the self-tests, and differential fuzzing across 10,067 paths found no Node/Python classification mismatches."*  
> — [Independent Forensic Security Report (2026-10-16)](2026-10-16-auditoria-forense-67a2eef.es-en.md)

<p align="center">
  <img src="assets/codespaces-luna-audit-67a2eef.png" alt="GPT-6 Luna Forensic Audit in GitHub Codespaces - APPROVED Verdict" width="950"/>
</p>

---

## ⏱️ Continuous Improvement Timeline (PR #18 to PR #21)

The following chronology outlines the iterative cycles of adversarial attacks, vulnerability discovery, deep root remediation, and cross-validation culminating in the approved verdict:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    FORENSIC TIMELINE: SUBAGENT vs GPT-6 LUNA ITERATIONS                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

  [PR #18] (Commit a95896c) ──► GPT-6 Luna: REJECTED (F-01 to F-05, C1–C6)
       │                        └─ Root cause: 5 divergent path classification implementations
       ▼
  [PR #19] (Hardening #19)  ──► Subagent: Vitest 5.0.4 nested thresholds + fail-closed Python coverage
       │                        └─ Remediation of reporting flaws and CLI argument delimiters
       ▼
  [PR #20] (Hardening #20)  ──► Subagent: Red Team scanner expanded from 8 to 18 active injection probes
       │                        └─ Isolated worktrees and mitigation of findings F-NEW-01 to F-NEW-05
       ▼
  [PR #21] (Commit 67a2eef) ──► ROOT REMEDIATION: Single-Source Path Policy + Runtime Coherence
       │                        ├─ Subagent adversarial_auditor: APPROVED (17 controls, 24 probes)
       │                        └─ GitHub GPT-6 Luna in Codespaces: APROBADO / APPROVED (10/10 checks)
       ▼
  [NEXT MILESTONE] ─────────► FORMAL SECURITY ENGINEERING (OWASP, CWE, SLSA, MITRE)
                                └─ LLM inspection guide aimed at attributing formal certifications
```

### Comparative Iteration Matrix

| PR / Commit | Validator / Auditor | Focus of Assessment | Verdict | Findings & Remediation |
| :--- | :--- | :--- | :---: | :--- |
| **PR #18**<br>`a95896c` | **GitHub GPT-6 Luna**<br>(Codespaces Wave 3) | Forensic evaluation of commit gates, path classification, and CI workflow order. | **REJECTED** | **F-01:** Code under `src/tests/` misclassified as test code.<br>**F-02:** Critical configuration modifiable under `docs:`.<br>**R-03:** `npm ci` executed prior to gate integrity verification. |
| **PR #19**<br>`#19` | **Subagent `adversarial_auditor`** | Vitest 5 coverage threshold parsing and fail-closed Python coverage enforcement. | **GREEN (CI)** | Remediated nested `coverage.thresholds` block for Vitest 5.0.4, fail-closed JSON validation in Python coverage, and CLI argument delimiters. |
| **PR #20**<br>`#20` | **Subagent `adversarial_auditor`** | Active fault injection, side-channel detection, and worktree replay. | **GREEN (CI)** | Expanded Red Team scanner from 8 to 18 active injection probes with subprocess canaries, remediated findings F-NEW-01 to F-NEW-05, and isolated test dependencies. |
| **PR #21**<br>[`67a2eef`](https://github.com/rayrabbit-ai/ai-engineering/commit/67a2eef8b986b7655c2f3386bfdebc87a47dc6c5) | **Subagent `adversarial_auditor`** &<br>**GitHub GPT-6 Luna** | Root architectural remediation: Single-Source Policy, runtime coherence, and vectors C1–C6. | **APPROVED**<br>**(APROBADO)** | **Comprehensive Remediation:**<br>1. SSoT: [`scripts/path-policy.json`](../../scripts/path-policy.json) and 67 shared fixtures.<br>2. Coherence: [`scripts/verify-policy-coherence.mjs`](../../scripts/verify-policy-coherence.mjs) (invariants I1–I5).<br>3. Vectors C1–C6: `-z` null byte (C1), merge commit rejection (C2), symlink/submodule raw modes `120000`/`160000` (C3), `src/` priority zone (C4), executable scripts `.ps1`/`.bat`/`.sql` (C5), configs `Dockerfile`/`Makefile` (C6).<br>4. Isolation with `pool: 'vmThreads'` in Vitest. |

---

## 🎯 Next Milestone: Toward Formal Security Engineering

> [!IMPORTANT]
> **STRATEGIC GOAL OF THE NEXT MILESTONE:**
> Evolve the deterministic harness of RayRabbit AI Engineering to incorporate established **Security Engineering frameworks (OWASP ASVS L3, OWASP LLM Top 10, CWE Top 25, SLSA L3, and MITRE ATT&CK/ATLAS)** as a **formal, machine-enforceable inspection guide for LLM agents**, advancing toward the capability of **attributing and verifying formal compliance certifications**.

### Technical Roadmap Goals

1. **Critical Configuration Extensibility (Luna F-01 Resolution):**
   - Expand `criticalConfigPatterns` in `path-policy.json` and the runtime coherence verifier to automatically intercept and block unauthorized alterations to emerging test runners and toolchains (`jest.config.*`, `playwright.config.*`, `vite.config.*`, `eslint.config.*`, `webpack.config.*`), failing closed when untracked runners are present.
2. **SLSA L3 Provenance & Supply Chain Attestations:**
   - Implement automated cryptographic Provenance generation in release pipelines using `slsa-github-generator` and verifiable attestations (in-toto/Witness) tied to artifact SHA-256 digests.
3. **Polyglot Supply Chain Auditing:**
   - Integrate `pip-audit` with strict hash pinning (`--require-hashes`), achieving supply-chain parity with `npm audit`.
4. **Formal ASVS / OWASP LLM Compliance Matrix:**
   - Establish a formal traceability matrix mapping each technical control in the harness to specific normative requirements, serving as an automated pre-commit self-inspection guide for AI coding assistants (Antigravity, Cursor, Claude Code).

---

## 📂 Complete Audit Dossier Inventory

| Date | Document | Type / Issuer | Verdict / Status |
| :--- | :--- | :--- | :--- |
| **2026-10-16** | [**Independent Forensic Audit (Wave 4 — `67a2eef`)**](2026-10-16-auditoria-forense-67a2eef.es-en.md) | **External (GitHub Copilot GPT-6 Luna in Codespaces)** | **APROBADO / APPROVED** (Current) |
| **2026-10-16** | [**Internal Hostile Adversarial Audit**](2026-10-16-auditoria-adversarial-hostil.es.md) | **Internal (Subagent `adversarial_auditor`)** | **APPROVED** (Current — 17/17 controls, 24 probes) |
| 2026-10-16 | [Independent Forensic Audit (Wave 3 — `a95896c`)](2026-10-16-auditoria-forense-a95896c.es.md) | External (Copilot GPT-6 Luna): F-01 paths, F-02 config, R-03 CI order | Historical (100% remediated in PR #21 / `67a2eef`) |
| 2026-10-16 | [Heuristic Scanner Report](informe-redteam.es.md) | Automated (`redteam-audit.mjs`, 24 checks) | Current |
| 2026-10-15 | [Authenticated GitHub Ruleset Snapshot](github-ruleset-main.json) | Verifiable JSON snapshot of active Ruleset on `main` (`id: 25150565`) | Current |
| 2026-10-15 | [Independent Forensic Audit (Wave 2 — `ed6a4c3`)](2026-10-15-auditoria-forense-ai-engineering.es.md) | External: confirmed 5/5 checks and noted `F-01` (`guard`) & `F-02` (`redteam`) | Historical (remediated in `a95896c`) |
| 2026-10-15 | [Independent Forensic Report (Wave 1)](2026-10-15-informe-forense-independiente.es.md) | External: replay assertion verification, coverage, and claim sanitization | Historical (remediated in `ed6a4c3`) |
| 2026-10-15 | [Final Remediation Certification](certificacion-remediacion-final.es.md) | Internal; superseded by subsequent independent audits | Superseded |
| 2026-10-15 | [External Adversarial Forensic Audit](2026-10-15-auditoria-forense-adversarial.es.md) | External (causality and replay) | Historical |
| 2026-10-15 | [Internal Adversarial Audit](auditoria-adversarial-forense-asvs-l3.es.md) | Internal (not a formal certification) | Historical |
| 2026-10-14 | [Initial Audit Remediation Report](2026-10-14-informe-correcciones.es.md) | Phase 1 Remediation | Historical |
| 2026-10-14 | [External Technical Audit (Copilot GPT-6 Luna)](2026-10-14-auditoria-externa-copilot-luna.es.md) | External (claims and initial bypasses) | Historical |

---

## ⚖️ Scope: What It Is and What It Is Not

**What it IS:** A deterministic engineering harness for AI-assisted software development (SDD + strict TDD) with Git commit gates enforced by CI, single declarative path policy (`scripts/path-policy.json`), runtime coherence verifier (`verify-policy-coherence.mjs`), semantic contract guardian (`guard-agent.mjs`), independent polyglot test suites and coverage thresholds (TypeScript & Python), and physical merge enforcement on GitHub via active Ruleset.

**What it IS NOT:**
- A formal external compliance certification (ASVS L3 or SLSA L3).
- A deep compiler data-flow (taint) analysis engine.
- A production HTTP service handling sensitive data in live application memory.

---

## 🔍 Reproducibility and Independent Verification

Any operator or independent auditor can reproduce the complete matrix of 17 mechanical checks by running:

```bash
# Structural & semantic contract guardian + adversarial self-test
node scripts/guard-agent.mjs
npm run verify:guard:self-test

# Strict coherence between path policy and real runtime
npm run verify:policy
npm run verify:policy:self-test

# Gate self-tests (TypeScript & Python)
npm run verify:gates:self-test
npm run verify:gates:py:self-test

# Anti-injection RED runner self-tests
npm run verify:red:self-test
npm run verify:red:py:self-test

# Physical historical RED commit replay in CI
npm run verify:replay:self-test

# TDD CLI ergonomics verification
npm run tdd:flow:self-test

# Strict independent coverage (Lines >=80%, Branches >=75%)
npm run test:ts:coverage
npm run test:py:coverage

# Real-runtime End-to-End tests
npm run test:ts:e2e
pytest -m e2e --tb=short

# OpenSpec specification schema validation
npm run spec:validate

# Internal heuristic security & contract scanner (24 probes)
npm run audit:redteam
```
