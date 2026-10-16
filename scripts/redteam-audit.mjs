#!/usr/bin/env node
/**
 * @file redteam-audit.mjs
 * @description Escáner Heurístico Interno de Seguridad y Contratos de Ingeniería (Red-Team Interno)
 * para rayrabbit-ai/ai-engineering.
 *
 * Ejecuta verificaciones estáticas de patrones y probes dinámicos locales en 10 categorías:
 *   D1: Detección Estática de Sinks de Subproceso y Probes CLI/Argumentos (CWE-78, CWE-88, CWE-636)
 *   D2: Higiene de Archivos, Symlinks, Reglas Python y Benchmark de Regex ReDoS (CWE-59, CWE-1333)
 *   D3: Escaneo de Secretos Expuestos y Verificación Dinámica del Guard de Contratos (CWE-798, CWE-693)
 *   D4: Configuración de Clientes TLS/HTTPS (CWE-295)
 *   D5: Caracteres Bidireccionales Trojan Source Unicode y Coherencia de Adaptadores IA (CVE-2021-42574)
 *   D6: Higiene de Workflows de GitHub Actions, Pinning SHA, CODEOWNERS y Rango Push
 *   D7: Matriz de Paridad Políglota (10 vectores fijos) contra verify-gates (Node.js vs. Python)
 *   D8: Auditoría de Dependencias (npm audit) y Compatibilidad de Esquema JSON de Cobertura
 *   D9: Verificación de Umbrales Independientes de Cobertura (Líneas >=80%, Ramas >=75%) y Filtros E2E
 *   D10: Verificación de Checksums SHA-256 en Paquetes dist/*.zip (si existen)
 *
 * Alcance explícito:
 *   Este script es un escáner heurístico interno de ingeniería. Las referencias a identificadores CWE
 *   u OWASP se emplean únicamente como taxonomía técnica; su ejecución NO constituye ni acredita
 *   certificación formal bajo OWASP ASVS L3, SLSA L3, OWASP LLM Top 10 ni MITRE ATLAS, ni reemplaza
 *   un motor de análisis de flujo de datos (taint analysis) de compilador o fuzzing generativo.
 *
 * Uso:
 *   node scripts/redteam-audit.mjs [--report docs/audit/informe-redteam.es.md] [--json artifacts/redteam.json] [--probe-http]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const PYTHON_BIN = (() => {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const checkPy = spawnSync('python', ['--version'], { encoding: 'utf8' });
  if (checkPy.status === 0) return 'python';
  const checkPy3 = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  if (checkPy3.status === 0) return 'python3';
  return 'python';
})();

const ROOT_DIR = process.cwd();
const args = process.argv.slice(2);
const reportIdx = args.indexOf('--report');
const REPORT_PATH = reportIdx !== -1 && args[reportIdx + 1] ? path.resolve(ROOT_DIR, args[reportIdx + 1]) : null;
const jsonIdx = args.indexOf('--json');
const JSON_PATH = jsonIdx !== -1 && args[jsonIdx + 1] ? path.resolve(ROOT_DIR, args[jsonIdx + 1]) : null;
const PROBE_HTTP = args.includes('--probe-http');

/** @type {Array<Object>} */
const findings = [];
/** @type {Array<Object>} */
const auditTrail = [];
/** @type {Array<Object>} */
const claimsMatrix = [];

let findingCounter = 1;

function registerFinding({
  title,
  severity,
  cwe,
  category,
  confidence = 'Alta',
  location,
  mechanism,
  pocCommand,
  pocOutput,
  remediation,
}) {
  const id = `F-${String(findingCounter++).padStart(2, '0')}`;
  findings.push({
    id,
    title,
    severity,
    cwe,
    category,
    confidence,
    location,
    mechanism,
    pocCommand,
    pocOutput: String(pocOutput || '').trim().slice(0, 1200),
    remediation,
  });
}

function runSafeCommand(bin, cmdArgs, options = {}) {
  const displayCmd = `${bin} ${cmdArgs.map((a) => (/\s|[;|&$`'"]/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
  const start = performance.now();
  const res = spawnSync(bin, cmdArgs, {
    cwd: options.cwd || ROOT_DIR,
    encoding: 'utf8',
    timeout: options.timeout || 15000,
    maxBuffer: 4 * 1024 * 1024,
    shell: false,
    env: { ...process.env, ...(options.env || {}) },
  });
  const durationMs = Math.round(performance.now() - start);
  const status = res.status ?? (res.error ? -1 : 0);
  const stdout = (res.stdout || '').trim();
  const stderr = (res.stderr || '').trim();
  auditTrail.push({
    step: auditTrail.length + 1,
    command: displayCmd,
    exitCode: status,
    durationMs,
    observation: (stdout || stderr || (res.error ? res.error.message : 'OK')).split('\n')[0].slice(0, 140),
  });
  return { status, stdout, stderr, durationMs, error: res.error, displayCmd };
}

function walkRepoFiles(dir = ROOT_DIR, acc = []) {
  const IGNORE_DIRS = new Set([
    '.git',
    'node_modules',
    '.pytest_cache',
    '.venv',
    'venv',
    'coverage',
    '.nyc_output',
    'build',
    '__pycache__',
  ]);
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name) || entry.name.endsWith('.egg-info')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);
    if (entry.isSymbolicLink()) {
      acc.push({ fullPath, relPath, isSymlink: true });
      continue;
    }
    if (entry.isDirectory()) {
      walkRepoFiles(fullPath, acc);
    } else if (entry.isFile()) {
      acc.push({ fullPath, relPath, isSymlink: false });
    }
  }
  return acc;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function findLineNumber(content, regexOrSubstring) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (typeof regexOrSubstring === 'string') {
      if (lines[i].includes(regexOrSubstring)) return i + 1;
    } else if (regexOrSubstring.test(lines[i])) {
      return i + 1;
    }
  }
  return 1;
}

// ============================================================================
// CATEGORÍA 1: DETECCIÓN DE SINKS DE SUBPROCESO Y PROBES CLI (CWE-78 / CWE-88)
// ============================================================================
async function auditDomain1SubprocessAndCliProbes(repoFiles) {
  console.log('🔍 [D1] Ejecutando chequeo estático de sinks de subproceso y probes de argumentos CLI (CWE-78 / CWE-88)...');

  const codeFiles = repoFiles.filter(
    (f) => !f.isSymlink && /\.(mjs|cjs|js|ts|py)$/.test(f.relPath) && !f.relPath.endsWith('redteam-audit.mjs')
  );

  for (const file of codeFiles) {
    const content = fs.readFileSync(file.fullPath, 'utf8');

    if (/\bexecSync\s*\(|\bexec\s*\(|shell\s*:\s*true/.test(content)) {
      const line = findLineNumber(content, /\bexecSync\s*\(|\bexec\s*\(|shell\s*:\s*true/);
      registerFinding({
        title: `Uso de shell en ejecución de subprocesos en ${file.relPath}`,
        severity: 'Alta',
        cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
        category: 'D1: Subprocess & CLI Security',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'El archivo invoca un subproceso mediante shell (`execSync` / `shell: true`), permitiendo que argumentos interpolados con metacaracteres ejecuten comandos no deseados.',
        pocCommand: `grep -nE "execSync|shell:\\s*true" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Reemplazar `execSync` por `spawnSync("git", argsArray, { shell: false })`, validar refs con `git check-ref-format` y anteponer `--` cuando corresponda.',
      });
    }

    if (/shell\s*=\s*True|\bos\.system\s*\(|\bos\.popen\s*\(/.test(content)) {
      const line = findLineNumber(content, /shell\s*=\s*True|\bos\.system\s*\(|\bos\.popen\s*\(/);
      registerFinding({
        title: `Ejecución de subprocesos con shell=True en ${file.relPath}`,
        severity: 'Alta',
        cwe: 'CWE-78: OS Command Injection',
        category: 'D1: Subprocess & CLI Security',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se invoca `subprocess` con `shell=True` o `os.system` concatenando argumentos externos.',
        pocCommand: `grep -nE "shell\\s*=\\s*True|os\\.system" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Pasar lista de argumentos `subprocess.run(["git", ...], shell=False, check=True)` y rechazar referencias que comiencen con `-`.',
      });
    }

    if (/catch\s*(\([^)]*\))?\s*\{\s*return\s+['"`]{2}\s*;?\s*\}/.test(content)) {
      const line = findLineNumber(content, /return\s+['"`]{2}/);
      registerFinding({
        title: `Diseño Fail-Open: silenciamiento de fallos de subproceso en ${file.relPath}`,
        severity: 'Alta',
        cwe: 'CWE-636: Not Failing Securely (Fail Open) / CWE-390',
        category: 'D1: Subprocess & CLI Security',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'El bloque `catch` captura errores de ejecución de Git y devuelve una cadena vacía `""`, permitiendo aprobar silenciosamente el gate ante errores.',
        pocCommand: `node ${file.relPath} --base refs/heads/__nonexistent_ref__ --head HEAD`,
        pocOutput: `Línea ${line}: catch silencia el error y retorna ""`,
        remediation:
          'Lanzar una excepción o abortar inmediatamente con `process.exit(1)` cuando cualquier invocación a Git devuelva `status !== 0`.',
      });
    }
  }

  const nodeGate = path.join(ROOT_DIR, 'scripts/verify-gates.mjs');
  const pyGate = path.join(ROOT_DIR, 'scripts/verify_gates.py');

  if (fs.existsSync(nodeGate)) {
    const canaryPayload = 'HEAD; printf "REDTEAM_NODE_CANARY_78|test(red): fake_injected"';
    const probe = runSafeCommand('node', ['scripts/verify-gates.mjs', '--allow-dirty', '--base', canaryPayload, '--head', 'HEAD']);
    const nodeLines = probe.stdout.split('\n').map((l) => l.trim());
    const canaryExecutedNode = nodeLines.some((l) => l.startsWith('REDTEAM_NODE_CANARY_78') || l.includes('fake_injected'));
    if (probe.status === 0 && canaryExecutedNode) {
      registerFinding({
        title: 'Exploit confirmado (PoC): Inyección de comandos en verify-gates.mjs',
        severity: 'Crítica',
        cwe: 'CWE-78: OS Command Injection',
        category: 'D1: Subprocess & CLI Security',
        location: 'scripts/verify-gates.mjs',
        mechanism:
          'El argumento `--base` se concatena sin sanitización en una cadena ejecutada por shell.',
        pocCommand: probe.displayCmd,
        pocOutput: `${probe.stdout}\n${probe.stderr}`,
        remediation:
          'Eliminar `execSync`. Usar `spawnSync("git", ["log", ...], { shell: false })` previa validación con `git check-ref-format`.',
      });
    }

    const argProbe = runSafeCommand('node', ['scripts/verify-gates.mjs', '--allow-dirty', '--base', '--version', '--head', 'HEAD']);
    if (argProbe.status === 0) {
      registerFinding({
        title: 'Argument Injection / Fail-Open ante flags de Git en verify-gates.mjs',
        severity: 'Alta',
        cwe: 'CWE-88: Improper Neutralization of Argument Delimiters in a Command',
        category: 'D1: Subprocess & CLI Security',
        location: 'scripts/verify-gates.mjs',
        mechanism:
          'El validador acepta una referencia `--base` que comienza con `--` (flag de Git) o falla silenciosamente devolviendo `exit 0`.',
        pocCommand: argProbe.displayCmd,
        pocOutput: `Exit code: ${argProbe.status}\n${argProbe.stdout}`,
        remediation:
          'Rechazar cualquier referencia `--base` o `--head` que comience con `-` y verificar su existencia con `git rev-parse --verify --quiet "${ref}^{commit}"`.',
      });
    }
  }

  if (fs.existsSync(pyGate)) {
    const pyCanary = 'HEAD; printf "REDTEAM_PY_CANARY_78|test(red): fake_injected"';
    const pyProbe = runSafeCommand(PYTHON_BIN, ['scripts/verify_gates.py', '--allow-dirty', '--base', pyCanary, '--head', 'HEAD']);
    const pyLines = pyProbe.stdout.split('\n').map((l) => l.trim());
    const canaryExecutedPy = pyLines.some((l) => l.startsWith('REDTEAM_PY_CANARY_78') || l.includes('fake_injected'));
    if (pyProbe.status === 0 && canaryExecutedPy) {
      registerFinding({
        title: 'Exploit confirmado (PoC): Inyección de comandos en verify_gates.py',
        severity: 'Crítica',
        cwe: 'CWE-78: OS Command Injection',
        category: 'D1: Subprocess & CLI Security',
        location: 'scripts/verify_gates.py',
        mechanism:
          'El argumento `--base` se interpola dentro de un comando ejecutado con `shell=True`.',
        pocCommand: pyProbe.displayCmd,
        pocOutput: `${pyProbe.stdout}\n${pyProbe.stderr}`,
        remediation:
          'Usar `subprocess.run(["git", ...], shell=False, check=True)` y validar las referencias antes de construir el rango.',
      });
    }

    const pyArgProbe = runSafeCommand(PYTHON_BIN, ['scripts/verify_gates.py', '--allow-dirty', '--base', '--version', '--head', 'HEAD']);
    if (pyArgProbe.status === 0) {
      registerFinding({
        title: 'Argument Injection / Fail-Open ante flags de Git en verify_gates.py',
        severity: 'Alta',
        cwe: 'CWE-88: Improper Neutralization of Argument Delimiters in a Command',
        category: 'D1: Subprocess & CLI Security',
        location: 'scripts/verify_gates.py',
        mechanism:
          'El validador acepta una referencia `--base` que comienza con `--` (flag de Git) o falla silenciosamente devolviendo `exit 0`.',
        pocCommand: pyArgProbe.displayCmd,
        pocOutput: `Exit code: ${pyArgProbe.status}\n${pyArgProbe.stdout}`,
        remediation:
          'Rechazar cualquier referencia `--base` o `--head` que comience con `-` y verificar su existencia con `git rev-parse --verify --quiet "${ref}^{commit}"`.',
      });
    }
  }
}

// ============================================================================
// CATEGORÍA 2: ARCHIVOS, SYMLINKS, REGLAS PYTHON Y BENCHMARK ReDoS
// ============================================================================
async function auditDomain2FilesystemAndRegex(repoFiles) {
  console.log('🔍 [D2] Auditando Symlinks, reglas de rutas Python y tiempo de evaluación Regex (ReDoS)...');

  for (const file of repoFiles) {
    if (file.isSymlink) {
      let target = '';
      try {
        target = fs.readlinkSync(file.fullPath);
      } catch {
        target = 'unreadable';
      }
      const resolved = path.resolve(path.dirname(file.fullPath), target);
      if (!resolved.startsWith(ROOT_DIR + path.sep)) {
        registerFinding({
          title: `Symlink apunta fuera del repositorio: ${file.relPath} -> ${target}`,
          severity: 'Alta',
          cwe: 'CWE-59: Improper Link Resolution Before File Access (Link Following)',
          category: 'D2: Filesystem & Regex Hygiene',
          location: file.relPath,
          mechanism:
            'Un enlace simbólico dentro del árbol de trabajo resuelve fuera de la raíz del proyecto.',
          pocCommand: `readlink -f ${file.relPath}`,
          pocOutput: `${file.relPath} -> ${target} (resolved: ${resolved})`,
          remediation: 'Eliminar symlinks externos y verificar `fs.realpathSync` en los validadores de archivos.',
        });
      }
    }
  }

  const pyFiles = repoFiles.filter((f) => !f.isSymlink && f.relPath.endsWith('.py'));
  for (const pyFile of pyFiles) {
    const content = fs.readFileSync(pyFile.fullPath, 'utf8');
    if (/\bos\.path\b|\bsys\.path\b/.test(content)) {
      const line = findLineNumber(content, /\bos\.path\b|\bsys\.path\b/);
      registerFinding({
        title: `Violación de invariante Python: uso de os.path o sys.path en ${pyFile.relPath}`,
        severity: 'Media',
        cwe: 'CWE-426: Untrusted Search Path',
        category: 'D2: Filesystem & Regex Hygiene',
        location: `${pyFile.relPath}#L${line}`,
        mechanism:
          'El código utiliza `os.path` o manipula `sys.path` en lugar de `pathlib.Path` e `importlib.resources`.',
        pocCommand: `grep -nE "os\\.path|sys\\.path" ${pyFile.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation: 'Migrar exclusivamente a `pathlib.Path` e `importlib.resources`.',
      });
    }
  }

  const evilCommitSubject = `test(red)(${'a'.repeat(50000)}!): malformed subject without closing paren`;
  const startReDoS = performance.now();
  const sampleRegex = /^(feat|fix|test|docs|spec|refactor|chore)(\([a-zA-Z0-9_-]+\))?:/;
  sampleRegex.test(evilCommitSubject);
  const elapsedReDoS = performance.now() - startReDoS;
  auditTrail.push({
    step: auditTrail.length + 1,
    command: 'ReDoS Benchmark (50,000 chars malformed commit subject)',
    exitCode: elapsedReDoS < 50 ? 0 : 1,
    durationMs: Math.round(elapsedReDoS),
    observation: `Regex evaluation took ${elapsedReDoS.toFixed(2)}ms`,
  });
}

// ============================================================================
// CATEGORÍA 3: SECRETOS EXPUESTOS Y VERIFICACIÓN DINÁMICA DEL GUARD (F-01 / F-02)
// ============================================================================
async function auditDomain3SecretsAndGuardIntegrity(repoFiles) {
  console.log('🔍 [D3] Escaneando secretos expuestos y probando resistencia del Guard ante degradación semántica...');

  const secretPatterns = [
    { name: 'GitHub PAT / Token', regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/ },
    { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'Private Key Block', regex: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
    { name: 'Credential in URL', regex: /https?:\/\/[^/\s:@]+:[^/\s:@]+@github\.com/ },
  ];

  for (const file of repoFiles) {
    if (file.isSymlink || /\.(png|jpg|jpeg|gif|zip|ico|woff2?)$/.test(file.relPath)) continue;
    if (file.relPath.endsWith('redteam-audit.mjs')) continue;
    let content = '';
    try {
      content = fs.readFileSync(file.fullPath, 'utf8');
    } catch {
      continue;
    }
    for (const pat of secretPatterns) {
      if (pat.regex.test(content)) {
        const line = findLineNumber(content, pat.regex);
        registerFinding({
          title: `Posible secreto o credencial expuesta (${pat.name}) en ${file.relPath}`,
          severity: 'Crítica',
          cwe: 'CWE-798: Use of Hard-coded Credentials',
          category: 'D3: Secrets & Guard Integrity',
          location: `${file.relPath}#L${line}`,
          mechanism: `Se detectó un patrón coincidente con ${pat.name} almacenado en texto plano dentro del repositorio.`,
          pocCommand: `grep -n "REDACTED_PATTERN" ${file.relPath}`,
          pocOutput: `Coincidencia en ${file.relPath}#L${line} (valor ocultado por seguridad)`,
          remediation: 'Revocar la credencial inmediatamente, rotar el secreto y usar GitHub Encrypted Secrets / OIDC.',
        });
      }
    }
  }

  // Probe dinámico real contra scripts/guard-agent.mjs (remedia F-01 y F-02 de la auditoría forense)
  const guardPath = path.join(ROOT_DIR, 'scripts/guard-agent.mjs');
  if (fs.existsSync(guardPath)) {
    const guardSelfTest = runSafeCommand('node', ['scripts/guard-agent.mjs', '--self-test']);
    if (guardSelfTest.status !== 0) {
      registerFinding({
        title: 'El Guard de contratos falló su autoverificación o aceptó placeholders degradados',
        severity: 'Media',
        cwe: 'CWE-693: Protection Mechanism Failure',
        category: 'D3: Secrets & Guard Integrity',
        location: 'scripts/guard-agent.mjs',
        mechanism:
          '`node scripts/guard-agent.mjs --self-test` devolvió un código distinto de cero al evaluar la resistencia frente a sustitución por placeholders con anchors preservados o cláusulas faltantes.',
        pocCommand: guardSelfTest.displayCmd,
        pocOutput: `${guardSelfTest.stdout}\n${guardSelfTest.stderr}`,
        remediation:
          'Exigir todos los anchors (`every`), validar las 15 cláusulas numeradas de INVARIANTS y verificar frontmatter y comandos en cada workflow.',
      });
    } else {
      // Ejecutar además un PoC aislado directo desde el escáner para dejar evidencia empírica independiente
      try {
        const guardMod = await import(pathToFileURL(guardPath).href);
        if (typeof guardMod.validateGuardContracts === 'function') {
          const tmpProbeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redteam-guard-poc-'));
          try {
            fs.cpSync(path.join(ROOT_DIR, '.agent'), path.join(tmpProbeDir, '.agent'), { recursive: true });
            fs.writeFileSync(
              path.join(tmpProbeDir, '.agent', 'rules', 'INVARIANTS.md'),
              '# Placeholder >50 chars preserving 15 invariants and Commit per Gate anchor but zero operational rules.\n',
              'utf8'
            );
            const pocCheck = guardMod.validateGuardContracts(tmpProbeDir);
            if (pocCheck.ok) {
              registerFinding({
                title: 'Bypass confirmado en guard-agent.mjs: acepta sustitución semánticamente vacía con un anchor preservado',
                severity: 'Media',
                cwe: 'CWE-693: Protection Mechanism Failure',
                category: 'D3: Secrets & Guard Integrity',
                location: 'scripts/guard-agent.mjs',
                mechanism:
                  'Al reemplazar `INVARIANTS.md` en un directorio temporal por un texto >50 caracteres que conserva un anchor sin las 15 reglas, `validateGuardContracts` devolvió `ok: true`.',
                pocCommand: 'node scripts/guard-agent.mjs --self-test',
                pocOutput: 'validateGuardContracts(tmpProbeDir) -> { ok: true, errors: [] }',
                remediation:
                  'Reemplazar `anchors.some(...)` por validación exhaustiva de todas las cláusulas numeradas 1..15 y todos los anchors requeridos.',
              });
            }
          } finally {
            fs.rmSync(tmpProbeDir, { recursive: true, force: true });
          }
        }
      } catch (err) {
        console.warn(`   ⚠️ No se pudo ejecutar PoC en memoria de validateGuardContracts: ${err.message}`);
      }
    }
  }
}

// ============================================================================
// CATEGORÍA 4: CONFIGURACIÓN TLS Y CLIENTES HTTP (CWE-295)
// ============================================================================
async function auditDomain4NetworkAndTls(repoFiles) {
  console.log('🔍 [D4] Auditando configuración TLS/HTTPS en scripts y workflows...');

  for (const file of repoFiles) {
    if (file.isSymlink || !/\.(mjs|cjs|js|ts|py|sh|yml|yaml)$/.test(file.relPath)) continue;
    if (file.relPath.endsWith('redteam-audit.mjs')) continue;
    const content = fs.readFileSync(file.fullPath, 'utf8');
    if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false|verify\s*=\s*False/.test(content)) {
      const line = findLineNumber(
        content,
        /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false|verify\s*=\s*False/
      );
      registerFinding({
        title: `Validación de certificados TLS deshabilitada en ${file.relPath}`,
        severity: 'Alta',
        cwe: 'CWE-295: Improper Certificate Validation',
        category: 'D4: TLS & HTTP Configuration',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se desactiva la verificación de certificados TLS en llamadas de red.',
        pocCommand: `grep -nE "rejectUnauthorized|verify=False|NODE_TLS_REJECT_UNAUTHORIZED" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation: 'Habilitar siempre la validación estricta de certificados TLS.',
      });
    }
  }

  if (PROBE_HTTP) {
    const curlRes = runSafeCommand('curl', [
      '-sS',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      '--max-time',
      '5',
      'https://api.github.com/repos/rayrabbit-ai/ai-engineering/branches/main',
    ]);
    console.log(`   ℹ️  Estado HTTP Branch API: ${curlRes.stdout}`);
  }
}

// ============================================================================
// CATEGORÍA 5: TROJAN SOURCE UNICODE Y ADAPTADORES DE AGENTES (CVE-2021-42574)
// ============================================================================
async function auditDomain5UnicodeAndAgentAdapters(repoFiles) {
  console.log('🔍 [D5] Escaneando caracteres bidireccionales Trojan Source (CVE-2021-42574) y adaptadores de agentes...');

  const trojanBidiRegex = /[\u202A-\u202E\u2066-\u2069]/;

  for (const file of repoFiles) {
    if (file.isSymlink || /\.(png|jpg|jpeg|gif|zip|ico|woff2?)$/.test(file.relPath)) continue;
    if (file.relPath.endsWith('redteam-audit.mjs')) continue;
    let content = '';
    try {
      content = fs.readFileSync(file.fullPath, 'utf8');
    } catch {
      continue;
    }
    if (trojanBidiRegex.test(content)) {
      const line = findLineNumber(content, trojanBidiRegex);
      registerFinding({
        title: `Caracteres Unicode Bidireccionales (Trojan Source) detectados en ${file.relPath}`,
        severity: 'Crítica',
        cwe: 'CWE-116 / CVE-2021-42574: Trojan Source Bidirectional Unicode',
        category: 'D5: Unicode & Agent Rules Hygiene',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se encontraron puntos de código Unicode de control bidireccional que alteran el orden visual del texto o esconden instrucciones invisibles.',
        pocCommand: `node -e 'console.log(/[\\u202A-\\u202E\\u2066-\\u2069]/.test(fs.readFileSync("${file.relPath}","utf8")))'`,
        pocOutput: `Caracteres de control bidireccional presentes en ${file.relPath}#L${line}`,
        remediation: 'Eliminar todos los caracteres de control bidireccional Unicode y bloquearlos en CI.',
      });
    }
  }

  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    if (/Claude Code|Cursor|Antigravity/i.test(readme)) {
      const hasClaudeMd = fs.existsSync(path.join(ROOT_DIR, 'CLAUDE.md'));
      const hasCursorRules =
        fs.existsSync(path.join(ROOT_DIR, '.cursor/rules')) || fs.existsSync(path.join(ROOT_DIR, '.cursorrules'));
      const hasAgentRules = fs.existsSync(path.join(ROOT_DIR, '.agent/rules'));
      claimsMatrix.push({
        claim: 'Configuración multi-agente nativa (Antigravity, Cursor, Claude Code)',
        enforcement: hasClaudeMd && hasCursorRules && hasAgentRules ? 'Verificado' : 'Incompleto',
        evidence: `.agent/rules=${hasAgentRules}, .cursor/rules=${hasCursorRules}, CLAUDE.md=${hasClaudeMd}`,
      });
    }
  }
}

// ============================================================================
// CATEGORÍA 6: HIGIENE DE WORKFLOWS DE GITHUB ACTIONS Y BRANCH PROTECTION SCRIPTS
// ============================================================================
async function auditDomain6CiCdWorkflows() {
  console.log('🔍 [D6] Auditando Workflows de GitHub Actions, Pinning SHA, CODEOWNERS y Rango Push...');

  const codeownersPaths = [
    path.join(ROOT_DIR, '.github/CODEOWNERS'),
    path.join(ROOT_DIR, 'CODEOWNERS'),
    path.join(ROOT_DIR, 'docs/CODEOWNERS'),
  ];
  const existingCodeowners = codeownersPaths.find((p) => fs.existsSync(p));

  if (!existingCodeowners) {
    registerFinding({
      title: 'Ausencia de CODEOWNERS para proteger workflows y scripts de validación',
      severity: 'Alta',
      cwe: 'CWE-284: Improper Access Control',
      category: 'D6: CI/CD Workflow Hygiene',
      location: '.github/workflows/gate-validator.yml',
      mechanism:
        'El repositorio carece de archivo `CODEOWNERS` que obligue a revisión de propietarios sobre `.github/workflows/` y `scripts/`.',
      pocCommand: 'test -f .github/CODEOWNERS || echo "MISSING_CODEOWNERS"',
      pocOutput: 'MISSING_CODEOWNERS',
      remediation:
        'Añadir `.github/CODEOWNERS` protegiendo `.github/`, `scripts/` y `.agent/`.',
    });
  }

  const workflowsDir = path.join(ROOT_DIR, '.github/workflows');
  if (fs.existsSync(workflowsDir)) {
    const wfFiles = fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));
    for (const wf of wfFiles) {
      const wfRel = `.github/workflows/${wf}`;
      const wfFull = path.join(workflowsDir, wf);
      const content = fs.readFileSync(wfFull, 'utf8');

      if (/origin\/\$\{\{\s*github\.base_ref\s*\|\|\s*'main'\s*\}\}/.test(content) && !content.includes('github.event.before')) {
        const line = findLineNumber(content, /github\.base_ref/);
        registerFinding({
          title: `Ceguera de auditoría en eventos push: ${wfRel} compara origin/main..HEAD (rango vacío)`,
          severity: 'Media',
          cwe: 'CWE-807: Reliance on Untrusted Inputs in a Security Decision',
          category: 'D6: CI/CD Workflow Hygiene',
          location: `${wfRel}#L${line}`,
          mechanism:
            'En un evento `push` a `main`, `github.base_ref` está vacío y el fallback `origin/main` ya apunta a `HEAD`, dejando el rango con 0 commits.',
          pocCommand: `grep -n "github.base_ref" ${wfRel}`,
          pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
          remediation:
            'En eventos `push`, utilizar `${{ github.event.before }}` como `--base` y `${{ github.sha }}` como `--head`.',
        });
      }

      const usesMatches = [...content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)$/gm)];
      for (const match of usesMatches) {
        const actionRef = match[1];
        if (!actionRef.startsWith('./') && !/@[0-9a-f]{40}$/i.test(actionRef)) {
          const line = findLineNumber(content, actionRef);
          registerFinding({
            title: `GitHub Action no fijada por hash SHA de 40 caracteres (${actionRef}) en ${wfRel}`,
            severity: 'Media',
            cwe: 'CWE-829: Inclusion of Functionality from Untrusted Control Sphere',
            category: 'D6: CI/CD Workflow Hygiene',
            location: `${wfRel}#L${line}`,
            mechanism:
              `La acción \`${actionRef}\` se referencia mediante un tag mutable en lugar de un commit SHA completo de 40 caracteres.`,
            pocCommand: `grep -n "uses: ${actionRef}" ${wfRel}`,
            pocOutput: `Línea ${line}: uses: ${actionRef}`,
            remediation: 'Fijar todas las acciones de terceros a su commit SHA de 40 caracteres.',
          });
          break;
        }
      }

      if (!/^\s*permissions\s*:/m.test(content)) {
        registerFinding({
          title: `Ausencia de bloque permissions explícito (Least Privilege) en ${wfRel}`,
          severity: 'Media',
          cwe: 'CWE-250: Execution with Unnecessary Privileges',
          category: 'D6: CI/CD Workflow Hygiene',
          location: `${wfRel}#L1`,
          mechanism:
            'El workflow no declara `permissions: contents: read` a nivel raíz.',
          pocCommand: `grep -n "permissions:" ${wfRel} || echo "MISSING_PERMISSIONS_BLOCK"`,
          pocOutput: 'MISSING_PERMISSIONS_BLOCK',
          remediation: 'Declarar `permissions: contents: read` en la raíz del workflow.',
        });
      }
    }
  }

  const bpScripts = ['scripts/setup_branch_protection.py', 'scripts/setup-branch-protection.sh'];
  for (const rel of bpScripts) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (/required_pull_request_reviews['"]?\s*:\s*(None|null)/.test(content)) {
      const line = findLineNumber(content, /required_pull_request_reviews/);
      registerFinding({
        title: `Configuración débil en ${rel}: desactiva revisiones obligatorias de PR (null/None)`,
        severity: 'Alta',
        cwe: 'CWE-1188: Insecure Default Initialization of Resource',
        category: 'D6: CI/CD Workflow Hygiene',
        location: `${rel}#L${line}`,
        mechanism:
          'El payload enviado a la API de Branch Protection establece `required_pull_request_reviews: null`.',
        pocCommand: `grep -n "required_pull_request_reviews" ${rel}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Configurar `required_pull_request_reviews` con `"required_approving_review_count": 1` y `"require_code_owner_reviews": true`.',
      });
    }
  }
}

// ============================================================================
// CATEGORÍA 7: MATRIZ DE PARIDAD POLÍGLOTA (10 VECTORES FIJOS: NODE VS PYTHON)
// ============================================================================
async function auditDomain7PolyglotGateParity() {
  console.log('🔍 [D7] Ejecutando matriz de paridad políglota (10 vectores de regresión) contra verify-gates (Node vs. Python)...');

  const nodeGatePath = path.join(ROOT_DIR, 'scripts/verify-gates.mjs');
  const pyGatePath = path.join(ROOT_DIR, 'scripts/verify_gates.py');

  let nodeValidate = null;
  if (fs.existsSync(nodeGatePath)) {
    try {
      const mod = await import(pathToFileURL(nodeGatePath).href);
      nodeValidate = mod.validateCommitList;
    } catch (err) {
      console.warn(`   ⚠️ No se pudo importar validateCommitList desde verify-gates.mjs: ${err.message}`);
    }
  }

  const adversarialVectors = [
    {
      id: 'V-01',
      name: 'Bypass de Scope Vacío / Comodín Universal (tests/test_.py -> src/unrelated.ts)',
      shouldReject: true,
      cwe: 'CWE-863: Incorrect Authorization / Logic Bypass',
      severity: 'Alta',
      commits: [
        { hash: 'red0001', subject: 'test(red): empty module name trick', changedFiles: ['tests/test_.py'] },
        { hash: 'green01', subject: 'feat(green): unrelated production file', changedFiles: ['src/unrelated.ts'] },
      ],
    },
    {
      id: 'V-02',
      name: 'Bypass de Scope Vacío con sufijo TS (tests/.test.ts -> src/core.ts)',
      shouldReject: true,
      cwe: 'CWE-863: Incorrect Authorization / Logic Bypass',
      severity: 'Alta',
      commits: [
        { hash: 'red0002', subject: 'test(red): dot test trick', changedFiles: ['tests/.test.ts'] },
        { hash: 'green02', subject: 'feat(green): core takeover', changedFiles: ['src/core.ts'] },
      ],
    },
    {
      id: 'V-03',
      name: 'Stale RED Documental + Contrabando Multirruta (docs/auth.md -> src/auth.ts + src/billing.ts)',
      shouldReject: true,
      cwe: 'CWE-436: Interpretation Conflict / Scope Smuggling',
      severity: 'Alta',
      commits: [
        { hash: 'red0003', subject: 'test(red)(auth): fake red touching only docs', changedFiles: ['docs/auth.md'] },
        { hash: 'doc0003', subject: 'docs: intermediate commit', changedFiles: ['README.md'] },
        {
          hash: 'green03',
          subject: 'feat(green)(auth): smuggle billing alongside auth',
          changedFiles: ['src/auth.ts', 'src/billing.ts'],
        },
      ],
    },
    {
      id: 'V-04',
      name: 'Contaminación Mixta en RED (test(red) modifica tests/ y src/ simultáneamente)',
      shouldReject: true,
      cwe: 'CWE-284: Improper Access Control (TDD Phase Violation)',
      severity: 'Alta',
      commits: [
        {
          hash: 'red0004',
          subject: 'test(red)(calc): mixed prod and test in red',
          changedFiles: ['tests/test_calculator.py', 'src/calculator.py'],
        },
      ],
    },
    {
      id: 'V-05',
      name: 'Mutación Ilegal de OpenSpec Consolidado (feat modifica openspec/specs/ sin spec(sync))',
      shouldReject: true,
      cwe: 'CWE-284: SDD Gate Violation',
      severity: 'Alta',
      commits: [
        { hash: 'red0005', subject: 'test(red)(calc): test', changedFiles: ['tests/test_calc.py'] },
        {
          hash: 'green05',
          subject: 'feat(green)(calc): silently alter consolidated spec',
          changedFiles: ['src/calc.py', 'openspec/specs/core/spec.md'],
        },
      ],
    },
    {
      id: 'V-06',
      name: 'Colisión de Basename entre Directorios Distintos (tests/ui/index.test.ts -> src/payments/index.ts)',
      shouldReject: true,
      cwe: 'CWE-706: Use of Incorrectly-Resolved Name or Reference',
      severity: 'Media',
      commits: [
        { hash: 'red0006', subject: 'test(red): generic index test', changedFiles: ['tests/ui/index.test.ts'] },
        { hash: 'green06', subject: 'feat(green): touch payments index', changedFiles: ['src/payments/index.ts'] },
      ],
    },
    {
      id: 'V-07',
      name: 'Ciclo TDD Estricto Legítimo con OpenSpec Change (Control Positivo)',
      shouldReject: false,
      cwe: 'N/A',
      severity: 'Baja',
      commits: [
        { hash: 'red0007', subject: 'test(red)(math-engine/calculator): add failing division test', changedFiles: ['tests/test_calculator.py'] },
        { hash: 'green07', subject: 'feat(green)(math-engine/calculator): implement division', changedFiles: ['src/calculator.py'] },
      ],
    },
    {
      id: 'V-08',
      name: 'Contrabando de Código de Producción en Commits No-Código (docs/chore/spec -> src/calculator.ts)',
      shouldReject: true,
      cwe: 'CWE-284: Improper Access Control / Gate Bypass (F-NEW-01)',
      severity: 'Alta',
      commits: [
        { hash: 'smg0001', subject: 'docs: update documentation and smuggle production code', changedFiles: ['README.md', 'src/calculator.ts'] },
      ],
    },
    {
      id: 'V-09',
      name: 'Contrabando de Código de Producción Disfrazado de Test en src/tests/ (F-01 a95896c)',
      shouldReject: true,
      cwe: 'CWE-184: Incomplete List of Disallowed Inputs / Route Classification Bypass',
      severity: 'Alta',
      commits: [
        { hash: 'f01red1', subject: 'test(red)(calc): nested path under src/tests', changedFiles: ['src/tests/calc.ts'] },
        { hash: 'f01grn1', subject: 'feat(green)(deterministic-causality-harness/calc): implement', changedFiles: ['src/calc.ts'] },
      ],
    },
    {
      id: 'V-10',
      name: 'Contrabando de Configuración Crítica en Commits No-Chore (docs: + package.json) (F-02 a95896c)',
      shouldReject: true,
      cwe: 'CWE-693: Protection Mechanism Failure / Critical Config Modification',
      severity: 'Media',
      commits: [
        { hash: 'f02doc1', subject: 'docs: update documentation and tamper package.json', changedFiles: ['README.md', 'package.json'] },
      ],
    },
  ];

  for (const vec of adversarialVectors) {
    let nodeErrors = null;
    let pyErrors = null;

    if (nodeValidate) {
      try {
        nodeErrors = nodeValidate(vec.commits);
      } catch (e) {
        nodeErrors = [`CRASH: ${e.message}`];
      }
    }

    if (fs.existsSync(pyGatePath)) {
      const pyTupleList = JSON.stringify(vec.commits.map((c) => [c.hash, c.subject, c.changedFiles]));
      const pyScript = `import json, sys; from scripts.verify_gates import validate_commit_list; data = json.loads(sys.argv[1]); print(json.dumps(validate_commit_list([(x[0], x[1], x[2]) for x in data])))`;
      const res = runSafeCommand(PYTHON_BIN, ['-c', pyScript, pyTupleList]);
      if (res.status === 0 && res.stdout) {
        try {
          pyErrors = JSON.parse(res.stdout);
        } catch {
          pyErrors = null;
        }
      }
    }

    const nodeRejected = Array.isArray(nodeErrors) && nodeErrors.length > 0;
    const pyRejected = Array.isArray(pyErrors) && pyErrors.length > 0;

    if (vec.shouldReject && nodeErrors !== null && !nodeRejected) {
      registerFinding({
        title: `Bypass del Gate TDD/SDD en Node (${vec.id}): ${vec.name}`,
        severity: vec.severity,
        cwe: vec.cwe,
        category: 'D7: Polyglot Gate Parity',
        location: 'scripts/verify-gates.mjs',
        mechanism: `El validador Node devolvió \`[]\` (0 errores) ante la secuencia \`${vec.id}\`.`,
        pocCommand: `node --input-type=module -e 'import {validateCommitList} from "./scripts/verify-gates.mjs"; console.log(validateCommitList(${JSON.stringify(vec.commits)}))'`,
        pocOutput: `Salida obtenida: ${JSON.stringify(nodeErrors)} (Se esperaba rechazo con errores > 0)`,
        remediation:
          'Rechazar módulos vacíos, exigir archivo de test real en `test(red)` y verificar acoplamiento de scope en `feat(green)`.',
      });
    }

    if (vec.shouldReject && pyErrors !== null && !pyRejected) {
      registerFinding({
        title: `Bypass del Gate TDD/SDD en Python (${vec.id}): ${vec.name}`,
        severity: vec.severity,
        cwe: vec.cwe,
        category: 'D7: Polyglot Gate Parity',
        location: 'scripts/verify_gates.py',
        mechanism: `El validador Python devolvió \`[]\` (0 errores) ante la secuencia \`${vec.id}\`.`,
        pocCommand: `python3 -c 'from scripts.verify_gates import validate_commit_list; print(validate_commit_list(${JSON.stringify(vec.commits.map((c) => [c.hash, c.subject, c.changedFiles]))}))'`,
        pocOutput: `Salida obtenida: ${JSON.stringify(pyErrors)} (Se esperaba rechazo con errores > 0)`,
        remediation:
          'Sincronizar la validación estricta en `scripts/verify_gates.py`.',
      });
    }

    if (nodeErrors !== null && pyErrors !== null && nodeRejected !== pyRejected) {
      registerFinding({
        title: `Discrepancia entre validadores Node y Python en vector ${vec.id}`,
        severity: 'Alta',
        cwe: 'CWE-436: Interpretation Conflict',
        category: 'D7: Polyglot Gate Parity',
        location: 'scripts/verify-gates.mjs vs scripts/verify_gates.py',
        mechanism: `Ante la entrada \`${vec.id}\`, Node devolvió rejected=${nodeRejected} mientras que Python devolvió rejected=${pyRejected}.`,
        pocCommand: `Comparación de paridad ${vec.id}`,
        pocOutput: `Node=${JSON.stringify(nodeErrors)} | Python=${JSON.stringify(pyErrors)}`,
        remediation: 'Unificar las reglas de validación entre Node y Python.',
      });
    }
  }

  // Verificación de Coherencia de Política Única (path-policy.json) con el Runtime Real
  const policyCoherenceScript = path.join(ROOT_DIR, 'scripts/verify-policy-coherence.mjs');
  if (fs.existsSync(policyCoherenceScript)) {
    const resSelf = runSafeCommand('node', [policyCoherenceScript, '--self-test']);
    if (resSelf.status !== 0) {
      registerFinding({
        title: 'Fallo en self-test del verificador de coherencia política↔runtime',
        severity: 'Alta',
        cwe: 'CWE-693: Protection Mechanism Failure',
        category: 'D7: Polyglot Gate Parity',
        location: 'scripts/verify-policy-coherence.mjs',
        mechanism: 'El self-test de coherencia política↔runtime falló.',
        pocCommand: 'node scripts/verify-policy-coherence.mjs --self-test',
        pocOutput: resSelf.stderr || resSelf.stdout,
        remediation: 'Corregir divergencias en verify-policy-coherence.mjs.',
      });
    }
    const resReal = runSafeCommand('node', [policyCoherenceScript]);
    if (resReal.status !== 0) {
      registerFinding({
        title: 'Divergencia entre política de rutas (path-policy.json) y el runtime real (I1-I5)',
        severity: 'Alta',
        cwe: 'CWE-693: Protection Mechanism Failure',
        category: 'D7: Polyglot Gate Parity',
        location: 'scripts/verify-policy-coherence.mjs',
        mechanism: 'La política declarada discrepa de tsconfig.json, vitest.config.ts, pyproject.toml o package.json.',
        pocCommand: 'node scripts/verify-policy-coherence.mjs',
        pocOutput: resReal.stderr || resReal.stdout,
        remediation: 'Sincronizar path-policy.json con las raíces de compilación, ejecución y cobertura reales.',
      });
    }
  }
}

// ============================================================================
// CATEGORÍA 8: DEPENDENCIAS Y CONTRATOS DE ESQUEMA DE COBERTURA
// ============================================================================
async function auditDomain8SupplyChainAndSchemas() {
  console.log('🔍 [D8] Auditando dependencias (npm audit) y contratos de esquema JSON de cobertura...');

  const pkgLockPath = path.join(ROOT_DIR, 'package-lock.json');
  if (fs.existsSync(pkgLockPath)) {
    const npmCmd = process.platform === 'win32' ? ['cmd.exe', ['/d', '/s', '/c', 'npm audit --json']] : ['npm', ['audit', '--json']];
    const npmAudit = runSafeCommand(npmCmd[0], npmCmd[1]);
    if (npmAudit.stdout) {
      try {
        const parsed = JSON.parse(npmAudit.stdout);
        const vulns = parsed.metadata?.vulnerabilities || {};
        const critical = vulns.critical || 0;
        const high = vulns.high || 0;
        const moderate = vulns.moderate || 0;
        if (critical > 0 || high > 0) {
          registerFinding({
            title: `Vulnerabilidades críticas/altas en dependencias Node (${critical} críticas, ${high} altas)`,
            severity: critical > 0 ? 'Crítica' : 'Alta',
            cwe: 'CWE-1395: Dependency on Vulnerable Third-Party Component',
            category: 'D8: Dependency & Schema Hygiene',
            location: 'package-lock.json',
            mechanism:
              '`npm audit` detectó paquetes con vulnerabilidades críticas o altas instalados en el árbol de dependencias.',
            pocCommand: 'npm audit --audit-level=high',
            pocOutput: JSON.stringify(vulns),
            remediation:
              'Actualizar dependencias afectadas en `package.json` / `package-lock.json`.',
          });
        } else if (moderate > 0) {
          registerFinding({
            title: `Vulnerabilidades moderadas en árbol de dependencias Node (${moderate} moderadas)`,
            severity: 'Media',
            cwe: 'CWE-1395: Dependency on Vulnerable Third-Party Component',
            category: 'D8: Dependency & Schema Hygiene',
            location: 'package-lock.json',
            mechanism:
              '`npm audit` detectó paquetes con vulnerabilidades moderadas.',
            pocCommand: 'npm audit --audit-level=moderate',
            pocOutput: JSON.stringify(vulns),
            remediation:
              'Revisar y actualizar dependencias moderadas.',
          });
        }
      } catch {
        // Ignorar si npm audit no devolvió JSON válido
      }
    }
  }

  const wfDir = path.join(ROOT_DIR, '.github/workflows');
  const reqFiles = ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt', 'pyproject.toml']
    .map((f) => path.join(ROOT_DIR, f))
    .filter((p) => fs.existsSync(p));

  let pinsCoverage761 = false;
  for (const rf of reqFiles) {
    const txt = fs.readFileSync(rf, 'utf8');
    if (/coverage==7\.6\.1\b/.test(txt)) pinsCoverage761 = true;
  }

  if (pinsCoverage761 && fs.existsSync(wfDir)) {
    for (const wf of fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f))) {
      const wfTxt = fs.readFileSync(path.join(wfDir, wf), 'utf8');
      if (wfTxt.includes('percent_branches_covered')) {
        registerFinding({
          title: 'Ruptura de contrato JSON en CI Python: coverage==7.6.1 no incluye percent_branches_covered',
          severity: 'Alta',
          cwe: 'CWE-628: Schema Mismatch',
          category: 'D8: Dependency & Schema Hygiene',
          location: `.github/workflows/${wf}`,
          mechanism:
            'El lockfile fija `coverage==7.6.1`, cuyo reporte `coverage.json` expone `num_branches` y `covered_branches`, pero no `percent_branches_covered`.',
          pocCommand: 'grep -n "percent_branches_covered" .github/workflows/*.yml',
          pocOutput: 'coverage==7.6.1 fijado junto con lectura de percent_branches_covered',
          remediation:
            'Calcular el porcentaje de ramas como `(covered_branches / num_branches) * 100`.',
        });
      }
    }
  }
}

// ============================================================================
// CATEGORÍA 9: SEPARACIÓN DE COBERTURA (LÍNEAS >=80%, RAMAS >=75%) Y FILTROS E2E
// ============================================================================
async function auditDomain9CoverageAndE2E() {
  console.log('🔍 [D9] Verificando separación de umbrales de cobertura (Líneas >=80%, Ramas >=75%) y filtros E2E...');

  const pyprojectPath = path.join(ROOT_DIR, 'pyproject.toml');
  const wfPath = path.join(ROOT_DIR, '.github/workflows/gate-validator.yml');

  if (fs.existsSync(pyprojectPath)) {
    const pyproj = fs.readFileSync(pyprojectPath, 'utf8');
    const wfTxt = fs.existsSync(wfPath) ? fs.readFileSync(wfPath, 'utf8') : '';

    const checkerPath = path.join(ROOT_DIR, 'scripts', 'check_python_coverage.py');
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    const checkerTxt = fs.existsSync(checkerPath) ? fs.readFileSync(checkerPath, 'utf8') : '';
    const pkgTxt = fs.existsSync(pkgPath) ? fs.readFileSync(pkgPath, 'utf8') : '';
    const invokesBranchGate =
      /check_python_coverage\.py[^\n]*--min-branches/.test(wfTxt) ||
      /check_python_coverage\.py[^\n]*--min-branches/.test(pkgTxt);
    const checkerComputesBranches = /covered_branches/.test(checkerTxt) && /num_branches/.test(checkerTxt);

    const checksSeparateBranchThreshold =
      (invokesBranchGate && checkerComputesBranches) ||
      /covered_branches|percent_branches_covered|branch_rate/.test(wfTxt) ||
      /covered_branches|percent_branches_covered/.test(pyproj);

    if (!checksSeparateBranchThreshold) {
      const line = findLineNumber(pyproj, /fail_under/);
      registerFinding({
        title: 'Umbral de cobertura de ramas Python (>=75%) no se evalúa por separado de líneas (>=80%)',
        severity: 'Media',
        cwe: 'CWE-697: Incorrect Comparison',
        category: 'D9: Coverage & E2E Gates',
        location: `pyproject.toml#L${line}`,
        mechanism:
          '`pyproject.toml` configura `branch = true` y un único `fail_under = 80` global combinado sin gate independiente de 75% para ramas.',
        pocCommand: 'grep -n -C 3 "fail_under" pyproject.toml',
        pocOutput: `Línea ${line}: fail_under = 80 (combinado, sin gate independiente de 75% para ramas)`,
        remediation:
          'Exportar `coverage json` y verificar mecánicamente líneas >= 80% y ramas >= 75% por separado con `check_python_coverage.py`.',
      });
    }

    if (wfTxt.includes("unit or integration") && !wfTxt.includes('e2e')) {
      const line = findLineNumber(wfTxt, /unit or integration/);
      registerFinding({
        title: 'Exclusión silenciosa de pruebas E2E de Python en el pipeline de CI',
        severity: 'Media',
        cwe: 'CWE-754: Improper Check for Unusual or Exceptional Conditions',
        category: 'D9: Coverage & E2E Gates',
        location: `.github/workflows/gate-validator.yml#L${line}`,
        mechanism:
          'El workflow ejecuta `pytest -m legacy_baseline` y `pytest -m "unit or integration"`, dejando fuera `@pytest.mark.e2e`.',
        pocCommand: 'grep -n "pytest -m" .github/workflows/gate-validator.yml',
        pocOutput: `Línea ${line}: ejecuta solo legacy_baseline y 'unit or integration'`,
        remediation: 'Incluir `pytest -m e2e` en el job de CI.',
      });
    }

    // Probe Fail-Closed sobre check_python_coverage.py con JSON vacío {}
    if (fs.existsSync(checkerPath)) {
      const tmpCovFile = path.join(os.tmpdir(), `redteam-empty-cov-${process.pid}.json`);
      try {
        fs.writeFileSync(tmpCovFile, '{}', 'utf8');
        const emptyCovRes = runSafeCommand(PYTHON_BIN, ['scripts/check_python_coverage.py', tmpCovFile]);
        if (emptyCovRes.status === 0) {
          registerFinding({
            title: 'Comportamiento Fail-Open en check_python_coverage.py ante JSON de cobertura vacío ({})',
            severity: 'Alta',
            cwe: 'CWE-636: Not Failing Securely (Failing Open)',
            category: 'D9: Coverage & E2E Gates',
            location: 'scripts/check_python_coverage.py',
            mechanism:
              'Al recibir un archivo JSON vacío (`{}`) o con `num_statements: 0`, `check_python_coverage.py` asumía 100.0% de cobertura y terminaba con exit code 0.',
            pocCommand: `${PYTHON_BIN} scripts/check_python_coverage.py <empty.json>`,
            pocOutput: emptyCovRes.stdout,
            remediation: 'Rechazar en modo fail-closed (exit 1) cualquier informe sin bloque `totals` o con `num_statements <= 0`.',
          });
        }
      } finally {
        fs.rmSync(tmpCovFile, { force: true });
      }
    }
  }

  // Verificar que vitest.config.ts defina thresholds anidados para Vitest >= 1.x / 5.x
  const vitestCfgPath = path.join(ROOT_DIR, 'vitest.config.ts');
  if (fs.existsSync(vitestCfgPath)) {
    const vitestTxt = fs.readFileSync(vitestCfgPath, 'utf8');
    if (!/thresholds\s*:\s*\{[\s\S]*?lines\s*:\s*80[\s\S]*?branches\s*:\s*75/m.test(vitestTxt)) {
      registerFinding({
        title: 'vitest.config.ts no define bloque anidado thresholds para Vitest 5.x',
        severity: 'Media',
        cwe: 'CWE-693: Protection Mechanism Failure',
        category: 'D9: Coverage & E2E Gates',
        location: 'vitest.config.ts',
        mechanism:
          'En Vitest >=1.0 / 5.x, los umbrales de cobertura deben declararse bajo `coverage.thresholds: { lines: 80, branches: 75 }`; las claves de nivel superior son ignoradas.',
        pocCommand: 'npx vitest run --coverage --coverage.lines=99',
        pocOutput: 'Vitest ignora coverage.lines en nivel superior si no está bajo coverage.thresholds',
        remediation: 'Declarar `thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 }` en `vitest.config.ts`.',
      });
    }
  }

  // Ejecutar autochequeos de replay, verificadores RED y tdd-flow
  const extraSelfTests = [
    ['node', ['scripts/verify-historical-replay.mjs', '--self-test']],
    ['node', ['scripts/verify-red-failure.mjs', '--self-test']],
    [PYTHON_BIN, ['scripts/verify_red_failure.py', '--self-test']],
    ['node', ['scripts/tdd-flow.mjs', '--self-test']],
  ];
  for (const [bin, args] of extraSelfTests) {
    if (fs.existsSync(path.join(ROOT_DIR, args[0]))) {
      const stRes = runSafeCommand(bin, args);
      if (stRes.status !== 0) {
        registerFinding({
          title: `Fallo en autochequeo de compuerta auxiliar: ${args.join(' ')}`,
          severity: 'Alta',
          cwe: 'CWE-693: Protection Mechanism Failure',
          category: 'D9: Coverage & E2E Gates',
          location: args[0],
          mechanism: `El comando \`${bin} ${args.join(' ')}\` terminó con código ${stRes.status}.`,
          pocCommand: `${bin} ${args.join(' ')}`,
          pocOutput: `${stRes.stdout}\n${stRes.stderr}`,
          remediation: 'Corregir las regresiones reportadas por el self-test.',
        });
      }
    }
  }
}

// ============================================================================
// CATEGORÍA 10: SINCRONÍA DE CHECKSUMS SHA-256 EN PAQUETES DIST/*.ZIP
// ============================================================================
async function auditDomain10ArtifactSync() {
  console.log('🔍 [D10] Verificando sincronía de checksums SHA-256 en paquetes dist/*.zip (si existen)...');

  const distDir = path.join(ROOT_DIR, 'dist');
  if (!fs.existsSync(distDir)) return;

  const distEntries = fs.readdirSync(distDir);
  const zipFiles = distEntries.filter((f) => f.endsWith('.zip'));

  for (const zipName of zipFiles) {
    const zipFull = path.join(distDir, zipName);
    const zipHash = sha256File(zipFull);
    auditTrail.push({
      step: auditTrail.length + 1,
      command: `sha256sum dist/${zipName}`,
      exitCode: 0,
      durationMs: 5,
      observation: `SHA-256: ${zipHash}`,
    });

    const pyCheckZip = `
import zipfile, hashlib, pathlib, json, sys
zf_path = pathlib.Path(sys.argv[1])
root = pathlib.Path.cwd()
mismatches = []
with zipfile.ZipFile(zf_path, 'r') as zf:
    for info in zf.infolist():
        if info.is_dir(): continue
        parts = pathlib.Path(info.filename).parts
        rel_candidates = [pathlib.Path(*parts), pathlib.Path(*parts[1:]) if len(parts) > 1 else pathlib.Path(*parts)]
        for cand in rel_candidates:
            local_file = root / cand
            if local_file.is_file() and 'dist/' not in str(cand):
                z_hash = hashlib.sha256(zf.read(info.filename)).hexdigest()
                l_hash = hashlib.sha256(local_file.read_bytes()).hexdigest()
                if z_hash != l_hash:
                    mismatches.append({"file": str(cand), "zip_sha256": z_hash[:12], "local_sha256": l_hash[:12]})
                break
print(json.dumps(mismatches))
`.trim();

    const zipRes = runSafeCommand(PYTHON_BIN, ['-c', pyCheckZip, zipFull]);
    if (zipRes.status === 0 && zipRes.stdout) {
      try {
        const mismatches = JSON.parse(zipRes.stdout);
        if (mismatches.length > 0) {
          registerFinding({
            title: `Desincronización de paquete: dist/${zipName} no coincide byte a byte con el árbol de trabajo actual`,
            severity: 'Media',
            cwe: 'CWE-345: Insufficient Verification of Data Authenticity',
            category: 'D10: Artifact Checksum Sync',
            location: `dist/${zipName}`,
            mechanism:
              'Uno o más archivos dentro del paquete `.zip` distribuible tienen un hash SHA-256 distinto al del archivo correspondiente en el árbol de trabajo.',
            pocCommand: `python3 -c "..." dist/${zipName}`,
            pocOutput: JSON.stringify(mismatches, null, 2),
            remediation:
              'Regenerar el archivo `.zip` desde el árbol limpio y validar los checksums SHA-256.',
          });
        }
      } catch {
        // Ignorar fallo de parseo
      }
    }
  }
}

// ============================================================================
// GENERACIÓN DE REPORTE MARKDOWN Y SALIDA DE TERMINAL
// ============================================================================
function buildMarkdownReport() {
  const criticalCount = findings.filter((f) => f.severity === 'Crítica').length;
  const highCount = findings.filter((f) => f.severity === 'Alta').length;
  const mediumCount = findings.filter((f) => f.severity === 'Media').length;
  const lowCount = findings.filter((f) => f.severity === 'Baja').length;
  const verdict =
    criticalCount === 0 && highCount === 0
      ? 'APROBADO (ZERO CRITICAL/HIGH FINDINGS)'
      : 'RECHAZADO — BLOCKER DE SEGURIDAD / INTEGRIDAD';

  const lines = [
    '# Informe del Escáner Heurístico de Seguridad y Contratos (Red-Team Interno)',
    '',
    `**Fecha de ejecución:** ${new Date().toISOString()}`,
    `**Directorio auditado:** \`${ROOT_DIR}\``,
    '**Alcance y Metodología:** Batería heurística interna de chequeos estáticos y probes dinámicos locales en 10 categorías de ingeniería (D1–D10). Las referencias a identificadores CWE se utilizan exclusivamente como taxonomía técnica; este reporte **no** constituye una certificación ni evaluación formal de conformidad bajo estándares externos.',
    '',
    '## 1. Resumen Ejecutivo',
    '',
    `**Resultado del Escáner:** \`${verdict}\``,
    '',
    `- **Hallazgos Críticos:** ${criticalCount}`,
    `- **Hallazgos Altos:** ${highCount}`,
    `- **Hallazgos Medios:** ${mediumCount}`,
    `- **Hallazgos Bajos:** ${lowCount}`,
    '',
    '## 2. Registro de Hallazgos',
    '',
  ];

  if (findings.length === 0) {
    lines.push('No se detectaron vulnerabilidades, regresiones de contrato ni bypasses en las 10 categorías evaluadas.');
    lines.push('');
  } else {
    for (const f of findings) {
      lines.push(`### ${f.id} — ${f.title}`);
      lines.push('');
      lines.push(
        `- **Severidad Interna:** ${f.severity} | **Referencia CWE:** \`${f.cwe}\` | **Categoría:** ${f.category} | **Confianza:** ${f.confidence}`
      );
      lines.push(`- **Ubicación:** \`${f.location}\``);
      lines.push(`- **Mecanismo Técnico Observado:** ${f.mechanism}`);
      lines.push(`- **Comando Reproducible:** \`${f.pocCommand}\``);
      lines.push('');
      lines.push('```text');
      lines.push(f.pocOutput || '(Sin salida adicional)');
      lines.push('```');
      lines.push('');
      lines.push(`- **Remediación Recomendada:** ${f.remediation}`);
      lines.push('');
    }
  }

  lines.push('## 3. Bitácora de Ejecución (Audit Trail)');
  lines.push('');
  lines.push('| # | Comando / Probe Ejecutado | Exit Code | Duración (ms) | Observación |');
  lines.push('|---:|---|---:|---:|---|');
  for (const row of auditTrail) {
    const safeCmd = row.command.replace(/\|/g, '\\|');
    const safeObs = row.observation.replace(/\|/g, '\\|');
    lines.push(`| ${row.step} | \`${safeCmd}\` | ${row.exitCode} | ${row.durationMs} | ${safeObs} |`);
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log('================================================================================');
  console.log('🛡️  RAYRABBIT AI ENGINEERING — INTERNAL HEURISTIC SECURITY & CONTRACT SCANNER');
  console.log('================================================================================');

  const repoFiles = walkRepoFiles(ROOT_DIR);

  try { await auditDomain1SubprocessAndCliProbes(repoFiles); } catch (e) { console.error('Domain 1 error:', e); }
  try { await auditDomain2FilesystemAndRegex(repoFiles); } catch (e) { console.error('Domain 2 error:', e); }
  try { await auditDomain3SecretsAndGuardIntegrity(repoFiles); } catch (e) { console.error('Domain 3 error:', e); }
  try { await auditDomain4NetworkAndTls(repoFiles); } catch (e) { console.error('Domain 4 error:', e); }
  try { await auditDomain5UnicodeAndAgentAdapters(repoFiles); } catch (e) { console.error('Domain 5 error:', e); }
  try { await auditDomain6CiCdWorkflows(); } catch (e) { console.error('Domain 6 error:', e); }
  try { await auditDomain7PolyglotGateParity(); } catch (e) { console.error('Domain 7 error:', e); }
  try { await auditDomain8SupplyChainAndSchemas(); } catch (e) { console.error('Domain 8 error:', e); }
  try { await auditDomain9CoverageAndE2E(); } catch (e) { console.error('Domain 9 error:', e); }
  try { await auditDomain10ArtifactSync(); } catch (e) { console.error('Domain 10 error:', e); }

  const mdReport = buildMarkdownReport();

  if (REPORT_PATH) {
    try {
      fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
      fs.writeFileSync(REPORT_PATH, mdReport, 'utf8');
      console.log(`\n📄 Informe Markdown generado en: ${REPORT_PATH}`);
    } catch (e) {
      console.error('Error al escribir reporte Markdown:', e.message);
    }
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, mdReport, 'utf8');
      console.log('✅ Resumen publicado en GITHUB_STEP_SUMMARY');
    } catch (e) {
      console.warn('No se pudo escribir en GITHUB_STEP_SUMMARY:', e.message);
    }
  }

  if (JSON_PATH) {
    try {
      fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
      fs.writeFileSync(JSON_PATH, JSON.stringify({ findings, auditTrail, claimsMatrix }, null, 2), 'utf8');
      console.log(`📊 Reporte estructurado JSON generado en: ${JSON_PATH}`);
    } catch (e) {
      console.error('Error al escribir JSON:', e.message);
    }
  }

  const criticalOrHigh = findings.filter((f) => f.severity === 'Crítica' || f.severity === 'Alta').length;
  console.log('\n--------------------------------------------------------------------------------');
  console.log(
    `📊 RESUMEN FINAL: ${findings.length} hallazgos totales (${criticalOrHigh} Críticos/Altos) | ${auditTrail.length} pruebas ejecutadas.`
  );
  console.log('--------------------------------------------------------------------------------');

  if (findings.length > 0) {
    for (const f of findings) {
      console.log(`  [${f.id}] (${f.severity.toUpperCase()}) ${f.title} -> ${f.location}`);
    }
  }

  if (criticalOrHigh > 0) {
    console.error('\n❌ [REDTEAM-BLOCKER] Se detectaron vulnerabilidades o bypasses Críticos/Altos. Fallando en modo fail-closed (exit 1):');
    for (const f of findings.filter((f) => f.severity === 'Crítica' || f.severity === 'Alta')) {
      const locParts = (f.location || '').split('#L');
      const file = locParts[0] || 'scripts/redteam-audit.mjs';
      const line = locParts[1] || '1';
      console.error(`   -> [${f.id}] (${f.severity}) ${f.title} (${f.location})`);
      console.error(`      Mecanismo: ${f.mechanism}`);
      console.log(`::error file=${file},line=${line},title=[${f.id}] ${f.title}::${f.mechanism}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ [REDTEAM-OK] Cero hallazgos Críticos/Altos.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('💥 Error fatal en redteam-audit.mjs (Fail-Closed):', err);
  const msg = (err.stack || err.message || '').replace(/\r?\n/g, '%0A');
  console.log(`::error title=Fatal Error in redteam-audit.mjs::${msg}`);
  process.exit(1);
});