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
| 2026-10-15 | [Final Remediation Certification](certificacion-remediacion-final.es.md) | Internal; **superseded** by the subsequent independent audit | Superseded |
| 2026-10-15 | [Independent Forensic Report](2026-10-15-informe-forense-independiente.es.md) | External & independent: **REJECTED** certification claim; conditional approval as SDD/TDD template | **Current** — see status below |
| 2026-10-15 | [Heuristic Suite Report](informe-redteam.es.md) | Automated (`redteam-audit.mjs`, 12 probes) | Current |

### Status of Independent Audit Findings

| ID | Finding | Status |
| :--- | :--- | :--- |
| F-01 | Replay accepted non-assertive failures as RED | **Fixed.** `classifyTestResult` requires explicit assertion evidence, and `assertLegitimateRed` blocks non-assertive failures; regression self-tests added (cases 6–9). Additionally, fixed a *fail-open* issue: untrimmed diffs are now used so patches apply cleanly without silent skips. |
| F-02 | D9 reported false combined branch threshold in Python | **Fixed.** D9 now recognizes `check_python_coverage.py --min-branches`. |
| F-03 | Capability claims without supporting methodology | **Fixed in documentation.** Removed all formal certification claims (see "Scope"). |
| F-04 | Branch protection unverified (HTTP 403) | **Verified physically:** GitHub rejected direct push to `main` with GH013 (5 of 5 required status checks and PR required). |
| F-05 | Scope collision `auth` / `billing/auth` | Not reproducible on HEAD; preserved as regression case in self-tests. |

---

## ⚖️ Scope: What It Is and What It Is Not

**What it IS:** An SDD/TDD engineering template with CI-enforced commit gates (conventions, RED→GREEN scope coupling, OpenSpec linkage, parent-commit RED replay), independent line and branch coverage thresholds (TS and Python), and an automated heuristic security test suite.

**What it IS NOT:**
- A formal certification or compliance verification against OWASP ASVS L3, SLSA L3, MITRE ATT&CK/ATLAS, or CVSS.
- Data-flow taint analysis, generative fuzzing, mutation testing, or deep memory/HTTP auditing. The "domains" in `redteam-audit.mjs` are targeted heuristic checks.
- Artifact provenance/attestation (for supply-chain attestations, refer to in-toto/Witness).
- A standalone physical merge blocker: physical blocking requires GitHub branch protection/rulesets enforcing required status checks.

---

## 🔍 Reproducibility and Independent Verification

Any auditor or security team can physically reproduce all verifications by running:

```bash
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

# Heuristic security test suite (not a certification)
npm run audit:redteam
```
