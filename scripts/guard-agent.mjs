#!/usr/bin/env node
/**
 * guard-agent.mjs - Guardián Estructural y Semántico de Contratos de Ingeniería
 * RayRabbit AI Engineering Standard
 *
 * Previene que la instalación o actualización de paquetes ('openspec init', 'openspec update')
 * o modificaciones adversariales eliminen, vacíen o reemplacen por placeholders las reglas
 * operativas (.agent/rules/*) o los workflows deterministas (.agent/workflows/*).
 *
 * Mitiga F-01 (sustitución semánticamente vacía con preservación de un único anchor):
 *   - Exige TODOS los anchors estructurales obligatorios (every, nunca some).
 *   - En INVARIANTS.md / INVARIANTS.es.md verifica la presencia individual de las 15 cláusulas
 *     numeradas (1. a 15.) con título en negrita y cuerpo normativo sustantivo.
 *   - En ADVERSARIAL_AUDITOR.md / .es.md verifica los 6 ítems numerados del checklist.
 *   - En cada workflow exige frontmatter YAML válido, longitud mínima real y anclas de comando.
 *   - Incluye modo --self-test con pruebas de regresión sobre copias temporales aisladas.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const REQUIRED_WORKFLOW_CONTRACTS = [
  {
    file: 'opsx-triage.md',
    minLength: 900,
    requiredAnchors: ['R1 GREENFIELD', 'R2 BUG', 'R3 STRANGLE', 'R4 LEGACY-TOUCH', 'R5 LEGACY-COVERED'],
  },
  {
    file: 'opsx-characterize.md',
    minLength: 700,
    requiredAnchors: ['legacy_baseline', 'tests/characterization/', 'pytest -m legacy_baseline', 'test(baseline):'],
  },
  {
    file: 'opsx-apply.md',
    minLength: 800,
    requiredAnchors: ['openspec status', 'test(red):', 'feat(green):', 'refactor:', 'test(integration):', 'chore(hardening):'],
  },
  {
    file: 'opsx-bugfix.md',
    minLength: 650,
    requiredAnchors: ['test(red):', 'fix:', '@legacy_baseline'],
  },
  {
    file: 'opsx-strangle.md',
    minLength: 550,
    requiredAnchors: ['@legacy_baseline', '/opsx-characterize', 'Parity Test'],
  },
  {
    file: 'opsx-e2e.md',
    minLength: 500,
    requiredAnchors: ['pytest -m e2e', 'HITL', '3 reintentos'],
  },
  {
    file: 'opsx-sync.md',
    minLength: 400,
    requiredAnchors: ['openspec/specs/', 'openspec validate'],
  },
  {
    file: 'opsx-archive.md',
    minLength: 500,
    requiredAnchors: ['openspec status', 'openspec archive', '80%', '75%'],
  },
  {
    file: 'opsx-audit.md',
    minLength: 1000,
    requiredAnchors: [
      'node scripts/verify-gates.mjs --self-test',
      'python scripts/verify_gates.py --self-test',
      'git status --porcelain',
      'openspec validate --all',
    ],
  },
  {
    file: 'opsx-audit.en.md',
    minLength: 1000,
    requiredAnchors: [
      'node scripts/verify-gates.mjs --self-test',
      'python scripts/verify_gates.py --self-test',
      'git status --porcelain',
      'openspec validate --all',
    ],
  },
];

export const REQUIRED_RULE_CONTRACTS = [
  {
    file: 'INVARIANTS.md',
    minLength: 2500,
    numberedClauses: 15,
    requiredAnchors: [
      'Commit per Gate & Scope Coupling',
      'Immutable Baseline',
      'All Bugs Enter via RED',
      'Coverage per Phase',
      'Mandatory Refactoring Triggers',
      'Continuous Legacy-Guard',
      'Formal DoD Gate & Clean Working Tree',
      'Hard Anti-Pattern Prohibitions',
      'Incremental Mode by Default',
      'Deterministic Failure Recovery',
      'Config Precedence over Refactor',
      'Suite Separation by Markers',
      'Zero Warning Tolerance on Archive',
      'Pre-Code Contract Gate & Consolidated Spec Immutability',
      'Real Runtime E2E Gate, Adversarial Audit & HITL',
    ],
  },
  {
    file: 'INVARIANTS.es.md',
    minLength: 2500,
    numberedClauses: 15,
    requiredAnchors: [
      'Commit por Compuerta & Acoplamiento de Ámbito',
      'Baseline Inmutable',
      'Todo Bug entra por RED',
      'Cobertura por Fase',
      'Triggers de Refactor Obligatorios',
      'Legacy-Guard Continuo',
      'Cierre Formal DoD & Árbol Limpio',
      'Prohibiciones Duras',
      'Modo Incremental por Defecto',
      'Failure Recovery Determinista',
      'Precedencia de Configuración sobre Refactor',
      'Separación de Suites por Markers',
      'Política de Cero Warnings en Archive',
      'Compuerta Pre-Código & Inmutabilidad de Specs Consolidadas',
      'Gate E2E en Runtime Real, Auditoría Adversarial & HITL',
    ],
  },
  {
    file: 'SDD_GATE.md',
    minLength: 1000,
    numberedClauses: 0,
    requiredAnchors: [
      '## 1. Pre-Code Evaluation',
      '## 2. Consolidated Specification Immutability',
      'openspec/changes/',
      'openspec/specs/',
      'spec(sync):',
      'verify-gates',
    ],
  },
  {
    file: 'SDD_GATE.es.md',
    minLength: 1000,
    numberedClauses: 0,
    requiredAnchors: [
      '## 1. Evaluación Pre-Código',
      '## 2. Inmutabilidad de Especificaciones Consolidadas',
      'openspec/changes/',
      'openspec/specs/',
      'spec(sync):',
      'verify-gates',
    ],
  },
  {
    file: 'AGENTS.md',
    minLength: 1200,
    numberedClauses: 0,
    requiredAnchors: [
      'INVARIANTS.md',
      'SDD_GATE.md',
      'ADVERSARIAL_AUDITOR.md',
      'pathlib.Path',
      'R1 GREENFIELD',
      'R2 BUG',
      'R3 STRANGLE',
      'R4 LEGACY-TOUCH',
      'R5 LEGACY-COVERED',
    ],
  },
  {
    file: 'AGENTS.es.md',
    minLength: 1200,
    numberedClauses: 0,
    requiredAnchors: [
      'INVARIANTS.es.md',
      'SDD_GATE.es.md',
      'ADVERSARIAL_AUDITOR.es.md',
      'pathlib.Path',
      'R1 GREENFIELD',
      'R2 BUG',
      'R3 STRANGLE',
      'R4 LEGACY-TOUCH',
      'R5 LEGACY-COVERED',
    ],
  },
  {
    file: 'ADVERSARIAL_AUDITOR.md',
    minLength: 1200,
    numberedClauses: 6,
    requiredAnchors: [
      'node scripts/verify-gates.mjs --self-test',
      'python scripts/verify_gates.py --self-test',
      'openspec/specs/',
      'spec(sync):',
      'pathlib.Path',
    ],
  },
  {
    file: 'ADVERSARIAL_AUDITOR.es.md',
    minLength: 1200,
    numberedClauses: 6,
    requiredAnchors: [
      'node scripts/verify-gates.mjs --self-test',
      'python scripts/verify_gates.py --self-test',
      'openspec/specs/',
      'spec(sync):',
      'pathlib.Path',
    ],
  },
];

/**
 * Valida estructural y semánticamente los contratos de reglas y workflows en rootDir.
 * @param {string} rootDir
 * @param {{ createMissingDirs?: boolean }} [options]
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateGuardContracts(rootDir = process.cwd(), options = {}) {
  const { createMissingDirs = false } = options;
  const agentDir = path.join(rootDir, '.agent');
  const workflowsDir = path.join(agentDir, 'workflows');
  const rulesDir = path.join(agentDir, 'rules');
  const skillsDir = path.join(agentDir, 'skills');

  /** @type {string[]} */
  const errors = [];

  for (const dir of [agentDir, workflowsDir, rulesDir, skillsDir]) {
    if (!fs.existsSync(dir)) {
      if (createMissingDirs) {
        fs.mkdirSync(dir, { recursive: true });
      } else {
        errors.push(`Directorio obligatorio faltante: ${path.relative(rootDir, dir)}`);
      }
    }
  }

  for (const contract of REQUIRED_RULE_CONTRACTS) {
    const target = path.join(rulesDir, contract.file);
    if (!fs.existsSync(target)) {
      errors.push(`Regla obligatoria faltante: .agent/rules/${contract.file}`);
      continue;
    }

    const content = fs.readFileSync(target, 'utf-8');
    const trimmedLen = content.trim().length;
    if (trimmedLen < contract.minLength) {
      errors.push(
        `Regla vaciada o degradada en .agent/rules/${contract.file}: longitud ${trimmedLen} < mínimo ${contract.minLength} caracteres`
      );
      continue;
    }

    const missingAnchors = contract.requiredAnchors.filter((anchor) => !content.includes(anchor));
    if (missingAnchors.length > 0) {
      errors.push(
        `Integridad semántica violada en .agent/rules/${contract.file}: faltan ${missingAnchors.length} cláusulas/anclas obligatorias: [${missingAnchors.slice(0, 4).join(', ')}]`
      );
    }

    if (contract.numberedClauses > 0) {
      for (let i = 1; i <= contract.numberedClauses; i++) {
        const clauseRegex = new RegExp(`^\\s*${i}\\.\\s+\\*\\*[^*]+\\*\\*:\\s*\\S.{25,}`, 'm');
        if (!clauseRegex.test(content)) {
          errors.push(
            `Cláusula numerada obligatoria #${i} ausente o truncada en .agent/rules/${contract.file}`
          );
        }
      }
    }
  }

  for (const wfContract of REQUIRED_WORKFLOW_CONTRACTS) {
    const target = path.join(workflowsDir, wfContract.file);
    if (!fs.existsSync(target)) {
      errors.push(`Workflow determinista faltante: .agent/workflows/${wfContract.file}`);
      continue;
    }

    const content = fs.readFileSync(target, 'utf-8');
    const trimmedLen = content.trim().length;
    if (trimmedLen < wfContract.minLength) {
      errors.push(
        `Workflow degradado o truncado en .agent/workflows/${wfContract.file}: longitud ${trimmedLen} < mínimo ${wfContract.minLength} caracteres`
      );
      continue;
    }

    if (!/^---\r?\n[\s\S]+?\r?\n---/.test(content.trim())) {
      errors.push(`Frontmatter YAML obligatorio ausente en .agent/workflows/${wfContract.file}`);
    }

    const missingWfAnchors = wfContract.requiredAnchors.filter((anchor) => !content.includes(anchor));
    if (missingWfAnchors.length > 0) {
      errors.push(
        `Pasos operativos obligatorios faltantes en .agent/workflows/${wfContract.file}: [${missingWfAnchors.join(', ')}]`
      );
    }
  }

  // Verificar definición del subagente auditor adversarial (.agent/agents/adversarial_auditor/agent.md)
  const auditorAgentPath = path.join(agentDir, 'agents', 'adversarial_auditor', 'agent.md');
  if (!fs.existsSync(auditorAgentPath)) {
    errors.push('Definición de agente obligatoria faltante: .agent/agents/adversarial_auditor/agent.md');
  } else {
    const agentContent = fs.readFileSync(auditorAgentPath, 'utf-8');
    if (agentContent.trim().length < 8000) {
      errors.push(
        `Definición de agente degradada en .agent/agents/adversarial_auditor/agent.md: longitud ${agentContent.trim().length} < mínimo 8000 caracteres`
      );
    }
    const requiredAgentAnchors = [
      'name: adversarial_auditor',
      'verify-gates.mjs',
      'verify_gates.py',
      'guard-agent.mjs',
      'redteam-audit.mjs',
      'BLOCKER',
      'CWE-78',
      'Fail-Closed',
      'Tolerancia Cero',
      'Anti-Overclaiming',
    ];
    const missingAgentAnchors = requiredAgentAnchors.filter((a) => !agentContent.includes(a));
    if (missingAgentAnchors.length > 0) {
      errors.push(
        `Anclas obligatorias faltantes en .agent/agents/adversarial_auditor/agent.md: [${missingAgentAnchors.join(', ')}]`
      );
    }
    for (let d = 1; d <= 11; d++) {
      if (!agentContent.includes(`### Dominio ${d} `)) {
        errors.push(`Dominio obligatorio faltante en .agent/agents/adversarial_auditor/agent.md: Dominio ${d}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function resolveDefaultRootDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.agent', 'workflows', 'opsx-audit.en.md'))) {
    return cwd;
  }
  const scriptProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (fs.existsSync(path.join(scriptProjectRoot, '.agent', 'workflows', 'opsx-audit.en.md'))) {
    return scriptProjectRoot;
  }
  return cwd;
}

function runSelfTest(rootDir = resolveDefaultRootDir()) {
  console.log('[GUARD-SELF-TEST] Verificando resistencia de guard-agent.mjs ante ataques de degradación semántica (F-01)...');

  // 1. El árbol real debe pasar sin errores
  const liveCheck = validateGuardContracts(rootDir);
  if (!liveCheck.ok) {
    console.error('[GUARD-SELF-TEST] ❌ Falló validación sobre el repositorio real:', liveCheck.errors);
    process.exit(1);
  }

  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'rayrabbit-guard-test-'));
  try {
    fs.cpSync(path.join(rootDir, '.agent'), path.join(tmpBase, '.agent'), { recursive: true });

    // Caso 1: Copia intacta debe aprobar
    const intactRes = validateGuardContracts(tmpBase);
    if (!intactRes.ok) {
      throw new Error(`Copia intacta debería aprobar, pero falló: ${intactRes.errors.join('; ')}`);
    }

    // Caso 2 (PoC F-01 de auditoría externa): Reemplazar INVARIANTS.md por placeholder > 50 chars que preserva un anchor
    const invPath = path.join(tmpBase, '.agent', 'rules', 'INVARIANTS.md');
    const originalInv = fs.readFileSync(invPath, 'utf-8');
    fs.writeFileSync(
      invPath,
      '# Placeholder rule file with more than 50 characters preserving 15 invariants and Commit per Gate anchor but no actual rules.\n',
      'utf-8'
    );
    const placeholderRes = validateGuardContracts(tmpBase);
    if (placeholderRes.ok) {
      throw new Error('Fallo de seguridad (F-01): guard-agent aceptó un placeholder >50 chars con anchor preservado');
    }

    // Caso 3: Conservar longitud (>2600 chars) y 14 invariantes, pero eliminar la cláusula #14
    const missingOneClause = originalInv.replace(/^14\.\s+\*\*Pre-Code Contract Gate.*$/m, '14. eliminada');
    fs.writeFileSync(invPath, missingOneClause, 'utf-8');
    const singleClauseRes = validateGuardContracts(tmpBase);
    if (singleClauseRes.ok) {
      throw new Error('Fallo de seguridad: guard-agent no detectó la eliminación de la cláusula numerada #14');
    }
    fs.writeFileSync(invPath, originalInv, 'utf-8');

    // Caso 4: Degradar un workflow conservando frontmatter y >50 chars pero sin los comandos obligatorios
    const wfPath = path.join(tmpBase, '.agent', 'workflows', 'opsx-audit.md');
    fs.writeFileSync(
      wfPath,
      '---\ndescription: dummy workflow\n---\n# Dummy workflow content exceeding fifty characters easily without real gate commands.\n',
      'utf-8'
    );
    const wfDegradedRes = validateGuardContracts(tmpBase);
    if (wfDegradedRes.ok) {
      throw new Error('Fallo de seguridad: guard-agent aceptó un workflow vaciado de sus comandos obligatorios');
    }
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }

  console.log('[GUARD-SELF-TEST] ✅ Todas las pruebas adversariales del Guard (incluyendo bloqueo de PoC F-01 placeholder con anchor) pasaron exitosamente.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const targetRoot = resolveDefaultRootDir();
  if (process.argv.includes('--self-test')) {
    runSelfTest(targetRoot);
    process.exit(0);
  }

  console.log('[GUARD-AGENT] Verificando integridad física, estructural y semántica de contratos AI Engineering...');
  const result = validateGuardContracts(targetRoot, { createMissingDirs: true });
  if (!result.ok) {
    for (const err of result.errors) {
      console.error(`[GUARD-AGENT] ❌ ${err}`);
    }
    console.error(`\n[GUARD-AGENT] ❌ Se detectaron ${result.errors.length} anomalías en los contratos de AI Engineering.`);
    console.error('Abortando en modo fail-closed para prevenir debilitamiento del arnés de ingeniería.');
    process.exit(1);
  }

  console.log('[GUARD-AGENT] ✅ Todos los contratos, 15 invariantes (EN/ES), cláusulas SDD y workflows están protegidos e intactos.');
  process.exit(0);
}
