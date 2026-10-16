# RayRabbit AI Engineering — Audit Dossier

[English](README.en.md) | [Español](README.md)

This directory consolidates external and adversarial audits of the harness, along with the remediation status of each finding. **No document in this dossier constitutes a formal certification** (OWASP, SLSA, or any other).

---

## 📂 Audit Dossier

| Date | Document | Type | Status |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | [External Technical Audit (Copilot GPT-6 Luna)](2026-10-14-auditoria-externa-copilot-luna.es.md) | External (claims and initial bypasses) | Historical |
| 2026-10-14 | [Initial Audit Remediation Report](2026-10-14-informe-correcciones.es.md) | Phase 1 Remediation | Historical |
| 2026-10-15 | [Internal Adversarial Audit](auditoria-adversarial-forense-asvs-l3.es.md) | Internal; file name references ASVS L3, but is **not** an ASVS verification | Historical |
| 2026-10-15 | [External Adversarial Forensic Audit](2026-10-15-auditoria-forense-adversarial.es.md) | External (causality and replay) | Historical |
| 2026-10-15 | [Final Remediation Certification](certificacion-remediacion-final.es.md) | Internal; **superseded** by subsequent independent audits | Superseded |
| 2026-10-15 | [Independent Forensic Report (Wave 1)](2026-10-15-informe-forense-independiente.es.md) | External: replay assertion verification, branch coverage & claim cleanup | Historical (remediated in `ed6a4c3`) |
| 2026-10-15 | [Independent Forensic Audit (Wave 2 — `ed6a4c3`)](2026-10-15-auditoria-forense-ai-engineering.es.md) | External: confirmed 5/5 green CI checks and identified `F-01` (`guard-agent.mjs`) & `F-02` (`redteam-audit.mjs`) | **Current** — 100% remediated below |
| 2026-10-15 | [Authenticated GitHub Ruleset Snapshot](github-ruleset-main.json) | Verifiable JSON snapshot of the active Ruleset on `main` (`id: 25150565`, `enforcement: active`) | Current |
| 2026-10-15 | [Heuristic Scanner Report](informe-redteam.es.md) | Automated (`redteam-audit.mjs`, 13 checks) | Current |

### Status of Independent Audit Findings

| ID | Finding | Status |
| :--- | :--- | :--- |
| Wave 1 `F-01` | Replay accepted non-assertive failures as RED | **Fixed (`ed6a4c3`).** `classifyTestResult` requires explicit assertion evidence, and `assertLegitimateRed` blocks non-assertive failures; regression self-tests added (cases 6–9) and untrimmed diffs preserved. |
| Wave 1 `F-02` | D9 reported false combined branch threshold in Python | **Fixed (`ed6a4c3`).** D9 recognizes `check_python_coverage.py --min-branches`. |
| Wave 1 `F-03` | Capability claims without supporting methodology | **Fixed.** Removed all formal certification claims across README, agents, workflows, and scripts. |
| Wave 1 `F-04` / Action 5 | Branch protection unverified without token (`HTTP 401/403`) | **Fixed.** Physically verified (`GH013` on direct push to `main`) and versioned authenticated snapshot in [`github-ruleset-main.json`](github-ruleset-main.json). |
| Wave 1 `F-05` | Scope collision `auth` / `billing/auth` | **Verified (`ed6a4c3`).** Not reproducible on HEAD; preserved as regression case in self-tests. |
| Wave 2 `F-01` | `guard-agent.mjs` used `anchors.some(...)` and a 50-char threshold | **Fixed.** Now requires **all** mandatory anchors (`anchors.every(...)`), per-contract `minLength` (`2500` bytes for `INVARIANTS*`), all 15 numbered clauses (`1.`–`15.`), all 6 clauses in `ADVERSARIAL_AUDITOR*`, and routing rules `R1`–`R5` in `AGENTS*`. Includes `npm run verify:guard:self-test`. |
| Wave 2 `F-02` | `redteam-audit.mjs` contained a stale static finding and overclaimed standard headers | **Fixed.** Removed the stale static finding; Domain 3 dynamically executes `guard-agent.mjs --self-test` and `validateGuardContracts`. Renamed CI job to `Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)`. |

---

## ⚖️ Scope: What It Is and What It Is Not

**What it IS:** An SDD/TDD engineering template with CI-enforced commit gates (conventions, RED→GREEN scope coupling, OpenSpec linkage, parent-commit RED replay), a structural and semantic contract guardian (`guard-agent.mjs`), independent line and branch coverage thresholds (TS and Python), and an internal heuristic security and contract scanner (`redteam-audit.mjs`).

**What it IS NOT:**
- A formal certification or compliance verification against external regulatory standards.
- A compiler data-flow analyzer, generative fuzzer, automated mutation testing engine, or deep memory/HTTP auditor. The 10 domains in `redteam-audit.mjs` are 13 targeted heuristic and regression checks.
- Cryptographic artifact provenance/attestation (for supply-chain attestations, refer to in-toto/Witness).
- A standalone physical merge blocker: physical blocking on GitHub relies on the active Ruleset on `main` (see [`github-ruleset-main.json`](github-ruleset-main.json)).

---

## 🔍 Reproducibility and Independent Verification

Any auditor or engineering team can physically reproduce all verifications by running:

```bash
# Structural & semantic contract guardian + adversarial self-test
node scripts/guard-agent.mjs
npm run verify:guard:self-test

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

# Internal heuristic security & contract scanner (not a certification)
npm run audit:redteam
```
