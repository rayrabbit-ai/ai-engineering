#!/usr/bin/env node
/**
 * verify-red-failure.mjs - Verificador Físico de Aserción en Fase RED
 * RayRabbit AI Engineering Standard
 * 
 * Ejecuta físicamente las pruebas recién añadidas o modificadas en el commit/staged
 * y verifica que se produzca un FALLO DE ASERCIÓN LEGÍTIMO (exit code != 0 con AssertionError/FAIL),
 * rechazando explícitamente errores de sintaxis, colección, importación o configuración del runner.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function runGit(args) {
  const res = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  return res.status === 0 ? res.stdout.trim() : '';
}

function getStagedOrHeadTestFiles() {
  let files = runGit(['diff', '--cached', '--name-only'])
    .split('\n')
    .filter((f) => f && (f.includes('tests/') || f.includes('.test.') || f.includes('.spec.')));
  
  if (files.length === 0) {
    files = runGit(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'])
      .split('\n')
      .filter((f) => f && (f.includes('tests/') || f.includes('.test.') || f.includes('.spec.')));
  }
  return files;
}

function hasSyntaxOrCollectionError(output) {
  const forbiddenPatterns = [
    /SyntaxError/i,
    /Cannot find module/i,
    /ImportError/i,
    /ModuleNotFoundError/i,
    /ERR_MODULE_NOT_FOUND/i,
    /ParseError/i,
    /Failed to resolve import/i,
    /ERROR collecting/i,
    /TypeError/i,
    /ReferenceError/i,
    /Unhandled Error/i,
    /Unhandled rejection/i,
  ];
  return forbiddenPatterns.some((pattern) => pattern.test(output));
}

function hasLegitimateAssertionFailure(output) {
  // 1. Prohibir errores genéricos de runtime (ej. throw new Error('setup fail')) que no son aserciones
  if (/(?:Uncaught\s+)?Error:\s+(?!.*Assertion)/i.test(output) && !/AssertionError/i.test(output) && !/expected\s+.+\s+to/i.test(output)) {
    return false;
  }

  // 2. Patrones específicos de fallo de aserción (Vitest/Chai/Jest/Node:assert)
  const assertionPatterns = [
    /AssertionError/i,
    /Assertion failed/i,
    /expected\s+.+\s+to\b/i,
    /Expected:.+Received:/is,
    /expect\(.+?\)\./i,
    /\bassert\b\(/i,
    /\bassert\.[a-zA-Z]/i,
  ];
  return assertionPatterns.some((pattern) => pattern.test(output));
}

function main() {
  const testFiles = getStagedOrHeadTestFiles();
  if (testFiles.length === 0) {
    console.log('[RED-VERIFIER] No se detectaron archivos de test nuevos o modificados en staged ni en HEAD.');
    process.exit(0);
  }

  console.log(`[RED-VERIFIER] Verificando aserción de fallo físico en: [${testFiles.join(', ')}]...`);

  const tsFiles = testFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
  const pyFiles = testFiles.filter((f) => f.endsWith('.py'));

  let verified = 0;

  if (tsFiles.length > 0) {
    const res = spawnSync('npx', ['vitest', 'run', ...tsFiles], { encoding: 'utf-8', stdio: 'pipe' });
    const combinedOutput = `${res.stdout || ''}\n${res.stderr || ''}`;

    if (res.status === 0) {
      console.error(`\n❌ VIOLACIÓN TDD EN FASE RED:`);
      console.error(`La prueba en [${tsFiles.join(', ')}] PASÓ INMEDIATAMENTE (exit code 0).`);
      console.error(`Un commit 'test(red):' exige que la aserción falle antes de implementar.`);
      process.exit(1);
    }

    if (hasSyntaxOrCollectionError(combinedOutput)) {
      console.error(`\n❌ ERROR DE SINTAXIS / IMPORTACIÓN EN TEST:`);
      console.error(`El runner falló por error de importación o sintaxis, lo cual NO califica como fallo TDD legítimo:`);
      console.error(combinedOutput.split('\n').slice(0, 15).join('\n'));
      process.exit(1);
    }

    if (!hasLegitimateAssertionFailure(combinedOutput)) {
      console.error(`\n❌ ERROR EN FASE RED: No se detectó una aserción fallida reconocible en la salida.`);
      process.exit(1);
    }

    console.log(`✅ [FÍSICO] Test TypeScript falló por aserción legítima (exit code ${res.status}).`);
    verified++;
  }

  if (pyFiles.length > 0) {
    const res = spawnSync('python', ['-m', 'pytest', ...pyFiles], { encoding: 'utf-8', stdio: 'pipe' });
    const combinedOutput = `${res.stdout || ''}\n${res.stderr || ''}`;

    if (res.status === 0) {
      console.error(`\n❌ VIOLACIÓN TDD EN FASE RED:`);
      console.error(`La prueba en [${pyFiles.join(', ')}] PASÓ INMEDIATAMENTE (exit code 0).`);
      console.error(`Un commit 'test(red):' exige que la aserción falle antes de implementar.`);
      process.exit(1);
    }

    if (hasSyntaxOrCollectionError(combinedOutput)) {
      console.error(`\n❌ ERROR DE SINTAXIS / COLECCIÓN EN TEST:`);
      console.error(`El test falló en recolección/sintaxis, no en aserción TDD:`);
      console.error(combinedOutput.split('\n').slice(0, 15).join('\n'));
      process.exit(1);
    }

    if (!hasLegitimateAssertionFailure(combinedOutput)) {
      console.error(`\n❌ ERROR EN FASE RED: No se detectó una aserción fallida reconocible en la salida.`);
      process.exit(1);
    }

    console.log(`✅ [FÍSICO] Test Python falló por aserción legítima (exit code ${res.status}).`);
    verified++;
  }

  console.log(`[RED-VERIFIER] ✅ Causalidad física RED validada exitosamente (${verified} aserciones fallidas legítimas).`);
  process.exit(0);
}

main();
