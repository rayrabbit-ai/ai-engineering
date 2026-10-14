<!--
trigger: always_on
-->

# Pre-Code SDD Gate — Invariant 14 (Mandatory Pre-Flight Check)

[English](SDD_GATE.md) | [Español](SDD_GATE.es.md)

> **ABSOLUTE RULE**: Before creating, editing, or deleting ANY production or test file, the AI agent MUST execute this pre-flight evaluation mentally and in writing. Zero exceptions.

---

## 1. Pre-Code Evaluation

### Step 1: Classify Impact
Does the proposed change modify public API contracts, persistence schemas, network protocols, or security models?
- **NO**: Proceed with the standard TDD cycle (RED -> GREEN -> REFACTOR) with scope coupling.
- **YES**: **MANDATORY STOP**:
  1. Do NOT touch production code or tests.
  2. Draft the specification delta (`spec.md`) and technical design (`design.md`) in `openspec/changes/<id>/`.
  3. Request explicit approval from the human operator.
  4. Only after explicit approval, proceed with the failing test (RED).

---

## 2. Consolidated Specification Immutability

* **Direct Editing Prohibited**: Implementation commits (`feat(green)`, `test(red)`, `refactor`, `fix`) are strictly forbidden from directly modifying files under `openspec/specs/`.
* **Exclusive Sync Path**: Consolidated master specifications may only be updated via `spec(sync):` or `chore(archive):` commits following full change verification.
* **CI Enforcement**: The `verify-gates` validator automatically terminates with exit code 1 if any commit modifies `openspec/specs/` without the authorized prefix.
