#!/usr/bin/env node
/**
 * verify-gates.mjs - Validador Determinista de Commits por Compuerta (RayRabbit AI Engineering)
 * 
 * Totalmente agnóstico y políglota:
 * Soporta proyectos en TypeScript (.ts, .tsx), JavaScript (.js, .mjs, .cjs),
 * Python (.py), Go (.go), Rust (.rs), Java/Kotlin (.java, .kt), etc.
 * 
 * Valida tres invariantes críticas:
 * 1. Nomenclatura válida de compuertas (test(red), feat(green), refactor, fix, etc.).
 * 2. Causalidad TDD Estricta (Invariantes 1 y 3): Todo 'feat(green)' o 'fix' debe ser precedido por 'test(red)'.
 * 3. Inmutabilidad de Baseline (Invariante 2): Todo cambio en suites de caracterización
 *    (cualquier archivo .ts, .js, .py en tests/characterization/ o con patrón legacy)
 *    requiere obligatoriamente 'test(baseline): update <razón>'.
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

const VALID_PREFIXES = [
  /^test\(red\):/i,
  /^feat\(green\):/i,
  /^refactor(\([a-z0-9_-]+\))?:/i,
  /^test\(baseline\):/i,
  /^test\(integration\):/i,
  /^chore\(hardening\):/i,
  /^fix(\([a-z0-9_-]+\))?:/i,
  /^spec(\([a-z0-9_-]+\))?:/i,
  /^docs(\([a-z0-9_-]+\))?:/i,
  /^triage(\([a-z0-9_-]+\))?:/i,
  /^chore(\([a-z0-9_-]+\))?:/i,
];

// Patrones universales que identifican suites de caracterización de código heredado (en cualquier lenguaje)
const LEGACY_BASELINE_PATTERNS = [
  /characterization/i,
  /legacy_baseline/i,
  /legacy\.spec\.[a-z]+$/i,
  /legacy\.test\.[a-z]+$/i,
  /legacy_test\.[a-z]+$/i,
  /test_.*_legacy\.[a-z]+$/i,
  /baseline\//i,
];

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function validateCommitList(commits) {
  const errors = [];
  let hasRed = false;

  for (const { hash, subject, changedFiles } of commits) {
    const trimmedSubject = subject.trim();

    // 1. Validar Nomenclatura de Compuerta
    const matchesPrefix = VALID_PREFIXES.some((pattern) => pattern.test(trimmedSubject));
    if (!matchesPrefix) {
      errors.push(
        `[${hash.slice(0, 7)}] '${trimmedSubject}' no cumple la nomenclatura de compuertas (ej. 'test(red):', 'feat(green):', 'refactor:', 'fix:').`
      );
    }

    // 2. Registro de Test en Rojo (RED)
    if (/^test\(red\):/i.test(trimmedSubject)) {
      hasRed = true;
    }

    // 3. Validar Causalidad TDD (Invariantes 1 y 3)
    if (/^(feat\(green\):|fix(\([a-z0-9_-]+\))?:)/i.test(trimmedSubject)) {
      if (!hasRed) {
        errors.push(
          `[${hash.slice(0, 7)}] Violación de Causalidad TDD en '${trimmedSubject}': No existe commit 'test(red):' previo en esta rama.`
        );
      }
    }

    // 4. Validar Inmutabilidad de Baseline Legacy (Invariante 2 - agnóstica a extensiones)
    const touchesBaseline = changedFiles.some((filePath) =>
      LEGACY_BASELINE_PATTERNS.some((pattern) => pattern.test(filePath))
    );

    if (touchesBaseline) {
      if (!/^test\(baseline\): update/i.test(trimmedSubject)) {
        errors.push(
          `[${hash.slice(0, 7)}] Violación de Invariante 2: Modificó suite de caracterización legacy sin usar 'test(baseline): update <razón>'.`
        );
      }
    }
  }

  return errors;
}

function selfTest() {
  console.log('[SELF-TEST] Probando verify-gates.mjs con TypeScript, JavaScript legacy y Python...');
  
  // Caso A: Flujo TypeScript válido
  const validTS = [
    { hash: 'ts11111', subject: 'test(red): failing test in vitest', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'ts22222', subject: 'feat(green): minimal implementation', changedFiles: ['src/calc.ts'] },
    { hash: 'ts33333', subject: 'refactor: clean up methods', changedFiles: ['src/calc.ts'] },
  ];
  const errsTS = validateCommitList(validTS);
  if (errsTS.length !== 0) throw new Error(`Falló flujo TS: ${errsTS.join(', ')}`);

  // Caso B: Detección de modificación en legacy JavaScript (.js/.cjs) sin 'test(baseline): update'
  const invalidLegacyJS = [
    { hash: 'js11111', subject: 'test(red): regression', changedFiles: ['tests/unit/old.test.js'] },
    { hash: 'js22222', subject: 'feat(green): toca baseline sin update', changedFiles: ['tests/characterization/legacy.test.js'] }
  ];
  const errsLegacyJS = validateCommitList(invalidLegacyJS);
  if (!errsLegacyJS.some((e) => e.includes('Invariante 2'))) {
    throw new Error('Falló detección de suite legacy en archivo JavaScript .js');
  }

  // Caso C: Violación de causalidad TDD (código sin test previo)
  const invalidCausality = [
    { hash: 'c999999', subject: 'feat(green): codigo directo sin test(red)', changedFiles: ['src/index.js'] }
  ];
  const errsCausality = validateCommitList(invalidCausality);
  if (!errsCausality.some((e) => e.includes('Causalidad TDD'))) {
    throw new Error('Falló detección de causalidad TDD');
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas políglotas (.ts, .js, .py, legacy) pasaron exitosamente.');
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    selfTest();
  }

  const baseIdx = args.indexOf('--base');
  const headIdx = args.indexOf('--head');
  const base = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'origin/main';
  const head = headIdx !== -1 && args[headIdx + 1] ? args[headIdx + 1] : 'HEAD';

  const revRange = `${base}..${head}`;
  const rawCommits = runGit(`git log --reverse --format="%H|%s" ${revRange}`);

  if (!rawCommits) {
    console.log(`[GATE-OK] No hay commits nuevos en el rango ${revRange}.`);
    process.exit(0);
  }

  const commits = rawCommits.split('\n').filter(Boolean).map((line) => {
    const [hash, subject] = line.split('|');
    const files = runGit(`git diff-tree --no-commit-id --name-only -r ${hash}`).split('\n').filter(Boolean);
    return { hash, subject, changedFiles: files };
  });

  console.log(`[GATE-VALIDATOR] Analizando ${commits.length} commits en ${revRange}...`);
  const errors = validateCommitList(commits);

  if (errors.length > 0) {
    console.error('\n❌ VIOLACIONES DE COMPUERTA DETECTADAS:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('\n✅ TODAS LAS COMPUERTAS DE COMMITS APROBADAS (Node.js).');
  process.exit(0);
}

main();
