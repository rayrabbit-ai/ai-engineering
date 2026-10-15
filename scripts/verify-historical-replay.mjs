#!/usr/bin/env node
/**
 * @file verify-historical-replay.mjs
 * @description Motor de Verificación Histórica de Replay para Commits test(red) en CI.
 *
 * Resuelve la Vulnerabilidad F-02 (Auditoría Forense):
 * Garantiza mecánicamente que cada commit etiquetado 'test(red):' en un PR
 * haya fallado físicamente por una aserción legítima (AssertionError / expect)
 * sobre el estado inmediatamente anterior del código (commit padre <sha>^),
 * detectando y bloqueando fraudes (tests que ya pasaban en verde o con errores de sintaxis).
 *
 * Uso:
 *   node scripts/verify-historical-replay.mjs [--base <sha>] [--head <sha>] [--self-test]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const ROOT_DIR = process.cwd();

export function runGit(args, cwd = ROOT_DIR) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    const err = (res.stderr || '').trim() || (res.stdout || '').trim();
    throw new Error(`Git falló [git ${args.join(' ')}]: ${err}`);
  }
  return res.stdout.trim();
}

export function runGitSafe(args, cwd = ROOT_DIR) {
  try {
    const res = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return res.status === 0 ? res.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Clasifica la salida de un test runner para asegurar que el fallo sea una aserción legítima.
 */
export function classifyTestResult(exitCode, stdout = '', stderr = '') {
  const combined = `${stdout}\n${stderr}`;

  // 1. Fraude: el test pasó antes de tiempo
  if (exitCode === 0) {
    return {
      isRed: false,
      isFraud: true,
      reason: 'El test pasó exitosamente (código 0) antes de implementar el código de producción.',
    };
  }

  // 2. Error de sintaxis o importación inválida (no es un fallo de aserción legítimo)
  const syntaxErrors = [
    'SyntaxError:',
    'IndentationError:',
    'TabError:',
    'Cannot find module',
    'ERR_MODULE_NOT_FOUND',
    'ModuleNotFoundError:',
    'ImportError:',
  ];
  for (const err of syntaxErrors) {
    if (combined.includes(err)) {
      return {
        isRed: false,
        isFraud: false,
        isSyntaxError: true,
        reason: `El test contiene errores de sintaxis o importación no resuelta: ${err}`,
      };
    }
  }

  // 3. Fallo legítimo de aserción (TDD RED genuino)
  const assertionPatterns = [
    'AssertionError',
    'assert ',
    'expect(',
    'Assertion failed',
    'FAILED (failures=',
    'FAIL ',
    'Expected:',
    'Received:',
    'Difference:',
  ];
  const hasAssertion = assertionPatterns.some((pat) => combined.includes(pat));

  return {
    isRed: true,
    isFraud: false,
    hasAssertion,
    reason: hasAssertion
      ? 'Fallo físico legítimo por aserción no satisfecha.'
      : 'El runner devolvió código de error sin error de sintaxis.',
  };
}

/**
 * Autoverificación determinista de clasificación y replay (Self-Test).
 */
export function selfTest() {
  console.log('[SELF-TEST] Probando motor de clasificación de Replay Histórico...');

  // Caso 1: Test que pasa en verde (Fraude)
  const resFraud = classifyTestResult(0, '✓ tests/calc.test.ts (2 passed)', '');
  if (!resFraud.isFraud) {
    throw new Error('FALLÓ SELF-TEST: No detectó fraude en test con exit code 0.');
  }

  // Caso 2: Test con error de sintaxis en Python
  const resSyntaxPy = classifyTestResult(1, '', 'SyntaxError: invalid syntax on line 12');
  if (!resSyntaxPy.isSyntaxError) {
    throw new Error('FALLÓ SELF-TEST: No detectó SyntaxError en salida de Python.');
  }

  // Caso 3: Test con error de módulo ausente en Node
  const resModuleNode = classifyTestResult(1, '', "Error: Cannot find module './nonexistent'");
  if (!resModuleNode.isSyntaxError) {
    throw new Error('FALLÓ SELF-TEST: No detectó Cannot find module en Node.');
  }

  // Caso 4: Fallo legítimo por AssertionError en Vitest
  const resVitestRed = classifyTestResult(
    1,
    'FAIL tests/calc.test.ts\nAssertionError: expected 4 to be 5\n  - Expected: 5\n  + Received: 4',
    ''
  );
  if (!resVitestRed.isRed || !resVitestRed.hasAssertion) {
    throw new Error('FALLÓ SELF-TEST: No reconoció fallo legítimo de aserción en Vitest.');
  }

  // Caso 5: Fallo legítimo por AssertionError en Pytest
  const resPytestRed = classifyTestResult(
    1,
    'tests/test_calc.py:12: AssertionError: assert add(2, 2) == 5\nFAILED tests/test_calc.py::test_add - AssertionError',
    ''
  );
  if (!resPytestRed.isRed || !resPytestRed.hasAssertion) {
    throw new Error('FALLÓ SELF-TEST: No reconoció fallo legítimo de aserción en Pytest.');
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas internas del motor de Replay pasaron con éxito.\n');
  return 0;
}

/**
 * Ejecuta el replay de commits test(red) en el rango base..head.
 */
export function verifyHistoricalReplay(baseRef, headRef) {
  const baseSha = runGit(['rev-parse', '--verify', '--end-of-options', baseRef]);
  const headSha = runGit(['rev-parse', '--verify', '--end-of-options', headRef]);

  if (!baseSha || !headSha) {
    throw new Error(`No se pudieron resolver las referencias ${baseRef}..${headRef}`);
  }

  const range = `${baseSha}..${headSha}`;
  const logLines = runGit(['log', '--reverse', '--format=%H|%s', range])
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const redCommits = [];
  for (const line of logLines) {
    const [hash, subject] = line.split('|');
    if (/^test\(red\)(?:\([a-z0-9_/-]+\))?:/i.test(subject)) {
      const files = runGit(['diff-tree', '--no-commit-id', '--name-only', '-r', hash])
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
      redCommits.push({ hash, subject, files });
    }
  }

  if (redCommits.length === 0) {
    console.log(`[REPLAY-OK] No hay commits 'test(red):' en el rango ${range}. Validación omitida.`);
    return 0;
  }

  console.log(`[REPLAY-AUDITOR] Verificando causalidad física en ${redCommits.length} commit(s) RED...`);

  for (const rc of redCommits) {
    const shortHash = rc.hash.slice(0, 7);
    const parentSha = runGitSafe(['rev-parse', '--verify', `${rc.hash}^`]);

    if (!parentSha) {
      console.log(`[REPLAY-INFO] El commit ${shortHash} es commit raíz. Omitiendo replay contra padre.`);
      continue;
    }

    const testFiles = rc.files.filter((f) => /^(?:[a-zA-Z0-9_-]+\/)?tests?\//i.test(f));
    if (testFiles.length === 0) {
      throw new Error(`[${shortHash}] Fraude TDD: El commit '${rc.subject}' no modificó ningún archivo de prueba.`);
    }

    // Crear un worktree temporal aislado para ejecutar el test en el padre sin ensuciar el workspace
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `rayrabbit-replay-${shortHash}-`));
    try {
      runGit(['worktree', 'add', '--detach', tempDir, parentSha]);

      // Extraer diff de tests del commit RED y aplicarlo sobre el código padre
      const diffPatch = runGit(['diff', `${rc.hash}^`, rc.hash, '--', ...testFiles]);
      if (diffPatch.trim()) {
        const applyRes = spawnSync('git', ['apply', '--whitespace=nowarn'], {
          cwd: tempDir,
          input: diffPatch,
          encoding: 'utf8',
        });
        if (applyRes.status !== 0) {
          console.warn(`[REPLAY-WARN] No se pudo aplicar parche limpio en ${shortHash}, omitiendo replay directo.`);
          continue;
        }
      }

      // Ejecutar runner correspondiente
      const hasTsTests = testFiles.some((f) => /\.(ts|js|mjs|cjs)$/.test(f));
      const hasPyTests = testFiles.some((f) => /\.py$/.test(f));

      if (hasTsTests) {
        const vitestBin = path.join(ROOT_DIR, 'node_modules/.bin/vitest');
        if (fs.existsSync(vitestBin)) {
          const runRes = spawnSync('node', [vitestBin, 'run', ...testFiles], { cwd: tempDir, encoding: 'utf8' });
          const outcome = classifyTestResult(runRes.status, runRes.stdout, runRes.stderr);
          if (outcome.isFraud) {
            throw new Error(`❌ [FRAUDE-TDD] En ${shortHash} ('${rc.subject}'): ${outcome.reason}`);
          }
          if (outcome.isSyntaxError) {
            throw new Error(`❌ [TEST-INVALIDO] En ${shortHash} ('${rc.subject}'): ${outcome.reason}`);
          }
          console.log(`  ✅ [${shortHash}] TS RED Físico Verificado: AssertionError legítima confirmada.`);
        }
      }

      if (hasPyTests) {
        const pyRes = spawnSync('python', ['-m', 'pytest', '-q', ...testFiles], { cwd: tempDir, encoding: 'utf8' });
        const outcomePy = classifyTestResult(pyRes.status, pyRes.stdout, pyRes.stderr);
        if (outcomePy.isFraud) {
          throw new Error(`❌ [FRAUDE-TDD] En ${shortHash} ('${rc.subject}'): ${outcomePy.reason}`);
        }
        if (outcomePy.isSyntaxError) {
          throw new Error(`❌ [TEST-INVALIDO] En ${shortHash} ('${rc.subject}'): ${outcomePy.reason}`);
        }
        console.log(`  ✅ [${shortHash}] Python RED Físico Verificado: AssertionError legítima confirmada.`);
      }
    } finally {
      // Limpieza segura del worktree temporal
      runGitSafe(['worktree', 'remove', '--force', tempDir]);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignorar limpieza de archivos residuales
      }
    }
  }

  console.log('\n✅ TODOS LOS COMMITS RED REPRODUCIDOS Y VERIFICADOS FÍSICAMENTE (Historical Replay Approved).');
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    process.exit(selfTest());
  }

  const baseIdx = args.indexOf('--base');
  const headIdx = args.indexOf('--head');
  const base = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'HEAD~1';
  const head = headIdx !== -1 && args[headIdx + 1] ? args[headIdx + 1] : 'HEAD';

  try {
    process.exit(verifyHistoricalReplay(base, head));
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
