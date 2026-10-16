#!/usr/bin/env node
/**
 * @file tdd-flow.mjs
 * @description Helper CLI para el Flujo TDD Determinista (RayRabbit AI Engineering).
 *
 * Facilita la ergonomía de desarrollo para ingenieros y agentes IA automatizando:
 * 1. tdd:red      -> Verifica fallo físico legítimo por aserción, calcula ámbito y comitea test(red).
 * 2. tdd:green    -> Ejecuta suite completa + cobertura (80%/75%), verifica paso, vincula OpenSpec y comitea feat(green).
 * 3. tdd:refactor -> Ejecuta suite para asegurar estado verde y comitea refactor.
 *
 * Uso:
 *   node scripts/tdd-flow.mjs red "<descripción>" [--dry-run]
 *   node scripts/tdd-flow.mjs green "<descripción>" [--dry-run]
 *   node scripts/tdd-flow.mjs refactor "<descripción>" [--dry-run]
 *   node scripts/tdd-flow.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { extractModuleName, isProductionFile, isTestFile, getActiveOpenSpecChanges } from './verify-gates.mjs';
import { classifyTestResult, runGit, runGitSafe } from './verify-historical-replay.mjs';

const ROOT_DIR = process.cwd();

export function getStatusFiles(cwd = ROOT_DIR) {
  const output = runGitSafe(['status', '--porcelain'], cwd) || '';
  const lines = output.split('\n').filter(Boolean);
  const files = [];
  for (const line of lines) {
    const status = line.slice(0, 2);
    let filePath = line.slice(3).trim();
    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ')[1];
    }
    // Quitar comillas si las hay
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }
    files.push({ status, file: filePath });
  }
  return files;
}

export function inferScope(files) {
  for (const f of files) {
    const mod = extractModuleName(f);
    if (mod) return mod;
  }
  return 'core';
}

export function formatCommitMessage(phase, scope, description, changeId = null) {
  const descClean = (description || '').trim();
  if (phase === 'red') {
    return `test(red)(${scope}): ${descClean}`;
  }
  if (phase === 'green') {
    let msg = `feat(green)(${scope}): ${descClean}`;
    if (changeId) {
      msg += `\n\nOpenSpec-Change: ${changeId}`;
    }
    return msg;
  }
  if (phase === 'refactor') {
    return `refactor(${scope}): ${descClean}`;
  }
  throw new Error(`Fase desconocida: '${phase}'`);
}

export function runRedFlow(description, dryRun = false) {
  console.log('🔍 [TDD-FLOW: RED] Analizando archivos de test modificados...');
  const statusItems = getStatusFiles();
  const allFiles = statusItems.map((item) => item.file);
  const testFiles = allFiles.filter(isTestFile);
  const prodFiles = allFiles.filter(isProductionFile);

  if (prodFiles.length > 0) {
    console.error(`❌ [INVARIANTE 1] No se puede ejecutar 'tdd:red' con archivos de producción modificados:`);
    prodFiles.forEach((f) => console.error(`  - ${f}`));
    console.error('Haga stash o descarte el código de producción antes de comitear el test en rojo.');
    process.exit(1);
  }

  if (testFiles.length === 0) {
    console.error('❌ [TDD-FLOW: RED] No se detectaron archivos de pruebas modificados en git status.');
    process.exit(1);
  }

  const scope = inferScope(testFiles);
  console.log(`📦 Ámbito inferido: '${scope}' (${testFiles.length} archivo(s) de test).`);

  // Ejecutar runner correspondiente para comprobar fallo legítimo
  const hasTs = testFiles.some((f) => /\.(ts|js|mjs|cjs)$/.test(f));
  const hasPy = testFiles.some((f) => /\.py$/.test(f));

  if (hasTs) {
    const vitestMjs = path.join(ROOT_DIR, 'node_modules', 'vitest', 'vitest.mjs');
    const vitestBin = fs.existsSync(vitestMjs) ? vitestMjs : path.join(ROOT_DIR, 'node_modules', '.bin', 'vitest');
    if (fs.existsSync(vitestBin)) {
      console.log(`🧪 Ejecutando Vitest sobre [${testFiles.join(', ')}]...`);
      const res = spawnSync('node', [vitestBin, 'run', '--', ...testFiles], { cwd: ROOT_DIR, encoding: 'utf8' });
      const outcome = classifyTestResult(res.status, res.stdout, res.stderr);
      if (outcome.isFraud) {
        console.error(`❌ [FRAUDE TDD] El test ya pasa en verde (exit code 0). No se permite commit test(red).`);
        process.exit(1);
      }
      if (outcome.isSyntaxError || !outcome.isLegitimateRed) {
        console.error(`❌ [FALLO NO ASERTIVO / SINTAXIS] El test no falló por una aserción legítima: ${outcome.reason}`);
        process.exit(1);
      }
      console.log('✅ Fallo físico legítimo por aserción confirmado en TypeScript.');
    }
  }

  if (hasPy) {
    console.log(`🧪 Ejecutando Pytest sobre [${testFiles.join(', ')}]...`);
    const res = spawnSync('python', ['-m', 'pytest', '-q', '--', ...testFiles], { cwd: ROOT_DIR, encoding: 'utf8' });
    const outcome = classifyTestResult(res.status, res.stdout, res.stderr);
    if (outcome.isFraud) {
      console.error(`❌ [FRAUDE TDD] El test en Python ya pasa en verde (exit code 0).`);
      process.exit(1);
    }
    if (outcome.isSyntaxError || !outcome.isLegitimateRed) {
      console.error(`❌ [FALLO NO ASERTIVO / SINTAXIS] El test en Python no falló por una aserción legítima: ${outcome.reason}`);
      process.exit(1);
    }
    console.log('✅ Fallo físico legítimo por aserción confirmado en Python.');
  }

  const commitMsg = formatCommitMessage('red', scope, description);
  console.log(`\n📝 Mensaje de commit generado:\n${commitMsg}\n`);

  if (dryRun) {
    console.log('💡 [DRY-RUN] Simulación exitosa. No se crearon commits.');
    return 0;
  }

  runGit(['add', '--', ...testFiles]);
  runGit(['commit', '-m', commitMsg]);
  console.log(`✅ Commit test(red) creado exitosamente.`);
  return 0;
}

export function runGreenFlow(description, dryRun = false) {
  console.log('🔍 [TDD-FLOW: GREEN] Verificando pase de tests y cobertura de código...');
  const statusItems = getStatusFiles();
  const allFiles = statusItems.map((item) => item.file);
  const prodFiles = allFiles.filter(isProductionFile);
  const testFiles = allFiles.filter(isTestFile);

  const scope = inferScope(prodFiles.length > 0 ? prodFiles : testFiles);
  const activeChanges = Array.from(getActiveOpenSpecChanges());
  const changeId = activeChanges.length > 0 ? activeChanges[0] : null;

  if (!changeId) {
    console.error('❌ [SDD ERROR] No se detectó ningún OpenSpec Change activo en openspec/changes/.');
    console.error('Cree una propuesta con openspec new change "<id>" antes de implementar código.');
    process.exit(1);
  }

  console.log(`📦 Ámbito inferido: '${scope}' | OpenSpec Change: '${changeId}'`);

  const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // Ejecutar verificación de cobertura
  console.log('🧪 Ejecutando tests de TypeScript con cobertura...');
  const vitestRes = spawnSync(NPM_BIN, ['run', 'test:ts:coverage'], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (vitestRes.status !== 0) {
    console.error('❌ [GREEN FALLÓ] Los tests de TypeScript fallaron o no alcanzaron la cobertura mínima requerida.');
    process.exit(1);
  }

  console.log('🧪 Ejecutando tests de Python con cobertura...');
  const pyRes = spawnSync(NPM_BIN, ['run', 'test:py:coverage'], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (pyRes.status !== 0) {
    console.error('❌ [GREEN FALLÓ] Los tests de Python fallaron o no alcanzaron la cobertura mínima requerida.');
    process.exit(1);
  }

  const commitMsg = formatCommitMessage('green', scope, description, changeId);
  console.log(`\n📝 Mensaje de commit generado:\n${commitMsg}\n`);

  if (dryRun) {
    console.log('💡 [DRY-RUN] Simulación exitosa. No se crearon commits.');
    return 0;
  }

  runGit(['add', '-A']);
  runGit(['commit', '-m', commitMsg]);
  console.log(`✅ Commit feat(green) creado exitosamente.`);
  return 0;
}

export function runRefactorFlow(description, dryRun = false) {
  console.log('🔍 [TDD-FLOW: REFACTOR] Verificando preservación del estado verde tras refactorización...');
  const statusItems = getStatusFiles();
  const allFiles = statusItems.map((item) => item.file);
  const scope = inferScope(allFiles);

  const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('🧪 Ejecutando suite completa para asegurar 0 regresiones...');
  const vitestRes = spawnSync(NPM_BIN, ['run', 'test:ts'], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (vitestRes.status !== 0) {
    console.error('❌ [REFACTOR FALLÓ] La refactorización rompió pruebas en TypeScript.');
    process.exit(1);
  }

  const pyRes = spawnSync(NPM_BIN, ['run', 'test:py'], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (pyRes.status !== 0) {
    console.error('❌ [REFACTOR FALLÓ] La refactorización rompió pruebas en Python.');
    process.exit(1);
  }

  const commitMsg = formatCommitMessage('refactor', scope, description);
  console.log(`\n📝 Mensaje de commit generado:\n${commitMsg}\n`);

  if (dryRun) {
    console.log('💡 [DRY-RUN] Simulación exitosa. No se crearon commits.');
    return 0;
  }

  runGit(['add', '-A']);
  runGit(['commit', '-m', commitMsg]);
  console.log(`✅ Commit refactor creado exitosamente.`);
  return 0;
}

export function selfTest() {
  console.log('[SELF-TEST] Probando tdd-flow.mjs...');

  // 1. Formateo de commits
  const msgRed = formatCommitMessage('red', 'calculator', 'add division test');
  if (msgRed !== 'test(red)(calculator): add division test') {
    throw new Error(`Mensaje RED inválido: ${msgRed}`);
  }

  const msgGreen = formatCommitMessage('green', 'calculator', 'implement division', 'math-engine');
  if (!msgGreen.startsWith('feat(green)(calculator): implement division') || !msgGreen.includes('OpenSpec-Change: math-engine')) {
    throw new Error(`Mensaje GREEN inválido: ${msgGreen}`);
  }

  const msgRefactor = formatCommitMessage('refactor', 'calculator', 'clean up division operator');
  if (msgRefactor !== 'refactor(calculator): clean up division operator') {
    throw new Error(`Mensaje REFACTOR inválido: ${msgRefactor}`);
  }

  // 2. Inferencia de ámbitos
  const scopeA = inferScope(['tests/ts/unit/calculator.spec.ts']);
  if (scopeA !== 'calculator') {
    throw new Error(`Inferencia de ámbito errónea: esperada 'calculator', obtenida '${scopeA}'`);
  }

  const scopeB = inferScope(['src/billing/auth.ts']);
  if (scopeB !== 'billing/auth') {
    throw new Error(`Inferencia de ámbito errónea: esperada 'billing/auth', obtenida '${scopeB}'`);
  }

  console.log('[SELF-TEST] ✅ Todas las pruebas internas de tdd-flow pasaron con éxito.\n');
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    process.exit(selfTest());
  }

  const dryRun = args.includes('--dry-run');
  const cleanArgs = args.filter((a) => a !== '--dry-run');
  const command = cleanArgs[0];
  const description = cleanArgs.slice(1).join(' ') || 'tdd automated update';

  if (!command || !['red', 'green', 'refactor'].includes(command)) {
    console.error('Uso: node scripts/tdd-flow.mjs <red|green|refactor> "<descripción>" [--dry-run]');
    process.exit(1);
  }

  if (command === 'red') {
    process.exit(runRedFlow(description, dryRun));
  } else if (command === 'green') {
    process.exit(runGreenFlow(description, dryRun));
  } else if (command === 'refactor') {
    process.exit(runRefactorFlow(description, dryRun));
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
