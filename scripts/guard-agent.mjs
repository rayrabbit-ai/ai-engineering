#!/usr/bin/env node
/**
 * guard-agent.mjs - Guardián de Contratos y Preservación de Workflows
 * RayRabbit AI Engineering Standard
 * 
 * Previene que la instalación o actualización de OpenSpec ('openspec init', 'openspec update')
 * o PRs adversariales eliminen, vacíen o degraden las reglas del agente, workflows deterministas o skills TDD.
 * Valida presencia, tamaño mínimo y anclajes semánticos obligatorios (F-01 mitigado).
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
  { file: 'INVARIANTS.md', anchors: ['15 invariants', 'Commit per Gate', 'Invariante 1', '15 Leyes Universales'] },
  { file: 'SDD_GATE.md', anchors: ['OpenSpec', 'SDD', 'Spec-Driven'] },
  { file: 'AGENTS.md', anchors: ['RayRabbit', 'DNA', 'AI Coding Agents'] },
  { file: 'ADVERSARIAL_AUDITOR.md', anchors: ['Adversarial', 'Auditor'] },
];

console.log('[GUARD-AGENT] Verificando integridad física, estructural y semántica de contratos AI Engineering...');

let errors = 0;

// 1. Verificar existencia de carpetas críticas
[AGENT_DIR, WORKFLOWS_DIR, RULES_DIR, SKILLS_DIR].forEach((dir) => {
  if (!existsSync(dir)) {
    console.warn(`[GUARD-AGENT] Creando directorio faltante: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
});

// 2. Verificar reglas fundamentales (existencia, contenido no vacío y firmas canónicas)
REQUIRED_RULES.forEach(({ file, anchors }) => {
  const target = path.join(RULES_DIR, file);
  if (!existsSync(target)) {
    console.error(`[GUARD-AGENT] ❌ Regla obligatoria faltante: ${file}`);
    errors++;
    return;
  }

  const content = readFileSync(target, 'utf-8');
  if (content.trim().length < 50) {
    console.error(`[GUARD-AGENT] ❌ Regla vaciada o degradada (longitud insuficiente): ${file}`);
    errors++;
    return;
  }

  const hasAnchor = anchors.some((anchor) => content.includes(anchor));
  if (!hasAnchor) {
    console.error(`[GUARD-AGENT] ❌ Firma semántica canónica ausente en ${file}. Se esperaba al menos uno de: [${anchors.join(', ')}]`);
    errors++;
  }
});

// 3. Verificar workflows deterministas y longitud mínima
REQUIRED_WORKFLOWS.forEach((wfFile) => {
  const target = path.join(WORKFLOWS_DIR, wfFile);
  if (!existsSync(target)) {
    console.error(`[GUARD-AGENT] ❌ Workflow determinista faltante: ${wfFile}`);
    errors++;
    return;
  }

  const content = readFileSync(target, 'utf-8');
  if (content.trim().length < 30) {
    console.error(`[GUARD-AGENT] ❌ Workflow degradado o vacío: ${wfFile}`);
    errors++;
  }
});

if (errors > 0) {
  console.error(`\n[GUARD-AGENT] ❌ Se detectaron ${errors} anomalías en los contratos de AI Engineering.`);
  console.error('Abortando para prevenir debilitamiento del arnés de ingeniería.');
  process.exit(1);
}

console.log('[GUARD-AGENT] ✅ Todos los contratos, invariantes, firmas y workflows están protegidos e intactos.');
process.exit(0);
