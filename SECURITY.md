# Security Policy

RayRabbit AI Engineering enforces deterministic, verifiable software development and rigorous gate validation. We take security vulnerabilities seriously and appreciate responsible disclosure.

## Supported Versions

We provide security patches and verification updates for the active release branch (`main`).

| Version / Branch | Supported | Notes |
| :--- | :--- | :--- |
| `main` (`v1.x`) | :white_check_mark: | Active production and template baseline |
| `< 1.0.0` | :x: | Legacy exploratory snapshots |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues or discussions.**

Instead, report vulnerabilities through one of the following secure channels:

1. **GitHub Private Security Advisory (Recommended)**:  
   Navigate to the [Security Advisories tab](https://github.com/rayrabbit-ai/ai-engineering/security/advisories/new) on our GitHub repository to submit a confidential report directly to our security maintainers.
2. **Email Disclosure**:  
   Send an encrypted or detailed report to **security@rayrabbit.site** with the subject `[SECURITY DISCLOSURE] ai-engineering: <Brief Summary>`.

### Information to Include in Your Report

To help us triage and resolve the issue quickly, please provide:
* **Vulnerability Description**: Detailed explanation of the vulnerability, affected components (`scripts/`, `.github/workflows/`, gates, or test harnesses), and potential impact.
* **Reproduction Steps**: Step-by-step instructions or an isolated proof-of-concept (PoC) demonstrating the flaw (e.g. gate bypass, path classification evasion, command injection).
* **Environment Details**: Operating system, Node.js version, Python version, and Git version used.
* **Potential Mitigation**: Any suggested remediation, patch, or defense-in-depth improvement.

---

## Disclosure Response Timeline & SLAs

* **Initial Acknowledgment**: Within **24 hours** of receiving your report.
* **Triage & Assessment**: Within **48 hours**, including severity rating (CVSS v4.0) and reproduction verification.
* **Remediation & Testing**: Target of **7 business days** for high/critical findings, verified through our adversarial test suite (`redteam-audit.mjs` and gate replay).
* **Public Release & Advisory**: Coordinated public disclosure after the fix is merged to `main` and verified by our CI gates and external forensic auditors.

---

## Security Philosophy

* **Zero-Trust Gate Enforcement**: "Never trust, always verify." All commits must prove causality physically in Git history.
* **Fail-Closed Architecture**: Any ambiguous, unknown, or tampered state defaults to non-zero exit code (rejection).
* **Transparent Forensic Remediation**: We publicly document both initial rejections and architectural fixes in our [Audit Dossier](docs/audit/README.md).
