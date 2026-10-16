#!/usr/bin/env node
/**
 * verify-policy-coherence.mjs - Coherencia entre la política de rutas y el RUNTIME real del proyecto.
 *
 * Causa raíz de la auditoría a95896c (F-01): la política de clasificación (scripts/path-policy.json)
 * es una convención declarada; el compilador (tsconfig) y los runners (vitest/pytest) ejecutan lo que
 * SU configuración dice. Si divergen, un archivo compilable puede colarse como "test".
 *
 * Esta verificación deriva invariantes de la configuración real y falla (fail-closed) si divergen:
 *   I1. Todo directorio que tsc compila (tsconfig.include / rootDir) es una raíz de producción.
 *   I2. Ningún directorio compilado es una raíz de test.
 *   I3. Todo directorio que ejecuta el runner (vitest.include, pytest testpaths) es una raíz de test.
 *   I4. Todo directorio medido por cobertura (vitest coverage.include, coverage.run.source, --cov=)
 *       es una raíz de producción.
 *   I5. Semántico: cualquier ruta bajo una raíz compilada es producción y JAMÁS test, aunque contenga
 *       segmentos 'tests/' o nombres de test; cualquier ruta bajo una raíz del runner es test.
 *
 * Uso: node scripts/verify-policy-coherence.mjs [--root <dir>] [--self-test]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PATH_POLICY, isProductionFile, isTestFile } from './verify-gates.mjs';

const PROD = new Set(PATH_POLICY.productionRoots);
const TESTS = new Set(PATH_POLICY.testRoots);

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null;
}

/** Raíz (primer segmento de directorio) de un glob; null si el glob no declara directorio. */
function globRoot(glob) {
  const cleaned = String(glob).trim().replace(/^\.\//, '').replace(/\\/g, '/');
  const first = cleaned.split('/')[0];
  if (!first || /[*?{}[\]]/.test(first) || !cleaned.includes('/')) return null;
  return first.toLowerCase();
}

function quotedItems(listBody) {
  return [...listBody.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

export function collectRuntimeRoots(rootDir) {
  const compiled = [];
  const runner = [];
  const measured = [];
  const sources = [];

  const tsconfigRaw = readIfExists(path.join(rootDir, 'tsconfig.json'));
  if (tsconfigRaw) {
    const ts = JSON.parse(tsconfigRaw);
    const patterns = [...(ts.include || []), ...(ts.compilerOptions?.rootDir ? [`${ts.compilerOptions.rootDir}/`] : [])];
    for (const g of patterns) compiled.push({ root: globRoot(g.endsWith('/') ? `${g}x` : g), from: `tsconfig.json: ${g}` });
    sources.push('tsconfig.json');
  }

  const vitestRaw = readIfExists(path.join(rootDir, 'vitest.config.ts'));
  if (vitestRaw) {
    for (const m of vitestRaw.matchAll(/\binclude\s*:\s*\[([^\]]*)\]/g)) {
      for (const g of quotedItems(m[1])) {
        const bucket = /(^|\/)src\//.test(g) || g.startsWith('src') ? measured : runner;
        bucket.push({ root: globRoot(g), from: `vitest.config.ts: ${g}` });
      }
    }
    sources.push('vitest.config.ts');
  }

  const pyRaw = readIfExists(path.join(rootDir, 'pyproject.toml'));
  if (pyRaw) {
    const tp = pyRaw.match(/testpaths\s*=\s*\[([^\]]*)\]/);
    if (tp) for (const p of quotedItems(tp[1])) runner.push({ root: globRoot(`${p}/x`), from: `pyproject.toml testpaths: ${p}` });
    const src = pyRaw.match(/\[tool\.coverage\.run\][^[]*?source\s*=\s*\[([^\]]*)\]/s);
    if (src) for (const p of quotedItems(src[1])) measured.push({ root: globRoot(`${p}/x`), from: `pyproject.toml coverage.source: ${p}` });
    sources.push('pyproject.toml');
  }

  const pkgRaw = readIfExists(path.join(rootDir, 'package.json'));
  if (pkgRaw) {
    const scripts = Object.values(JSON.parse(pkgRaw).scripts || {}).join('\n');
    for (const m of scripts.matchAll(/--cov=([\w./-]+)/g)) measured.push({ root: globRoot(`${m[1]}/x`), from: `package.json --cov=${m[1]}` });
    sources.push('package.json');
  }

  return { compiled, runner, measured, sources };
}

export function checkPolicyCoherence(rootDir = process.cwd()) {
  const errors = [];
  const { compiled, runner, measured, sources } = collectRuntimeRoots(rootDir);

  if (compiled.length === 0) errors.push('No se pudo derivar ninguna raíz compilada (tsconfig.json include/rootDir ausente): imposible verificar la política (fail-closed).');
  if (runner.length === 0) errors.push('No se pudo derivar ninguna raíz de runner de tests (vitest include / pytest testpaths ausente) (fail-closed).');

  for (const { root, from } of compiled) {
    if (!root) { errors.push(`I1: ${from} no declara un directorio raíz explícito (glob demasiado amplio).`); continue; }
    if (!PROD.has(root)) errors.push(`I1: ${from} compila '${root}/', que NO es una raíz de producción en path-policy.json (productionRoots=${[...PROD].join(',')}).`);
    if (TESTS.has(root)) errors.push(`I2: ${from} compila '${root}/', que es una raíz de test: código de test llegaría a dist/.`);
    const probes = [`${root}/__probe__/tests/x.ts`, `${root}/__probe__/test_x.py`, `${root}/__probe__/x.spec.ts`, `${root}/tests/x.ts`];
    for (const probe of probes) {
      if (isTestFile(probe)) errors.push(`I5: '${probe}' (bajo raíz compilada '${root}/') se clasifica como TEST.`);
      if (!isProductionFile(probe)) errors.push(`I5: '${probe}' (bajo raíz compilada '${root}/') NO se clasifica como PRODUCCIÓN.`);
    }
  }
  for (const { root, from } of runner) {
    if (!root) { errors.push(`I3: ${from} no declara un directorio raíz explícito.`); continue; }
    if (!TESTS.has(root)) errors.push(`I3: ${from} ejecuta tests desde '${root}/', que NO es una raíz de test en path-policy.json (testRoots=${[...TESTS].join(',')}).`);
    if (!isTestFile(`${root}/__probe__/src/x.ts`)) errors.push(`I5: '${root}/__probe__/src/x.ts' (bajo raíz del runner) NO se clasifica como TEST.`);
  }
  for (const { root, from } of measured) {
    if (!root) { errors.push(`I4: ${from} no declara un directorio raíz explícito.`); continue; }
    if (!PROD.has(root)) errors.push(`I4: ${from} mide cobertura sobre '${root}/', que NO es una raíz de producción en path-policy.json.`);
  }
  return { errors, sources, compiled, runner, measured };
}

function writeFixtureProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-coherence-'));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body, 'utf-8');
  return dir;
}

export function selfTest() {
  console.log('[POLICY-COHERENCE-SELF-TEST] Verificando coherencia política↔runtime...');
  const ok = {
    'tsconfig.json': JSON.stringify({ compilerOptions: { rootDir: './src' }, include: ['src/**/*'] }),
    'vitest.config.ts': "export default { test: { include: ['tests/ts/**/*.{test,spec}.ts'], coverage: { include: ['src/**/*.ts'] } } };",
    'pyproject.toml': '[tool.pytest.ini_options]\ntestpaths = ["tests"]\n[tool.coverage.run]\nsource = ["src"]\n',
    'package.json': JSON.stringify({ scripts: { cov: 'pytest --cov=src' } }),
  };
  const cases = [
    ['coherente', ok, null],
    ['tsc compila tests/', { ...ok, 'tsconfig.json': JSON.stringify({ include: ['src/**/*', 'tests/**/*'] }) }, /I1|I2/],
    ['tsc compila una raíz no declarada (lib2/)', { ...ok, 'tsconfig.json': JSON.stringify({ include: ['lib2/**/*'] }) }, /I1/],
    ['glob sin raíz explícita', { ...ok, 'tsconfig.json': JSON.stringify({ include: ['**/*.ts'] }) }, /I1/],
    ['runner ejecuta desde src/', { ...ok, 'vitest.config.ts': "export default { test: { include: ['specs/**/*.spec.ts'] } };" }, /I3/],
    ['pytest testpaths fuera de testRoots', { ...ok, 'pyproject.toml': '[tool.pytest.ini_options]\ntestpaths = ["checks"]\n' }, /I3/],
    ['cobertura sobre un directorio no producción', { ...ok, 'package.json': JSON.stringify({ scripts: { cov: 'pytest --cov=scripts' } }) }, /I4/],
    ['sin tsconfig (fail-closed)', { 'package.json': ok['package.json'] }, /fail-closed/],
  ];
  for (const [name, files, expected] of cases) {
    const dir = writeFixtureProject(files);
    try {
      const { errors } = checkPolicyCoherence(dir);
      if (expected === null && errors.length > 0) throw new Error(`'${name}' debía ser coherente: ${errors.join(' | ')}`);
      if (expected !== null && !errors.some((e) => expected.test(e))) throw new Error(`'${name}' debía ser rechazado (${expected}); errores: ${errors.join(' | ') || 'ninguno'}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log('[POLICY-COHERENCE-SELF-TEST] ✅ Detecta divergencia entre política y configuración del runtime.');
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    process.exit(0);
  }
  const rootIdx = process.argv.indexOf('--root');
  const rootDir = path.resolve(rootIdx !== -1 ? process.argv[rootIdx + 1] : process.cwd());
  const { errors, sources, compiled, runner, measured } = checkPolicyCoherence(rootDir);
  console.log(`[POLICY-COHERENCE] Fuentes de runtime: ${sources.join(', ')}`);
  console.log(`[POLICY-COHERENCE] Raíces compiladas=${[...new Set(compiled.map((c) => c.root))]} | runner=${[...new Set(runner.map((c) => c.root))]} | cobertura=${[...new Set(measured.map((c) => c.root))]}`);
  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  ❌ ${e}`));
    console.error('\n❌ La política de rutas diverge de la configuración real del runtime (fail-closed).');
    process.exit(1);
  }
  console.log('[POLICY-COHERENCE] ✅ La política de rutas es coherente con tsconfig, vitest, pytest y cobertura.');
  process.exit(0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) main();
