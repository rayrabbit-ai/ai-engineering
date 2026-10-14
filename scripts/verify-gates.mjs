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

export function isTestFile(filePath) {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  if (norm.startsWith('tests/') || norm.startsWith('test/') || norm.includes('/tests/') || norm.includes('/test/')) return true;
  if (/(\.spec|\.test|_test)\.[a-z0-9]+$/i.test(norm)) return true;
  if (/test_[a-z0-9_-]+\.[a-z0-9]+$/i.test(norm)) return true;
  return false;
}

export function isProductionFile(filePath) {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  // Un archivo de test jamás es código de producción
  if (isTestFile(norm)) return false;
  // Excluir specs, documentación, scripts de soporte, dotfiles y configs
  if (norm.startsWith('openspec/') || norm.startsWith('docs/') || norm.startsWith('scripts/') || norm.startsWith('.agent/') || norm.startsWith('.github/') || norm.startsWith('.git/')) return false;
  if (norm.endsWith('.md') || norm.endsWith('.json') || norm.endsWith('.yaml') || norm.endsWith('.yml') || norm.endsWith('.toml') || norm.endsWith('.txt') || norm.endsWith('.lock') || norm.endsWith('.ini')) return false;
  if (norm === '.gitignore' || norm.endsWith('/.gitignore') || norm === 'license' || norm.endsWith('/license')) return false;
  // Todo archivo bajo src/, lib/, app/, pkg/
  if (norm.startsWith('src/') || norm.includes('/src/') || norm.startsWith('lib/') || norm.includes('/lib/') || norm.startsWith('app/') || norm.includes('/app/')) return true;
  // Archivo de código fuente ejecutable fuera de directorios excluidos
  if (/\.(ts|tsx|js|mjs|cjs|jsx|py|go|rs|java|kt|c|cpp|h|cs)$/i.test(norm)) return true;
  return false;
}

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

function runGitSafe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function runGitOrThrow(cmd, errorMsg) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    throw new Error(`${errorMsg}: ${stderr || err.message}`);
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
      // Invariante 1 & 3: Un commit test(red) no puede incluir código de producción
      const prodFiles = changedFiles.filter(isProductionFile);
      if (prodFiles.length > 0) {
        errors.push(
          `[${shortHash}] Violación de Invariante 1 en '${trimmedSubject}': Un commit 'test(red):' NO puede modificar código de producción (detectado: ${prodFiles.join(', ')}).`
        );
      }

      // Invariante 1 & 3: Un commit test(red) DEBE incluir al menos un archivo de test real
      const testFiles = changedFiles.filter(isTestFile);
      if (testFiles.length === 0) {
        errors.push(
          `[${shortHash}] Violación de Invariante 1 en '${trimmedSubject}': Un commit 'test(red):' DEBE modificar al menos un archivo de test (detectado: 0 archivos de prueba en [${changedFiles.join(', ')}]).`
        );
      }

      const explicitScope = extractScopeFromSubject(trimmedSubject, 'test\\(red\\)');
      const fileScopes = testFiles.map(extractModuleName).filter(Boolean);

      if (explicitScope) {
        activeRedScopes.add(explicitScope);
        fileScopes.forEach((s) => activeRedScopes.add(s));
      } else {
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
        const prodFiles = changedFiles.filter(isProductionFile);

        if (prodFiles.length > 0) {
          // Cada archivo de producción DEBE estar cubierto por los scopes activos de RED
          for (const pFile of prodFiles) {
            const pModule = extractModuleName(pFile);
            const isUniversal = activeRedScopes.has('*');
            const matchesModule = activeRedScopes.has(pModule);
            const matchesExplicit = explicitTargetScope && activeRedScopes.has(explicitTargetScope) && (explicitTargetScope === pModule);

            if (!isUniversal && !matchesModule && !matchesExplicit) {
              const available = Array.from(activeRedScopes).join(', ') || 'ninguno';
              errors.push(
                `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': El archivo de producción modificado '${pFile}' (módulo '${pModule}') no coincide con ningún test(red) activo previo [${available}].`
              );
            }
          }
        } else {
          // Si no modificó archivos de producción directamente, verificar el scope explícito o modificado
          let targetScopes = explicitTargetScope ? [explicitTargetScope] : changedFiles.map(extractModuleName).filter(Boolean);
          const isUniversalMatch = activeRedScopes.has('*');
          const matchedScope = targetScopes.find((s) => activeRedScopes.has(s));

          if (!isUniversalMatch && !matchedScope) {
            const available = Array.from(activeRedScopes).join(', ') || 'ninguno';
            const targetStr = targetScopes.join(', ') || 'sin ámbito identificado';
            errors.push(
              `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': El ámbito modificado [${targetStr}] no coincide con ningún test(red) activo previo [${available}].`
            );
          }
        }

        // Consumir scopes satisfechos
        if (activeRedScopes.has('*')) {
          activeRedScopes.delete('*');
        }
        if (explicitTargetScope && activeRedScopes.has(explicitTargetScope)) {
          activeRedScopes.delete(explicitTargetScope);
        }
        for (const pFile of prodFiles) {
          const pModule = extractModuleName(pFile);
          if (activeRedScopes.has(pModule)) {
            activeRedScopes.delete(pModule);
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

  // Caso 10: Ataque Adversarial: test(red) que modifica código de producción en src/ -> DEBE SER RECHAZADO
  const invalidRedProd = [
    { hash: 'advredp', subject: 'test(red): smuggle production code', changedFiles: ['tests/ts/unit/calc.spec.ts', 'src/calc.ts'] }
  ];
  const errsRedProd = validateCommitList(invalidRedProd);
  if (!errsRedProd.some((e) => e.includes('NO puede modificar código de producción'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs permitió código de producción en un commit test(red).');
  }

  // Caso 11: Auditoría Copilot (Fallo A - RED documental sin tests reales) -> DEBE SER RECHAZADO
  const invalidDocRed = [
    { hash: 'advdoc1', subject: 'test(red)(auth): claimed red on markdown', changedFiles: ['docs/auth.md'] },
    { hash: 'advdoc2', subject: 'feat(green)(auth): implementation', changedFiles: ['src/auth.ts'] }
  ];
  const errsDocRed = validateCommitList(invalidDocRed);
  if (!errsDocRed.some((e) => e.includes('DEBE modificar al menos un archivo de test'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs aceptó un test(red) que no modificó archivos de test.');
  }

  // Caso 12: Auditoría Copilot (Fallo B - GREEN multirruta con contrabando de billing bajo scope auth) -> DEBE SER RECHAZADO
  const invalidMultiGreen = [
    { hash: 'advmg1', subject: 'test(red)(auth): failing auth test', changedFiles: ['tests/unit/auth.test.ts'] },
    { hash: 'advmg2', subject: 'feat(green)(auth): impl auth and smuggle billing', changedFiles: ['src/auth.ts', 'src/billing.ts'] }
  ];
  const errsMultiGreen = validateCommitList(invalidMultiGreen);
  if (!errsMultiGreen.some((e) => e.includes("archivo de producción modificado 'src/billing.ts'") && e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs permitió contrabandear src/billing.ts en un GREEN con scope auth.');
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas (incluyendo pruebas adversariales Copilot y SDD) pasaron exitosamente.');
}

function checkCleanWorkingTree(allowDirty = false) {
  const status = runGit('git status --porcelain');
  if (status) {
    if (allowDirty) {
      console.warn('\n⚠️  ADVERTENCIA DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados (--allow-dirty activo):');
      console.warn(status.split('\n').map((l) => `  ${l}`).join('\n'));
    } else {
      console.error('\n❌ ERROR DE ÁRBOL DE TRABAJO: Existen cambios locales no confirmados en el repositorio:');
      console.error(status.split('\n').map((l) => `  ${l}`).join('\n'));
      console.error('\nPara continuar, confirme (commit) o descarte (stash/clean) los cambios, o pase el flag --allow-dirty.');
      process.exit(1);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    selfTest();
    process.exit(0);
  }

  const allowDirty = args.includes('--allow-dirty');
  checkCleanWorkingTree(allowDirty);

  const baseIdx = args.indexOf('--base');
  const headIdx = args.indexOf('--head');
  const explicitBase = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : null;
  const explicitHead = headIdx !== -1 && args[headIdx + 1] ? args[headIdx + 1] : null;

  // 1. Resolver HEAD
  const head = explicitHead || 'HEAD';
  const headSha = runGitSafe(`git rev-parse --verify ${head}`);
  if (!headSha) {
    console.error(`❌ ERROR DE RESOLUCIÓN GIT: No se pudo resolver la referencia HEAD '${head}'. Verifique que esté dentro de un repositorio Git con commits.`);
    process.exit(1);
  }

  // 2. Resolver BASE
  let base = explicitBase;
  if (base) {
    const baseSha = runGitSafe(`git rev-parse --verify ${base}`);
    if (!baseSha) {
      console.error(`❌ ERROR DE COMPUERTA: La referencia base especificada '${base}' no existe en el repositorio.`);
      console.error(`Si está ejecutando en local sin remotos configurados, ejecute 'node scripts/verify-gates.mjs --base <commit-o-rama>' o agregue el remote correspondiente.`);
      process.exit(1);
    }
  } else {
    // Si no se pasó --base, buscar candidatos válidos
    const candidates = ['origin/main', 'origin/master', 'main', 'master'];
    for (const cand of candidates) {
      const sha = runGitSafe(`git rev-parse --verify ${cand}`);
      if (sha && sha !== headSha) {
        base = cand;
        break;
      }
    }

    if (!base) {
      const prevSha = runGitSafe('git rev-parse --verify HEAD~1');
      if (prevSha) {
        base = 'HEAD~1';
        console.log(`[GATE-INFO] No se detectó remote origin/main. Usando fallback local seguro: base = HEAD~1`);
      } else {
        // Es un repositorio de un solo commit inicial
        console.log(`[GATE-INFO] Repositorio en commit inicial (${headSha.slice(0, 7)}). Auditando el commit inicial...`);
        const files = (runGitSafe(`git diff-tree --no-commit-id --name-only -r ${headSha}`) || '').split('\n').filter(Boolean);
        const subject = runGitSafe(`git log -1 --format="%s" ${headSha}`) || '';
        const errors = validateCommitList([{ hash: headSha, subject, changedFiles: files }]);
        if (errors.length > 0) {
          console.error('\n❌ VIOLACIONES DE COMPUERTA DETECTADAS EN COMMIT INICIAL:');
          errors.forEach((err) => console.error(`  - ${err}`));
          process.exit(1);
        }
        console.log('\n✅ COMMIT INICIAL VALIDADO EXITOSAMENTE (Node.js).');
        process.exit(0);
      }
    }
  }

  const revRange = `${base}..${head}`;
  let rawCommits;
  try {
    rawCommits = runGitOrThrow(`git log --reverse --format="%H|%s" ${revRange}`, `Fallo al obtener commits en el rango '${revRange}'`);
  } catch (err) {
    console.error(`❌ ERROR DE RESOLUCIÓN GIT:\n${err.message}`);
    process.exit(1);
  }

  if (!rawCommits) {
    console.log(`[GATE-OK] No hay commits nuevos en el rango ${revRange}.`);
    process.exit(0);
  }

  const commits = rawCommits.split('\n').filter(Boolean).map((line) => {
    const [hash, subject] = line.split('|');
    const files = (runGitSafe(`git diff-tree --no-commit-id --name-only -r ${hash}`) || '').split('\n').filter(Boolean);
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
