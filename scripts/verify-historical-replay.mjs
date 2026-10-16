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
      isLegitimateRed: false,
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
        isLegitimateRed: false,
        isFraud: false,
        isSyntaxError: true,
        reason: `El test contiene errores de sintaxis o importación no resuelta: ${err}`,
      };
    }
  }

  // 3. Fallo legítimo de aserción (TDD RED genuino).
  // Solo evidencia específica de aserción: 'FAIL ' / 'expect(' aparecen también ante crashes de runtime.
  const assertionPatterns = [
    /AssertionError/,
    /Assertion failed/,
    /FAILED \(failures=/,
    /^E\s+assert /m,
    /^\s*[-+]?\s*Expected:/m,
    /^\s*[-+]?\s*Received:/m,
  ];
  const hasAssertion = assertionPatterns.some((re) => re.test(combined));

  if (!hasAssertion) {
    // F-01: un exit code != 0 sin evidencia de aserción (Error/TypeError/crash) NO es RED legítimo
    return {
      isRed: false,
      isLegitimateRed: false,
      isFraud: false,
      hasAssertion: false,
      isNonAssertive: true,
      reason: 'El runner falló sin evidencia de aserción no satisfecha (excepción de runtime o crash). No es un RED legítimo.',
    };
  }

  return {
    isRed: true,
    isLegitimateRed: true,
    isFraud: false,
    hasAssertion: true,
    reason: 'Fallo físico legítimo por aserción no satisfecha.',
  };
}

/**
 * Punto único de decisión: todo lo que no sea un RED por aserción legítima bloquea (fail-closed).
 */
export function assertLegitimateRed(outcome, shortHash, subject, lang) {
  if (outcome.isFraud) {
    throw new Error(`❌ [FRAUDE-TDD] En ${shortHash} ('${subject}'): ${outcome.reason}`);
  }
  if (outcome.isSyntaxError) {
    throw new Error(`❌ [TEST-INVALIDO] En ${shortHash} ('${subject}'): ${outcome.reason}`);
  }
  if (!outcome.isRed || !outcome.hasAssertion) {
    throw new Error(`❌ [RED-NO-ASERTIVO] En ${shortHash} ('${subject}'): ${outcome.reason}`);
  }
  console.log(`  ✅ [${shortHash}] ${lang} RED verificado: fallo por aserción no satisfecha en el commit padre.`);
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

  // Caso 6 (F-01 auditoría independiente): excepción genérica sin aserción NO es RED legítimo
  const resRuntime = classifyTestResult(1, 'Error: deliberate runtime failure before any assertion', '');
  if (resRuntime.isRed || resRuntime.hasAssertion || !resRuntime.isNonAssertive) {
    throw new Error('FALLÓ SELF-TEST: Aceptó como RED una excepción genérica sin aserción (F-01).');
  }

  // Caso 7: TypeError en runtime tampoco es RED legítimo
  const resTypeErr = classifyTestResult(1, "TypeError: Cannot read properties of undefined (reading 'x')", '');
  if (resTypeErr.isRed) {
    throw new Error('FALLÓ SELF-TEST: Aceptó como RED un TypeError de runtime (F-01).');
  }

  // Caso 8: Vitest imprime 'FAIL' ante un crash; sin AssertionError no es RED
  const resVitestCrash = classifyTestResult(
    1,
    " FAIL  tests/calc.test.ts > add\nTypeError: add is not a function\n ❯ tests/calc.test.ts:5:12\n    expect(add(1, 2)).toBe(3)",
    ''
  );
  if (resVitestCrash.isRed) {
    throw new Error('FALLÓ SELF-TEST: Aceptó como RED un crash de Vitest con cabecera FAIL (F-01).');
  }

  // Caso 9: el punto de decisión del caller DEBE bloquear resultados no asertivos
  let blocked = false;
  try {
    assertLegitimateRed(resRuntime, 'abc1234', 'test(red): x', 'TS');
  } catch (e) {
    blocked = /RED-NO-ASERTIVO/.test(e.message);
  }
  if (!blocked) {
    throw new Error('FALLÓ SELF-TEST: assertLegitimateRed no bloqueó un fallo sin aserción (F-01).');
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas internas del motor de Replay pasaron con éxito.\n');
  return 0;
}

/**
 * Ejecuta el replay de commits test(red) en el rango base..head.
 */
export function verifyHistoricalReplay(baseRef, headRef) {
  if (typeof baseRef === 'string' && baseRef.trim().startsWith('-')) {
    throw new Error(`Referencia git base inválida (no puede comenzar con guión): '${baseRef}'`);
  }
  if (typeof headRef === 'string' && headRef.trim().startsWith('-')) {
    throw new Error(`Referencia git head inválida (no puede comenzar con guión): '${headRef}'`);
  }
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

      // Vincular node_modules del workspace en el worktree temporal para que Vitest resuelva paquetes en os.tmpdir()
      const rootNodeModules = path.join(ROOT_DIR, 'node_modules');
      const tempNodeModules = path.join(tempDir, 'node_modules');
      if (fs.existsSync(rootNodeModules) && !fs.existsSync(tempNodeModules)) {
        fs.symlinkSync(rootNodeModules, tempNodeModules, 'junction');
      }

      // Extraer diff de tests del commit RED SIN trim(): recortar el '\n' final corrompe el patch
      const diffRes = spawnSync('git', ['diff', '--binary', `${rc.hash}^`, rc.hash, '--', ...testFiles], {
        cwd: ROOT_DIR,
        encoding: 'utf8',
      });
      if (diffRes.status !== 0) {
        throw new Error(`❌ [REPLAY-NO-REPRODUCIBLE] En ${shortHash}: git diff falló: ${(diffRes.stderr || '').trim()}`);
      }
      const diffPatch = diffRes.stdout;
      if (diffPatch.trim()) {
        const applyRes = spawnSync('git', ['apply', '--whitespace=nowarn'], {
          cwd: tempDir,
          input: diffPatch,
          encoding: 'utf8',
        });
        if (applyRes.status !== 0) {
          // Fail-closed: si no se puede reproducir, NO se puede afirmar que el RED fue legítimo
          throw new Error(
            `❌ [REPLAY-NO-REPRODUCIBLE] En ${shortHash} ('${rc.subject}'): git apply falló sobre el padre: ${(applyRes.stderr || '').trim()}`
          );
        }
      }

      // Ejecutar runner correspondiente filtrando archivos por lenguaje y usando delimitador '--'
      const tsTestFiles = testFiles.filter((f) => /\.(ts|js|mjs|cjs)$/.test(f));
      const pyTestFiles = testFiles.filter((f) => /\.py$/.test(f));
      if (tsTestFiles.length === 0 && pyTestFiles.length === 0) {
        throw new Error(`❌ [REPLAY-SIN-RUNNER] En ${shortHash}: ningún archivo de test ejecutable (.ts/.js/.py) en [${testFiles.join(', ')}].`);
      }

      if (tsTestFiles.length > 0) {
        const vitestBin = path.join(ROOT_DIR, 'node_modules', 'vitest', 'vitest.mjs');
        if (!fs.existsSync(vitestBin)) {
          throw new Error(`❌ [REPLAY-SIN-RUNNER] En ${shortHash}: vitest no instalado (${vitestBin}). Ejecute 'npm ci'.`);
        }
        const runRes = spawnSync('node', [vitestBin, 'run', '--', ...tsTestFiles], { cwd: tempDir, encoding: 'utf8' });
        assertLegitimateRed(classifyTestResult(runRes.status, runRes.stdout, runRes.stderr), shortHash, rc.subject, 'TS');
      }

      if (pyTestFiles.length > 0) {
        const pyRes = spawnSync('python', ['-m', 'pytest', '-q', '--', ...pyTestFiles], { cwd: tempDir, encoding: 'utf8' });
        assertLegitimateRed(classifyTestResult(pyRes.status, pyRes.stdout, pyRes.stderr), shortHash, rc.subject, 'Python');
      }
    } finally {
      try {
        const tempNodeModules = path.join(tempDir, 'node_modules');
        if (fs.existsSync(tempNodeModules)) fs.unlinkSync(tempNodeModules);
      } catch {
        // Ignorar si no existe el enlace
      }
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
