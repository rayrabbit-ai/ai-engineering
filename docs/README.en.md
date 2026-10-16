# RayRabbit AI Engineering — Documentation & Architecture

[English](README.en.md) | [Español](README.md)

Welcome to the official documentation for **RayRabbit AI Engineering**, the open standard and deterministic template for AI-assisted software engineering designed to curb "vibe coding".

---

## 📚 Table of Contents

### 1. 🛡️ Security Dossier & Adversarial Audits
To review external technical audit history and the heuristic security test suite (no document constitutes formal OWASP or SLSA certification):
* **[Complete Audit Dossier (`docs/audit/`)](audit/README.en.md)**: Full audit history, finding remediation status, and scope definitions.
* **[Independent Forensic Audit (Current — Wave 2)](audit/2026-10-15-auditoria-forense-ai-engineering.es.md)**: Latest external forensic audit on `main` with 100% verified remediations.
* **[Independent Forensic Report (Wave 1)](audit/2026-10-15-informe-forense-independiente.es.md)**: Prior external forensic evaluation.
* **[Internal Heuristic Scanner Report](audit/informe-redteam.es.md)**: Automated security and contract scanner (`redteam-audit.mjs`, 13 checks).
* **[Historical External Technical Audit (Copilot GPT-6 Luna)](audit/2026-10-14-auditoria-externa-copilot-luna.es.md)**: Original external assessment.

### 2. 🔒 Branch Protection & Governance
* **[GitHub Branch Protection & CI Enforcement Guide](BRANCH_PROTECTION.md)**: Required GitHub repository configuration to activate physical merge blocking, required status checks, and CODEOWNERS reviews.

### 3. 📊 Empirical Evidence & Benchmarks
* **[Live A/B Benchmark Case Study & Coverage Guide](ab-testing-and-coverage.md)**: Empirical comparison between unconstrained "vibe coding" and the RayRabbit deterministic harness.

### 4. 📖 Operational Manual & Prompts
* **[Operational Manual & Prompt Playbook (P0 – P12)](../OPERATIONAL_MANUAL.md)**: Deterministic prompt sequences and operational gates for commanding autonomous coding agents.

### 5. 📢 Public Announcements
* **[Official Announcement on LinkedIn](LINKEDIN_ANNOUNCEMENT.md)**: Public manifesto introducing deterministic AI engineering.
