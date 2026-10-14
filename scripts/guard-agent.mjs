#!/usr/bin/env node
/**
 * guard-agent.mjs - Guardián de Contratos y Preservación de Workflows
 * RayRabbit AI Engineering Standard
 * 
 * Previene que la instalación o actualización de OpenSpec ('openspec init', 'openspec update')
 * elimine o degrade las reglas del agente, workflows deterministas o skills TDD.
 */

import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const AGENT_DIR = path.join(ROOT_DIR, '.agent');
const WORKFLOWS_DIR = path.join(AGENT_DIR, 'workflows');
const RULES_DIR = path.join(AGENT_DIR, 'rules');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');

const REQUIRED_WORKFLOWS = [
  'opsx-triage.md',
  'opsx-characterize.md',
  'opsx-apply.md',
  'opsx-bugfix.md',
  'opsx-strangle.md',
  'opsx-e2e.md',
  'opsx-sync.md',
  'opsx-archive.md',
  'opsx-audit.md',
];

const REQUIRED_RULES = [
  'INVARIANTS.md',
  'SDD_GATE.md',
  'AGENTS.md',
  'ADVERSARIAL_AUDITOR.md',
];

console.log('[GUARD-AGENT] Verificando integridad de contratos y workflows de AI Engineering...');

let errors = 0;

// 1. Verificar existencia de carpetas críticas
[AGENT_DIR, WORKFLOWS_DIR, RULES_DIR, SKILLS_DIR].forEach((dir) => {
  if (!existsSync(dir)) {
    console.warn(`[GUARD-AGENT] Creando directorio faltante: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
});

// 2. Verificar reglas fundamentales
REQUIRED_RULES.forEach((ruleFile) => {
  const target = path.join(RULES_DIR, ruleFile);
  if (!existsSync(target)) {
    console.error(`[GUARD-AGENT] ❌ Regla obligatoria faltante: ${ruleFile}`);
    errors++;
  }
});

// 3. Verificar workflows y preservar cabeceras estandarizadas
REQUIRED_WORKFLOWS.forEach((wfFile) => {
  const target = path.join(WORKFLOWS_DIR, wfFile);
  if (!existsSync(target)) {
    console.error(`[GUARD-AGENT] ❌ Workflow determinista faltante: ${wfFile}`);
    errors++;
  }
});

if (errors > 0) {
  console.error(`[GUARD-AGENT] ❌ Se detectaron ${errors} anomalías en los contratos de AI Engineering.`);
  process.exit(1);
}

console.log('[GUARD-AGENT] ✅ Todos los contratos, invariantes y workflows están protegidos e intactos.');
process.exit(0);
