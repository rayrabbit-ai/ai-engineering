#!/usr/bin/env node
/**
 * verify-gates.mjs - Validador Determinista de Commits por Compuerta (RayRabbit AI Engineering)
 * 
 * Totalmente agnóstico y políglota:
 * Soporta proyectos en TypeScript (.ts, .tsx), JavaScript (.js, .mjs, .cjs),
 * Python (.py), Go (.go), Rust (.rs), Java/Kotlin (.java, .kt), etc.
 * 
 * Valida cuatro compuertas e invariantes críticas:
 * 1. Nomenclatura válida de compuertas (test(red), feat(green), refactor, fix, spec, etc.).
 * 2. Causalidad TDD Estricta con Acoplamiento por Ámbito/Scope (Invariantes 1 y 3):
 *    Todo 'feat(green)' o 'fix' debe ser precedido por un 'test(red)' del MISMO ámbito o módulo.
 * 3. Inmutabilidad de Baseline Legacy (Invariante 2):
 *    Cualquier cambio en suites de caracterización requiere obligatoriamente 'test(baseline): update <razón>'.
 * 4. Integridad de Especificaciones SDD (Invariante SDD):
 *    Las especificaciones consolidadas en 'openspec/specs/' no pueden ser alteradas directamente
 *    en commits de implementación; requieren sincronización controlada ('spec(sync):' o 'chore(archive):').
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

export const VALID_PREFIXES = [
  /^test\(red\)(\([a-z0-9_-]+\))?:/i,
  /^feat\(green\)(\([a-z0-9_-]+\))?:/i,
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

// Patrones universales que identifican suites de caracterización de código heredado
export const LEGACY_BASELINE_PATTERNS = [
  /characterization/i,
  /legacy_baseline/i,
  /legacy\.spec\.[a-z]+$/i,
  /legacy\.test\.[a-z]+$/i,
  /legacy_test\.[a-z]+$/i,
  /test_.*_legacy\.[a-z]+$/i,
  /baseline\//i,
];

export function extractModuleName(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];
  let base = fileName.replace(/\.[a-zA-Z0-9]+$/, '');
  base = base.replace(/(\.spec|\.test|_test)$/i, '');
  base = base.replace(/^test_/i, '');
  return base.toLowerCase().trim();
}

export function extractScopeFromSubject(subject, gateType) {
  const pattern = new RegExp(`^${gateType}(?:\\(([a-z0-9_-]+)\\))?:`, 'i');
  const match = subject.match(pattern);
  return match && match[1] ? match[1].toLowerCase().trim() : null;
}

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function validateCommitList(commits) {
  const errors = [];
  const activeRedScopes = new Set();

  for (const { hash, subject, changedFiles = [] } of commits) {
    const trimmedSubject = subject.trim();
    const shortHash = hash.slice(0, 7);

    // 1. Validar Nomenclatura de Compuerta
    const matchesPrefix = VALID_PREFIXES.some((pattern) => pattern.test(trimmedSubject));
    if (!matchesPrefix) {
      errors.push(
        `[${shortHash}] '${trimmedSubject}' no cumple la nomenclatura de compuertas (ej. 'test(red):', 'feat(green):', 'refactor:', 'fix:').`
      );
    }

    // 2. Registro de Test en Rojo (RED) y sus ámbitos
    if (/^test\(red\)(\([a-z0-9_-]+\))?:/i.test(trimmedSubject)) {
      const explicitScope = extractScopeFromSubject(trimmedSubject, 'test\\(red\\)');
      if (explicitScope) {
        activeRedScopes.add(explicitScope);
      } else {
        const fileScopes = changedFiles.map(extractModuleName).filter(Boolean);
        if (fileScopes.length > 0) {
          fileScopes.forEach((s) => activeRedScopes.add(s));
        } else {
          activeRedScopes.add('*');
        }
      }
    }

    // 3. Validar Causalidad TDD con Acoplamiento por Ámbito (Invariantes 1 y 3)
    const isGreen = /^feat\(green\)(\([a-z0-9_-]+\))?:/i.test(trimmedSubject);
    const isFix = /^fix(\([a-z0-9_-]+\))?:/i.test(trimmedSubject);

    if (isGreen || isFix) {
      if (activeRedScopes.size === 0) {
        errors.push(
          `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': No existe ningún commit 'test(red):' previo pendiente en esta rama.`
        );
      } else {
        const gateName = isGreen ? 'feat\\(green\\)' : 'fix';
        const explicitTargetScope = extractScopeFromSubject(trimmedSubject, gateName);
        let targetScopes = [];

        if (explicitTargetScope) {
          targetScopes = [explicitTargetScope];
        } else {
          targetScopes = changedFiles.map(extractModuleName).filter(Boolean);
        }

        const isUniversalMatch = activeRedScopes.has('*');
        const matchedScope = targetScopes.find((s) => activeRedScopes.has(s));

        if (!isUniversalMatch && !matchedScope) {
          const available = Array.from(activeRedScopes).join(', ') || 'ninguno';
          const targetStr = targetScopes.join(', ') || 'sin ámbito identificado';
          errors.push(
            `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': El ámbito modificado [${targetStr}] no coincide con ningún test(red) activo previo [${available}].`
          );
        } else {
          // Consumir el ámbito satisfecho
          if (matchedScope) {
            activeRedScopes.delete(matchedScope);
          } else if (isUniversalMatch) {
            activeRedScopes.delete('*');
          }
        }
      }
    }

    // 4. Validar Inmutabilidad de Baseline Legacy (Invariante 2)
    const touchesBaseline = changedFiles.some((filePath) =>
      LEGACY_BASELINE_PATTERNS.some((pattern) => pattern.test(filePath))
    );

    if (touchesBaseline) {
      if (!/^test\(baseline\): update/i.test(trimmedSubject)) {
        errors.push(
          `[${shortHash}] Violación de Invariante 2: Modificó suite de caracterización legacy sin usar 'test(baseline): update <razón>'.`
        );
      }
    }

    // 5. Validar Integridad de Especificaciones Consolidadas SDD
    const touchesConsolidatedSpecs = changedFiles.some((f) => {
      const norm = f.replace(/\\/g, '/').toLowerCase();
      return norm.startsWith('openspec/specs/') || norm.includes('/openspec/specs/');
    });

    if (touchesConsolidatedSpecs) {
      const isAllowedSync = /^(spec\(sync\)|chore\(archive\)|spec\(baseline\))/i.test(trimmedSubject);
      if (!isAllowedSync) {
        errors.push(
          `[${shortHash}] Violación de Compuerta SDD en '${trimmedSubject}': No se permite modificar directamente 'openspec/specs/' consolidado en commits de implementación. Utilice delta specs en 'openspec/changes/' y consolide mediante 'spec(sync):'.`
        );
      }
    }
  }

  return errors;
}

export function selfTest() {
  console.log('[SELF-TEST] Probando verify-gates.mjs con causalidad estricta, acoplamiento de ámbitos y SDD...');
  
  // Caso 1: Flujo TypeScript válido inferido por nombre de módulo
  const validTS = [
    { hash: 'ts11111', subject: 'test(red): failing test in vitest', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'ts22222', subject: 'feat(green): minimal implementation', changedFiles: ['src/calc.ts'] },
    { hash: 'ts33333', subject: 'refactor: clean up methods', changedFiles: ['src/calc.ts'] },
  ];
  const errsTS = validateCommitList(validTS);
  if (errsTS.length !== 0) throw new Error(`Falló flujo TS: ${errsTS.join(', ')}`);

  // Caso 2: Flujo con scopes explícitos válidos
  const validExplicitScope = [
    { hash: 'sc11111', subject: 'test(red)(auth): failing login test', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'sc22222', subject: 'feat(green)(auth): implement login endpoint', changedFiles: ['src/auth.ts'] },
  ];
  const errsExplicit = validateCommitList(validExplicitScope);
  if (errsExplicit.length !== 0) throw new Error(`Falló flujo con scopes explícitos: ${errsExplicit.join(', ')}`);

  // Caso 3: Ataque Adversarial de Copilot (RED en a, GREEN no relacionado en b) -> DEBE SER RECHAZADO
  const adversarialCopilot = [
    { hash: 'adv1111', subject: 'test(red): failing test in a', changedFiles: ['tests/a.test.ts'] },
    { hash: 'adv2222', subject: 'feat(green): implement b without test', changedFiles: ['src/b.ts'] },
  ];
  const errsCopilot = validateCommitList(adversarialCopilot);
  if (!errsCopilot.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs aceptó un GREEN no relacionado con el RED.');
  }

  // Caso 4: Scope explícito discordante (auth vs billing) -> DEBE SER RECHAZADO
  const invalidExplicitScope = [
    { hash: 'dsc1111', subject: 'test(red)(auth): failing auth test', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'dsc2222', subject: 'feat(green)(billing): implement billing', changedFiles: ['src/billing.ts'] },
  ];
  const errsMismatch = validateCommitList(invalidExplicitScope);
  if (!errsMismatch.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('Falló detección de scopes explícitos discordantes.');
  }

  // Caso 5: Detección de modificación en legacy JavaScript (.js/.cjs) sin 'test(baseline): update'
  const invalidLegacyJS = [
    { hash: 'js11111', subject: 'test(red): regression', changedFiles: ['tests/unit/old.test.js'] },
    { hash: 'js22222', subject: 'feat(green): toca baseline sin update', changedFiles: ['tests/characterization/legacy.test.js'] }
  ];
  const errsLegacyJS = validateCommitList(invalidLegacyJS);
  if (!errsLegacyJS.some((e) => e.includes('Invariante 2'))) {
    throw new Error('Falló detección de suite legacy en archivo JavaScript .js');
  }

  // Caso 6: Violación de causalidad TDD (código sin test previo)
  const invalidCausality = [
    { hash: 'c999999', subject: 'feat(green): codigo directo sin test(red)', changedFiles: ['src/index.js'] }
  ];
  const errsCausality = validateCommitList(invalidCausality);
  if (!errsCausality.some((e) => e.includes('Causalidad TDD'))) {
    throw new Error('Falló detección de causalidad TDD sin test previo');
  }

  // Caso 7: Consumo de RED: un segundo GREEN sin un segundo RED debe fallar
  const doubleGreen = [
    { hash: 'dg11111', subject: 'test(red): failing test', changedFiles: ['tests/calc.test.ts'] },
    { hash: 'dg22222', subject: 'feat(green): implement calc step 1', changedFiles: ['src/calc.ts'] },
    { hash: 'dg33333', subject: 'feat(green): implement calc step 2 without second red', changedFiles: ['src/calc.ts'] },
  ];
  const errsDoubleGreen = validateCommitList(doubleGreen);
  if (!errsDoubleGreen.some((e) => e.includes('Causalidad TDD'))) {
    throw new Error('Falló detección de segundo GREEN no autorizado tras consumir el RED');
  }

  // Caso 8: Violación de compuerta SDD: modificar specs/ consolidado directamente
  const invalidSDD = [
    { hash: 'sdd1111', subject: 'feat(green): bypass specs proposal', changedFiles: ['openspec/specs/auth.md'] }
  ];
  const errsSDD = validateCommitList(invalidSDD);
  if (!errsSDD.some((e) => e.includes('Compuerta SDD'))) {
    throw new Error('Falló detección de alteración directa de specs consolidadas.');
  }

  // Caso 9: Sincronización válida de SDD
  const validSDD = [
    { hash: 'sdd2222', subject: 'spec(sync): consolidate auth specs from change', changedFiles: ['openspec/specs/auth.md'] }
  ];
  const errsValidSDD = validateCommitList(validSDD);
  if (errsValidSDD.length !== 0) {
    throw new Error(`Falló sincronización válida de SDD: ${errsValidSDD.join(', ')}`);
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas (incluyendo prueba adversarial Copilot y SDD) pasaron exitosamente.');
}

function checkCleanWorkingTree() {
  const status = runGit('git status --porcelain');
  if (status) {
    console.warn('\n⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados:');
    console.warn(status.split('\n').map((l) => `  ${l}`).join('\n'));
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    selfTest();
    process.exit(0);
  }

  checkCleanWorkingTree();

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

if (process.argv[1] && process.argv[1].endsWith('verify-gates.mjs')) {
  main();
}
