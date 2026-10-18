# Accessibility Statement (ACCESSIBILITY.md)

RayRabbit AI Engineering is committed to ensuring digital accessibility for people of all abilities. We continually improve the user experience for everyone and apply relevant accessibility standards across our software tools, command-line interfaces, and technical documentation.

---

## Standards and Guidelines

Our technical documentation and tooling aim to conform to:
* **WCAG 2.1 Level AA** standards for web-rendered documentation (GitHub Pages, GitHub Web View, and A2UI interfaces).
* **High Contrast and Terminal Readability**: All CLI scripts (`scripts/verify-gates.mjs`, `tdd-flow.mjs`, `guard-agent.mjs`) use clear, high-contrast text and non-color-dependent status indicators (e.g., standard symbols `[PASS]`, `[FAIL]`, `[GATE-OK]`, `[REPLAY-OK]` alongside color cues) to ensure accessibility for users with color vision deficiencies.
* **Semantic Markdown**: All architectural documentation, specifications, and reports utilize semantic GitHub Flavored Markdown (headings `h1`–`h6`, structured tables, code blocks with explicit language tags, and alternative text for all images and diagrams).

---

## Supported Environments and Assistive Technologies

* **Screen Readers**: Compatible with popular screen readers including NVDA, JAWS, and VoiceOver on standard browsers (Chrome, Firefox, Safari, Edge).
* **Keyboard Navigation**: Full keyboard navigability across web-based documentation and interactive portals.
* **CLI Environments**: Clean plain-text outputs compatible with terminal speech synthesizers and braille displays via ANSI stripping flags (`--no-color` support where applicable).

---

## Feedback and Reporting Barriers

If you encounter accessibility barriers or difficulty accessing any content or tooling within RayRabbit AI Engineering, please let us know:
* **Email**: **accessibility@rayrabbit.site**
* **GitHub Issues**: Open an issue labeled `accessibility` on our repository.

We strive to respond to accessibility feedback within **48 business hours**.
