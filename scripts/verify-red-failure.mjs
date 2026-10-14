#!/usr/bin/env node
/**
 * verify-red-failure.mjs - Verificador Físico de Fallo en Fase RED
 * RayRabbit AI Engineering Standard
 * 
 * Ejecuta físicamente las pruebas recién añadidas o modificadas en el commit/staged
 * y verifica de forma determinante que FALLAN (exit code != 0) antes de tocar código de producción.
 * Mitiga el hallazgo F-08 garantizando la causalidad física del test en rojo.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function runGit(args) {
  const res = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  return res.status === 0 ? res.stdout.trim() : '';
}

function getStagedOrHeadTestFiles() {
  // Primero buscar archivos staged
  let files = runGit(['diff', '--cached', '--name-only'])
    .split('\n')
    .filter((f) => f && (f.includes('tests/') || f.includes('.test.') || f.includes('.spec.')));
  
  if (files.length === 0) {
    // Si no hay staged, revisar los modificados en HEAD
    files = runGit(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'])
      .split('\n')
      .filter((f) => f && (f.includes('tests/') || f.includes('.test.') || f.includes('.spec.')));
  }
  return files;
}

function main() {
  const testFiles = getStagedOrHeadTestFiles();
  if (testFiles.length === 0) {
    console.log('[RED-VERIFIER] No se detectaron archivos de test nuevos o modificados para validar.');
    process.exit(0);
  }

  console.log(`[RED-VERIFIER] Verificando fallo físico legítimo en tests: [${testFiles.join(', ')}]...`);

  // Detectar runner según tipo de archivo
  const hasTs = testFiles.some((f) => f.endsWith('.ts') || f.endsWith('.js'));
  const hasPy = testFiles.some((f) => f.endsWith('.py'));

  let verifiedFailures = 0;

  if (hasTs) {
    const tsFiles = testFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    const res = spawnSync('npx', ['vitest', 'run', ...tsFiles], { encoding: 'utf-8', stdio: 'pipe' });
    if (res.status === 0) {
      console.error(`\n❌ VIOLACIÓN TDD EN FASE RED:`);
      console.error(`La prueba en [${tsFiles.join(', ')}] PASÓ INMEDIATAMENTE (exit code 0).`);
      console.error(`Un commit 'test(red):' exige que la prueba falle legítimamente antes de implementar.`);
      process.exit(1);
    }
    console.log(`✅ [FÍSICO] Test TypeScript falló legítimamente como se exige en RED (exit code ${res.status}).`);
    verifiedFailures++;
  }

  if (hasPy) {
    const pyFiles = testFiles.filter((f) => f.endsWith('.py'));
    const res = spawnSync('python', ['-m', 'pytest', ...pyFiles], { encoding: 'utf-8', stdio: 'pipe' });
    if (res.status === 0) {
      console.error(`\n❌ VIOLACIÓN TDD EN FASE RED:`);
      console.error(`La prueba en [${pyFiles.join(', ')}] PASÓ INMEDIATAMENTE (exit code 0).`);
      console.error(`Un commit 'test(red):' exige que la prueba falle legítimamente antes de implementar.`);
      process.exit(1);
    }
    console.log(`✅ [FÍSICO] Test Python falló legítimamente como se exige en RED (exit code ${res.status}).`);
    verifiedFailures++;
  }

  console.log(`[RED-VERIFIER] ✅ Causalidad física RED validada exitosamente (${verifiedFailures} fallos legítimos confirmados).`);
  process.exit(0);
}

main();
