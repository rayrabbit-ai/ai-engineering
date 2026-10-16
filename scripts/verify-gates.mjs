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
 * 
 * Hardened contra CWE-78 (Command Injection) y Bypasses de Scope (F-02, F-03, F-07).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

export const VALID_PREFIXES = [
  /^test\(red\)(\([a-z0-9_/-]+\))?:/i,
  /^feat\(green\)(\([a-z0-9_/-]+\))?:/i,
  /^refactor(\([a-z0-9_/-]+\))?:/i,
  /^test\(baseline\):/i,
  /^test\(integration\):/i,
  /^chore\(hardening\):/i,
  /^fix(\([a-z0-9_/-]+\))?:/i,
  /^spec(\([a-z0-9_/-]+\))?:/i,
  /^docs(\([a-z0-9_/-]+\))?:/i,
  /^triage(\([a-z0-9_/-]+\))?:/i,
  /^chore(\([a-z0-9_/-]+\))?:/i,
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
  // Debe tener una extensión ejecutable de código de pruebas
  if (!/\.(ts|tsx|js|mjs|cjs|jsx|py|go|rs|java|kt|c|cpp|h|cs)$/i.test(norm)) return false;
  if (norm.startsWith('tests/') || norm.startsWith('test/') || norm.includes('/tests/') || norm.includes('/test/')) return true;
  if (/(\.spec|\.test|_test)\.[a-z0-9]+$/i.test(norm)) return true;
  if (/(?:^|\/)test_[a-z0-9_-]+\.[a-z0-9]+$/i.test(norm)) return true;
  return false;
}

export function isProductionFile(filePath) {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  // Un archivo de test jamás es código de producción
  if (isTestFile(norm)) return false;
  // Excluir specs, documentación, scripts de soporte, dotfiles y configs (soportando monorepos y subcarpetas)
  if (
    norm.startsWith('openspec/') || norm.includes('/openspec/') ||
    norm.startsWith('docs/') || norm.includes('/docs/') ||
    norm.startsWith('scripts/') || norm.includes('/scripts/') ||
    norm.startsWith('.agent/') || norm.includes('/.agent/') ||
    norm.startsWith('.github/') || norm.includes('/.github/') ||
    norm.startsWith('.cursor/') || norm.includes('/.cursor/') ||
    norm.startsWith('.git/') || norm.includes('/.git/') ||
    norm.includes('node_modules/') || norm.includes('dist/') || norm.includes('coverage/')
  ) return false;
  if (norm.endsWith('.md') || norm.endsWith('.json') || norm.endsWith('.yaml') || norm.endsWith('.yml') || norm.endsWith('.toml') || norm.endsWith('.txt') || norm.endsWith('.lock') || norm.endsWith('.ini')) return false;
  if (norm.endsWith('.config.ts') || norm.endsWith('.config.js') || norm.endsWith('.config.mjs') || norm.endsWith('.config.cjs')) return false;
  if (norm === '.gitignore' || norm.endsWith('/.gitignore') || norm === 'license' || norm.endsWith('/license')) return false;
  // Todo archivo bajo src/, lib/, app/, pkg/
  if (norm.startsWith('src/') || norm.includes('/src/') || norm.startsWith('lib/') || norm.includes('/lib/') || norm.startsWith('app/') || norm.includes('/app/')) return true;
  // Archivo de código fuente ejecutable fuera de directorios excluidos
  if (/\.(ts|tsx|js|mjs|cjs|jsx|py|go|rs|java|kt|c|cpp|h|cs)$/i.test(norm)) return true;
  return false;
}

export function extractModuleName(filePath) {
  if (!filePath) return '';
  let normalized = filePath.replace(/\\/g, '/');
  // Eliminar prefijos de subproyecto o raíz de pruebas/código
  normalized = normalized.replace(/^(?:[a-zA-Z0-9_-]+\/)?(?:tests|test)\/(?:ts\/)?(?:unit\/|integration\/|characterization\/|e2e\/)?/i, '');
  normalized = normalized.replace(/^(?:[a-zA-Z0-9_-]+\/)?(?:src|lib|app|pkg|rayrabbit)\//i, '');
  // Quitar extensiones
  normalized = normalized.replace(/\.[a-zA-Z0-9]+$/, '');
  // Quitar sufijos y prefijos de test y legacy
  normalized = normalized.replace(/(\.spec|\.test|_test)$/i, '');
  const parts = normalized.split('/');
  const lastIdx = parts.length - 1;
  parts[lastIdx] = parts[lastIdx].replace(/^test_/i, '').replace(/(\.legacy|_legacy)$/i, '').replace(/^[._-]+|[._-]+$/g, '');
  const joined = parts.filter(Boolean).join('/').toLowerCase().trim();
  return joined;
}

export function extractScopeFromSubject(subject, gateType) {
  const pattern = new RegExp(`^${gateType}(?:\\(([a-z0-9_/-]+)\\))?:`, 'i');
  const match = subject.match(pattern);
  return match && match[1] ? match[1].toLowerCase().trim() : null;
}

/**
 * Escanea y obtiene el conjunto de OpenSpec Changes activos con tasks.md presente.
 */
export function getActiveOpenSpecChanges(baseDir = process.cwd()) {
  const active = new Set();
  let current = path.resolve(baseDir);
  const candidates = [];
  for (let i = 0; i < 4; i++) {
    candidates.push(path.join(current, 'openspec', 'changes'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'archive') {
            const tasksFile = path.join(dir, entry.name, 'tasks.md');
            if (fs.existsSync(tasksFile)) {
              active.add(entry.name);
            }
          }
        }
      } catch {
        // Ignorar fallos de lectura de directorios
      }
    }
  }
  return active;
}

/**
 * Extrae la referencia al OpenSpec Change desde trailers o scope compuesto.
 */
export function extractOpenSpecChange(subject, body = '') {
  if (body) {
    const trailerMatch = body.match(/^OpenSpec-Change:\s*([a-z0-9_-]+)/im);
    if (trailerMatch) return trailerMatch[1].trim();
  }
  const scopeMatch = subject.match(/^(?:feat\(green\)|fix)\(([a-z0-9_/-]+)\):/i);
  if (scopeMatch && scopeMatch[1]) {
    const scope = scopeMatch[1].trim();
    if (scope.includes('/')) {
      return scope.split('/')[0];
    }
    return scope;
  }
  return null;
}

/**
 * Validador estricto de referencias Git para mitigar CWE-78 (Command Injection).
 * Rechaza metacaracteres de shell y valida estructura con 'git check-ref-format'.
 */
export function isValidRefFormat(ref) {
  if (!ref || typeof ref !== 'string') return false;
  const trimmed = ref.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  // Prohibir terminantemente metacaracteres de shell y saltos de línea
  if (/[;&|`$><\r\n\t ]/.test(trimmed)) return false;
  // Permitir revisiones compuestas legítimas (ej. HEAD~1, origin/main, v1.0.0, commits SHA-1/2)
  const probe = spawnSync('git', ['check-ref-format', '--allow-onelevel', trimmed], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  if (probe.status === 0) return true;
  // Soporte para sufijos de revisión git válidos como HEAD~1, HEAD^, branch~2
  if (/^[a-zA-Z0-9/_.-]+(~[0-9]+|\^[0-9]*)*$/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Ejecutor seguro de Git sin shell para evitar CWE-78 (Command Injection).
 */
export function runGit(args) {
  const res = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    const err = (res.stderr || '').trim() || (res.stdout || '').trim();
    throw new Error(`Git command failed [git ${args.join(' ')}]: ${err}`);
  }
  return res.stdout.trim();
}

export function runGitSafe(args) {
  try {
    const res = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return res.status === 0 ? res.stdout.trim() : null;
  } catch {
    return null;
  }
}

export function runGitOrThrow(args, errorMsg) {
  const res = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.trim() : '';
    throw new Error(`${errorMsg}: ${stderr || 'Exit code ' + res.status}`);
  }
  return res.stdout.trim();
}

export function validateCommitList(commits, options = {}) {
  const errors = [];
  const activeRedScopes = new Set();
  const activeOpenSpecChanges = options.activeChanges || getActiveOpenSpecChanges();

  for (const { hash, subject, changedFiles = [], body = '' } of commits) {
    const trimmedSubject = subject.trim();
    const shortHash = (hash || '0000000').slice(0, 7);

    // 1. Validar Nomenclatura de Compuerta
    const matchesPrefix = VALID_PREFIXES.some((pattern) => pattern.test(trimmedSubject));
    if (!matchesPrefix) {
      errors.push(
        `[${shortHash}] '${trimmedSubject}' no cumple la nomenclatura de compuertas (ej. 'test(red):', 'feat(green):', 'refactor:', 'fix:').`
      );
    }

    // 2. Registro de Test en Rojo (RED) y sus ámbitos
    if (/^test\(red\)(\([a-z0-9_/-]+\))?:/i.test(trimmedSubject)) {
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

      const rawScope = extractScopeFromSubject(trimmedSubject, 'test\\(red\\)');
      const explicitScope = rawScope && rawScope.includes('/') ? rawScope.split('/').slice(1).join('/') : rawScope;
      const fileScopes = testFiles.map(extractModuleName).filter(Boolean);

      // F-03: Prohibir scope universal fallback (*). Rechazar si no se puede inferir módulo y no hay scope explícito.
      if (!explicitScope && fileScopes.length === 0) {
        errors.push(
          `[${shortHash}] Violación de Invariante 1 en '${trimmedSubject}': No se pudo inferir un ámbito de módulo válido de los archivos de prueba [${testFiles.join(', ')}] y no se declaró ningún ámbito explícito 'test(red)(<scope>):'.`
        );
      } else {
        if (explicitScope) {
          activeRedScopes.add(explicitScope);
        }
        fileScopes.forEach((s) => activeRedScopes.add(s));
      }
    }

    // 3. Validar Causalidad TDD con Acoplamiento por Ámbito (Invariantes 1 y 3)
    const isGreen = /^feat\(green\)(\([a-z0-9_/-]+\))?:/i.test(trimmedSubject);
    const isFix = /^fix(\([a-z0-9_/-]+\))?:/i.test(trimmedSubject);

    if (isGreen || isFix) {
      if (activeRedScopes.size === 0) {
        errors.push(
          `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': No existe ningún commit 'test(red):' previo pendiente en esta rama.`
        );
      } else {
        const gateName = isGreen ? 'feat\\(green\\)' : 'fix';
        const rawTargetScope = extractScopeFromSubject(trimmedSubject, gateName);
        let parsedChange = null;
        let explicitTargetScope = rawTargetScope;
        if (rawTargetScope && rawTargetScope.includes('/')) {
          const parts = rawTargetScope.split('/');
          parsedChange = parts[0];
          explicitTargetScope = parts.slice(1).join('/');
        }
        const prodFiles = changedFiles.filter(isProductionFile);

        // F-03 Mechanical OpenSpec Linkage
        if (prodFiles.length > 0) {
          const declaredChange = extractOpenSpecChange(trimmedSubject, body);
          const changeToCheck = parsedChange || (declaredChange && activeOpenSpecChanges.has(declaredChange) ? declaredChange : declaredChange);
          if (!changeToCheck || !activeOpenSpecChanges.has(changeToCheck)) {
            errors.push(
              `[${shortHash}] Violación de Trazabilidad SDD en '${trimmedSubject}': Todo commit de producción '${isGreen ? 'feat(green)' : 'fix'}' debe referenciar un OpenSpec Change activo válido (ej. trailer 'OpenSpec-Change: <change-id>' o scope '(<change-id>/<modulo>)'). El cambio '${changeToCheck || 'no declarado'}' no existe en openspec/changes/ o no contiene tasks.md activo.`
            );
          }
        }

        if (prodFiles.length > 0) {
          // Cada archivo de producción DEBE estar estrictamente cubierto por los scopes activos de RED
          for (const pFile of prodFiles) {
            const pModule = extractModuleName(pFile);
            const matchesModule = Boolean(pModule && activeRedScopes.has(pModule));
            const matchesExplicit = Boolean(
              explicitTargetScope &&
              activeRedScopes.has(explicitTargetScope) &&
              explicitTargetScope === pModule
            );

            if (!matchesModule && !matchesExplicit) {
              const available = Array.from(activeRedScopes).join(', ') || 'ninguno';
              errors.push(
                `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': El archivo de producción modificado '${pFile}' (módulo '${pModule || 'anónimo'}') no coincide con ningún test(red) activo previo [${available}].`
              );
            }
          }
        } else {
          // prodFiles.length === 0: Bloquear commits vacíos o que no tocan código de producción a menos que declaren scope explícito acoplado
          const targetScopes = explicitTargetScope
            ? [explicitTargetScope]
            : changedFiles.map(extractModuleName).filter(Boolean);

          if (targetScopes.length === 0) {
            errors.push(
              `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': Un commit '${isGreen ? 'feat(green)' : 'fix'}' debe incluir código de producción o declarar un ámbito explícito acoplado a un test(red) activo previo.`
            );
          } else {
            const hasMatchingScope = targetScopes.some((s) => activeRedScopes.has(s));
            if (!hasMatchingScope) {
              const available = Array.from(activeRedScopes).join(', ') || 'ninguno';
              const targetStr = targetScopes.join(', ');
              errors.push(
                `[${shortHash}] Violación de Causalidad TDD en '${trimmedSubject}': El ámbito modificado [${targetStr}] no coincide con ningún test(red) activo previo [${available}].`
              );
            } else {
              for (const s of targetScopes) {
                activeRedScopes.delete(s);
              }
            }
          }
        }

        // Consumir scopes satisfechos
        if (explicitTargetScope) {
          activeRedScopes.delete(explicitTargetScope);
        }
        for (const pFile of prodFiles) {
          const pModule = extractModuleName(pFile);
          if (pModule) {
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
    { hash: 'ts22222', subject: 'feat(green): minimal implementation', changedFiles: ['src/calc.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
    { hash: 'ts33333', subject: 'refactor: clean up methods', changedFiles: ['src/calc.ts'] },
  ];
  const errsTS = validateCommitList(validTS);
  if (errsTS.length !== 0) throw new Error(`Falló flujo TS: ${errsTS.join(', ')}`);

  // Caso 2: Flujo con scopes explícitos válidos
  const validExplicitScope = [
    { hash: 'sc11111', subject: 'test(red)(auth): failing login test', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'sc22222', subject: 'feat(green)(auth): implement login endpoint', changedFiles: ['src/auth.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
  ];
  const errsExplicit = validateCommitList(validExplicitScope);
  if (errsExplicit.length !== 0) throw new Error(`Falló flujo con scopes explícitos: ${errsExplicit.join(', ')}`);

  // Caso 3: Ataque Adversarial de Copilot (RED en a, GREEN no relacionado en b) -> DEBE SER RECHAZADO
  const adversarialCopilot = [
    { hash: 'adv1111', subject: 'test(red): failing test in a', changedFiles: ['tests/a.test.ts'] },
    { hash: 'adv2222', subject: 'feat(green): implement b without test', changedFiles: ['src/b.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
  ];
  const errsCopilot = validateCommitList(adversarialCopilot);
  if (!errsCopilot.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs aceptó un GREEN no relacionado con el RED.');
  }

  // Caso 4: Scope explícito discordante (auth vs billing) -> DEBE SER RECHAZADO
  const invalidExplicitScope = [
    { hash: 'dsc1111', subject: 'test(red)(auth): failing auth test', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'dsc2222', subject: 'feat(green)(billing): implement billing', changedFiles: ['src/billing.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
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
    { hash: 'dg22222', subject: 'feat(green): implement calc step 1', changedFiles: ['src/calc.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
    { hash: 'dg33333', subject: 'feat(green): implement calc step 2 without second red', changedFiles: ['src/calc.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' },
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
    { hash: 'advdoc2', subject: 'feat(green)(auth): implementation', changedFiles: ['src/auth.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsDocRed = validateCommitList(invalidDocRed);
  if (!errsDocRed.some((e) => e.includes('DEBE modificar al menos un archivo de test'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs aceptó un test(red) que no modificó archivos de test.');
  }

  // Caso 12: Auditoría Copilot (Fallo B - GREEN multirruta con contrabando de billing bajo scope auth) -> DEBE SER RECHAZADO
  const invalidMultiGreen = [
    { hash: 'advmg1', subject: 'test(red)(auth): failing auth test', changedFiles: ['tests/unit/auth.test.ts'] },
    { hash: 'advmg2', subject: 'feat(green)(auth): impl auth and smuggle billing', changedFiles: ['src/auth.ts', 'src/billing.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsMultiGreen = validateCommitList(invalidMultiGreen);
  if (!errsMultiGreen.some((e) => e.includes("archivo de producción modificado 'src/billing.ts'") && e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD ADVERSARIAL: verify-gates.mjs permitió contrabandear src/billing.ts en un GREEN con scope auth.');
  }

  // Caso 13 (F-03 Audit): Bypass con archivo de test que produce nombre vacío tipo tests/test_.py sin scope explícito -> RECHAZADO
  const invalidEmptyModule = [
    { hash: 'f03red1', subject: 'test(red): empty module test', changedFiles: ['tests/test_.py'] },
    { hash: 'f03grn1', subject: 'feat(green): unrelated implementation', changedFiles: ['src/unrelated.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsEmptyModule = validateCommitList(invalidEmptyModule);
  if (!errsEmptyModule.some((e) => e.includes('No se pudo inferir un ámbito de módulo válido'))) {
    throw new Error('FALLÓ VULNERABILIDAD F-03: verify-gates.mjs permitió bypass de scope con nombre de módulo vacío.');
  }

  // Caso 15 (F-03 Audit): Cross-Directory Scope Spoofing (tests/ui/button.test.ts vs src/payments/button.ts) -> DEBE SER RECHAZADO
  const invalidCrossDirScope = [
    { hash: 'cross11', subject: 'test(red): test ui button', changedFiles: ['tests/ui/button.test.ts'] },
    { hash: 'cross22', subject: 'feat(green): implement payments button without auth', changedFiles: ['src/payments/button.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsCrossDir = validateCommitList(invalidCrossDirScope);
  if (!errsCrossDir.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD F-03: verify-gates.mjs permitió spoofing de ámbito entre subdirectorios distintos.');
  }

  // Caso 16 (Auditoría Adversarial): Archivo no ejecutable en tests/ (tests/foo.txt) no califica como test -> DEBE SER RECHAZADO
  const invalidNonCodeTest = [
    { hash: 'txt1111', subject: 'test(red): add txt fixture', changedFiles: ['tests/foo.txt'] },
    { hash: 'txt2222', subject: 'feat(green): implement foo', changedFiles: ['src/foo.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsNonCodeTest = validateCommitList(invalidNonCodeTest);
  if (!errsNonCodeTest.some((e) => e.includes('DEBE modificar al menos un archivo de test'))) {
    throw new Error('FALLÓ AUDITORÍA ADVERSARIAL: verify-gates.mjs aceptó un archivo .txt no ejecutable como test.');
  }

  // Caso 17 (Auditoría Adversarial): Ghost Green (feat(green) que solo toca docs o está vacío sin scope explícito acoplado) -> DEBE SER RECHAZADO
  const invalidGhostGreen = [
    { hash: 'gho1111', subject: 'test(red): test auth', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'gho2222', subject: 'feat(green): ghost green without code', changedFiles: ['docs/readme.txt'] }
  ];
  const errsGhostGreen = validateCommitList(invalidGhostGreen);
  if (!errsGhostGreen.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ AUDITORÍA ADVERSARIAL: verify-gates.mjs permitió commit feat(green) fantasma sin código ni scope acoplado.');
  }

  // Caso 18 (F-01 Forensic Audit): Suffix Collision Bypass (tests/auth.test.ts vs src/billing/auth.ts) -> DEBE SER RECHAZADO
  const invalidSuffixCollision = [
    { hash: 'red0001', subject: 'test(red): auth test', changedFiles: ['tests/auth.test.ts'] },
    { hash: 'green01', subject: 'feat(green): modify billing auth', changedFiles: ['src/billing/auth.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsSuffix = validateCommitList(invalidSuffixCollision);
  if (!errsSuffix.some((e) => e.includes('no coincide con ningún test(red) activo previo'))) {
    throw new Error('FALLÓ VULNERABILIDAD F-01: verify-gates.mjs permitió bypass por colisión de sufijo (auth -> billing/auth).');
  }

  // Caso 19 (F-03 Mechanical OpenSpec Linkage): Trazabilidad SDD obligatoria en feat(green) y fix
  // 19a: Modifica src/ sin OpenSpec Change -> DEBE SER RECHAZADO
  const missingOpenSpec = [
    { hash: 'os0001', subject: 'test(red)(calc): failing calc test', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'os0002', subject: 'feat(green)(calc): impl calc without openspec trailer', changedFiles: ['src/calc.ts'] }
  ];
  const errsMissingOS = validateCommitList(missingOpenSpec);
  if (!errsMissingOS.some((e) => e.includes('Trazabilidad SDD'))) {
    throw new Error('FALLÓ COMPUERTA SDD F-03: verify-gates.mjs permitió commit de producción sin OpenSpec Change.');
  }

  // 19b: Modifica src/ con OpenSpec Change inexistente -> DEBE SER RECHAZADO
  const fakeOpenSpec = [
    { hash: 'os0003', subject: 'test(red)(calc): failing calc test', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'os0004', subject: 'feat(green)(calc): impl calc with nonexistent change', changedFiles: ['src/calc.ts'], body: 'OpenSpec-Change: fake-nonexistent-change' }
  ];
  const errsFakeOS = validateCommitList(fakeOpenSpec);
  if (!errsFakeOS.some((e) => e.includes('Trazabilidad SDD'))) {
    throw new Error('FALLÓ COMPUERTA SDD F-03: verify-gates.mjs permitió commit de producción con OpenSpec Change inexistente.');
  }

  // 19c: Modifica src/ con OpenSpec Change válido vía trailer -> DEBE SER ACEPTADO
  const validTrailerOS = [
    { hash: 'os0005', subject: 'test(red)(calc): failing calc test', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'os0006', subject: 'feat(green)(calc): impl calc with valid trailer', changedFiles: ['src/calc.ts'], body: 'OpenSpec-Change: deterministic-causality-harness' }
  ];
  const errsValidTrailerOS = validateCommitList(validTrailerOS);
  if (errsValidTrailerOS.length !== 0) {
    throw new Error(`Falló aceptación de commit con trailer OpenSpec válido: ${errsValidTrailerOS.join(', ')}`);
  }

  // 19d: Modifica src/ con OpenSpec Change válido vía scope compuesto (<change>/<modulo>) -> DEBE SER ACEPTADO
  const validCompositeScopeOS = [
    { hash: 'os0007', subject: 'test(red)(calc): failing calc test', changedFiles: ['tests/ts/unit/calc.spec.ts'] },
    { hash: 'os0008', subject: 'feat(green)(deterministic-causality-harness/calc): impl calc with composite scope', changedFiles: ['src/calc.ts'] }
  ];
  const errsValidCompositeOS = validateCommitList(validCompositeScopeOS);
  if (errsValidCompositeOS.length !== 0) {
    throw new Error(`Falló aceptación de commit con scope compuesto OpenSpec válido: ${errsValidCompositeOS.join(', ')}`);
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas (incluyendo mitigación F-02 CWE-78, F-03 Scope Spoofing, Test no ejecutable y Ghost Green) pasaron exitosamente.');
}

function checkCleanWorkingTree(allowDirty = false) {
  const status = runGit(['status', '--porcelain']);
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

function isRootCommit(sha) {
  const parents = runGit(['rev-list', '--parents', '-n', '1', sha]);
  return parents ? parents.trim().split(/\s+/).length === 1 : false;
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

  // 1. Resolver HEAD de forma segura
  const head = explicitHead || 'HEAD';
  if (!isValidRefFormat(head)) {
    console.error(`❌ ERROR DE SEGURIDAD GIT: La referencia HEAD '${head}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).`);
    process.exit(1);
  }
  const headSha = runGitSafe(['rev-parse', '--verify', '--end-of-options', head]);
  if (!headSha) {
    console.error(`❌ ERROR DE RESOLUCIÓN GIT: No se pudo resolver la referencia HEAD '${head}'. Verifique que esté dentro de un repositorio Git con commits.`);
    process.exit(1);
  }

  // 2. Resolver BASE de forma segura
  let base = explicitBase;
  if (base) {
    if (!isValidRefFormat(base)) {
      console.error(`❌ ERROR DE SEGURIDAD GIT: La referencia base '${base}' contiene formato inválido o metacaracteres no permitidos (CWE-78 mitigation).`);
      process.exit(1);
    }
    const baseSha = runGitSafe(['rev-parse', '--verify', '--end-of-options', base]);
    if (!baseSha) {
      console.error(`❌ ERROR DE COMPUERTA: La referencia base especificada '${base}' no existe en el repositorio.`);
      console.error(`Si está ejecutando en local sin remotos configurados, ejecute 'node scripts/verify-gates.mjs --base <commit-o-rama>' o agregue el remote correspondiente.`);
      process.exit(1);
    }
  } else {
    // Si no se pasó --base, buscar candidatos válidos
    const candidates = ['origin/main', 'origin/master', 'main', 'master'];
    for (const cand of candidates) {
      const sha = runGitSafe(['rev-parse', '--verify', '--end-of-options', cand]);
      if (sha && sha !== headSha) {
        base = cand;
        break;
      }
    }

    if (!base) {
      const prevSha = runGitSafe(['rev-parse', '--verify', '--end-of-options', 'HEAD~1']);
      if (prevSha) {
        base = 'HEAD~1';
        console.log(`[GATE-INFO] No se detectó remote origin/main. Usando fallback local seguro: base = HEAD~1`);
      } else {
        // F-07: Manejo de repositorio en commit inicial / plantilla
        const subject = runGitSafe(['log', '-1', '--format=%s', headSha]) || '';
        const isTemplateSeed = /^(initial\s+commit|feat:\s*initial|chore:\s*initial|template:)/i.test(subject.trim());
        if (isRootCommit(headSha) && isTemplateSeed) {
          console.log(`[GATE-INFO] Commit raíz / semilla de template detectado (${headSha.slice(0, 7)}): '${subject.trim()}'.`);
          console.log('✅ COMMIT INICIAL DEL TEMPLATE ACEPTADO COMO LÍNEA BASE VÁLIDA.');
          process.exit(0);
        }

        console.log(`[GATE-INFO] Repositorio en commit inicial (${headSha.slice(0, 7)}). Auditando el commit inicial...`);
        const files = (runGitSafe(['diff-tree', '--no-commit-id', '--name-only', '-r', headSha]) || '').split('\n').filter(Boolean);
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

  const baseSha = runGitSafe(['rev-parse', '--verify', '--end-of-options', base]);
  if (!baseSha) {
    console.error(`❌ ERROR DE COMPUERTA: No se pudo resolver la referencia base '${base}'.`);
    process.exit(1);
  }
  const revRange = `${baseSha}..${headSha}`;
  let rawCommits;
  try {
    rawCommits = runGitOrThrow(['log', '--reverse', '--format=%H%x1f%s%x1f%b%x1e', revRange], `Fallo al obtener commits en el rango '${revRange}'`);
  } catch (err) {
    console.error(`❌ ERROR DE RESOLUCIÓN GIT:\n${err.message}`);
    process.exit(1);
  }

  if (!rawCommits) {
    console.log(`[GATE-OK] No hay commits nuevos en el rango ${revRange}.`);
    process.exit(0);
  }

  const commits = rawCommits.split('\x1e').map((c) => c.trim()).filter(Boolean).map((chunk) => {
    const parts = chunk.split('\x1f');
    const hash = parts[0] || '';
    const subject = parts[1] || '';
    const body = parts[2] || '';
    const files = (runGitSafe(['diff-tree', '--no-commit-id', '--name-only', '-r', hash]) || '').split('\n').filter(Boolean);
    return { hash, subject, changedFiles: files, body };
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
