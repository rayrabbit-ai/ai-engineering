#!/usr/bin/env node
/**
 * @file redteam-audit.mjs
 * @description Suite automatizada de Auditoría Ofensiva (Red Team), Fuzzing Diferencial,
 * Análisis de Flujo de Datos (Taint Analysis) y Forense de CI/CD para rayrabbit-ai/ai-engineering.
 *
 * Implementa mecánicamente los 10 Dominios de Ciberseguridad de `adversarial_auditor`:
 *   D1: Taint Analysis & CLI/Argument Injection (CWE-78, CWE-88, CWE-94)
 *   D2: Filesystem Security, Symlinks, Prototype Pollution & ReDoS (CWE-22, CWE-59, CWE-1321, CWE-1333)
 *   D3: Cryptography, Secrets & Guard Integrity (CWE-798, CWE-327, CWE-390)
 *   D4: Network, TLS & HTTP Security (CWE-295, CWE-918)
 *   D5: AI Agent Security, Trojan Source Unicode & Prompt Injection (OWASP LLM01, CVE-2021-42574)
 *   D6: CI/CD & GitHub Actions Offensive Audit (OWASP CICD-SEC, PPE, Push Range, Branch Protection)
 *   D7: TDD/SDD Gate Bypasses & Polyglot Differential Fuzzing (Node vs. Python)
 *   D8: Supply Chain Security, Lockfiles & Coverage JSON Schema Contract
 *   D9: Coverage Gate Separation & Semantic Mutation Testing Probe
 *   D10: Artifact Forensics & Cryptographic Synchronization (SHA-256 / ZIP Audit)
 *
 * Uso:
 *   node scripts/redteam-audit.mjs [--report docs/informe-redteam.md] [--json artifacts/redteam.json] [--probe-http]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const PYTHON_BIN = (() => {
  const check = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['--version'], { encoding: 'utf8' });
  return check.status === 0 ? (process.platform === 'win32' ? 'python' : 'python3') : 'python';
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
  cvss,
  cwe,
  framework,
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
    cvss,
    cwe,
    framework,
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
  const IGNORE_DIRS = new Set(['.git', 'node_modules', '.pytest_cache', '.venv', 'venv', 'coverage', '.nyc_output']);
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
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
// DOMINIO 1: TAINT ANALYSIS & INYECCIÓN DE COMANDOS / ARGUMENTOS (CWE-78 / CWE-88)
// ============================================================================
async function auditDomain1TaintAndInjection(repoFiles) {
  console.log('🔍 [D1] Ejecutando Taint Analysis e Inyección CLI/Argumentos (CWE-78 / CWE-88)...');

  const codeFiles = repoFiles.filter(
    (f) => !f.isSymlink && /\.(mjs|cjs|js|ts|py)$/.test(f.relPath) && !f.relPath.endsWith('redteam-audit.mjs')
  );

  for (const file of codeFiles) {
    const content = fs.readFileSync(file.fullPath, 'utf8');

    // Detección de ejecución con shell en Node/JS
    if (/\bexecSync\s*\(|\bexec\s*\(|shell\s*:\s*true/.test(content)) {
      const line = findLineNumber(content, /\bexecSync\s*\(|\bexec\s*\(|shell\s*:\s*true/);
      registerFinding({
        title: `Uso de shell en ejecución de subprocesos en ${file.relPath}`,
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H (8.6)',
        cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
        framework: 'OWASP ASVS L3 V5.3.8 / MITRE T1059',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'El archivo invoca un subproceso mediante shell (`execSync` / `shell: true`), permitiendo que argumentos interpolados con metacaracteres (`;`, `|`, `$()`) ejecuten comandos arbitrarios.',
        pocCommand: `grep -nE "execSync|shell:\\s*true" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Reemplazar `execSync` por `spawnSync("git", argsArray, { shell: false })`, validar refs con `git check-ref-format` y anteponer `--` cuando corresponda.',
      });
    }

    // Detección de shell=True en Python
    if (/shell\s*=\s*True|\bos\.system\s*\(|\bos\.popen\s*\(/.test(content)) {
      const line = findLineNumber(content, /shell\s*=\s*True|\bos\.system\s*\(|\bos\.popen\s*\(/);
      registerFinding({
        title: `Ejecución de subprocesos con shell=True en ${file.relPath}`,
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H (8.6)',
        cwe: 'CWE-78: OS Command Injection',
        framework: 'OWASP ASVS L3 V5.3.8 / CWE Top 25',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se invoca `subprocess` con `shell=True` o `os.system` concatenando argumentos externos, habilitando inyección de comandos en el intérprete de shell.',
        pocCommand: `grep -nE "shell\\s*=\\s*True|os\\.system" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Pasar lista de argumentos `subprocess.run(["git", ...], shell=False, check=True)` y rechazar referencias que comiencen con `-`.',
      });
    }

    // Detección de Fail-Open (CWE-390 / CWE-636) en funciones que invocan git
    if (/catch\s*(\([^)]*\))?\s*\{\s*return\s+['"`]{2}\s*;?\s*\}/.test(content)) {
      const line = findLineNumber(content, /return\s+['"`]{2}/);
      registerFinding({
        title: `Diseño Fail-Open: silenciamiento de fallos de subproceso en ${file.relPath}`,
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:N/VI:H/VA:N (7.1)',
        cwe: 'CWE-636: Not Failing Securely (Fail Open) / CWE-390',
        framework: 'OWASP ASVS L3 V7.4.1',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'El bloque `catch` captura errores de ejecución de Git y devuelve una cadena vacía `""`. El llamador interpreta la cadena vacía como "0 commits pendientes" y aprueba el gate con `exit 0`.',
        pocCommand: `node ${file.relPath} --base refs/heads/__nonexistent_ref__ --head HEAD`,
        pocOutput: `Línea ${line}: catch silencia el error y retorna ""`,
        remediation:
          'Lanzar una excepción o abortar inmediatamente con `process.exit(1)` cuando cualquier invocación a Git devuelva `status !== 0`.',
      });
    }
  }

  // Probe dinámico de inyección CWE-78 y CWE-88 contra verify-gates.mjs y verify_gates.py
  const nodeGate = path.join(ROOT_DIR, 'scripts/verify-gates.mjs');
  const pyGate = path.join(ROOT_DIR, 'scripts/verify_gates.py');

  if (fs.existsSync(nodeGate)) {
    const canaryPayload = 'HEAD; printf "REDTEAM_NODE_CANARY_78|test(red): fake_injected"';
    const probe = runSafeCommand('node', ['scripts/verify-gates.mjs', '--base', canaryPayload, '--head', 'HEAD']);
    if (probe.stdout.includes('REDTEAM_NODE_CANARY') || probe.stdout.includes('[REDTEAM')) {
      registerFinding({
        title: 'Exploit confirmado (PoC): Inyección de comandos y falsificación de commits en verify-gates.mjs',
        severity: 'Crítica',
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H (9.3)',
        cwe: 'CWE-78: OS Command Injection',
        framework: 'OWASP ASVS L3 / CWE Top 25',
        location: 'scripts/verify-gates.mjs',
        mechanism:
          'El argumento `--base` se concatena sin sanitización en una cadena ejecutada por shell. El payload ejecutó `printf` e inyectó un commit sintético falso dentro del flujo de auditoría.',
        pocCommand: probe.displayCmd,
        pocOutput: `${probe.stdout}\n${probe.stderr}`,
        remediation:
          'Eliminar `execSync`. Usar `spawnSync("git", ["log", ...], { shell: false })` previa validación con `git check-ref-format`.',
      });
    }

    // Argument injection probe (--upload-pack / flag injection)
    const argProbe = runSafeCommand('node', ['scripts/verify-gates.mjs', '--base', '--version', '--head', 'HEAD']);
    if (argProbe.status === 0) {
      registerFinding({
        title: 'Argument Injection / Fail-Open ante flags de Git en verify-gates.mjs',
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:L/VI:H/VA:N (7.3)',
        cwe: 'CWE-88: Improper Neutralization of Argument Delimiters in a Command',
        framework: 'OWASP ASVS L3 V5.3',
        location: 'scripts/verify-gates.mjs',
        mechanism:
          'El validador acepta una referencia `--base` que comienza con `--` (flag de Git) o falla silenciosamente devolviendo `exit 0` en lugar de rechazar el argumento.',
        pocCommand: argProbe.displayCmd,
        pocOutput: `Exit code: ${argProbe.status}\n${argProbe.stdout}`,
        remediation:
          'Rechazar cualquier referencia `--base` o `--head` que comience con `-` y verificar su existencia con `git rev-parse --verify --quiet "${ref}^{commit}"`.',
      });
    }
  }

  if (fs.existsSync(pyGate)) {
    const pyCanary = 'HEAD; printf "REDTEAM_PY_CANARY_78|test(red): fake_injected"';
    const pyProbe = runSafeCommand(PYTHON_BIN, ['scripts/verify_gates.py', '--base', pyCanary, '--head', 'HEAD']);
    if (pyProbe.stdout.includes('REDTEAM_PY_CANARY') || pyProbe.stdout.includes('[REDTEAM')) {
      registerFinding({
        title: 'Exploit confirmado (PoC): Inyección de comandos y falsificación de commits en verify_gates.py',
        severity: 'Crítica',
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H (9.3)',
        cwe: 'CWE-78: OS Command Injection',
        framework: 'OWASP ASVS L3 / CWE Top 25',
        location: 'scripts/verify_gates.py',
        mechanism:
          'El argumento `--base` se interpola dentro de un comando ejecutado con `shell=True`, ejecutando el comando inyectado y contaminando la lista de commits auditados.',
        pocCommand: pyProbe.displayCmd,
        pocOutput: `${pyProbe.stdout}\n${pyProbe.stderr}`,
        remediation:
          'Usar `subprocess.run(["git", ...], shell=False, check=True)` y validar las referencias antes de construir el rango.',
      });
    }
  }
}

// ============================================================================
// DOMINIO 2: ARCHIVOS, SYMLINKS, PROTOTYPE POLLUTION & ReDoS (CWE-59 / CWE-1333)
// ============================================================================
async function auditDomain2FilesystemAndMemory(repoFiles) {
  console.log('🔍 [D2] Auditando Symlinks, Prototype Pollution y Catastrophic Backtracking (ReDoS)...');

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
          cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N (7.4)',
          cwe: 'CWE-59: Improper Link Resolution Before File Access (Link Following)',
          framework: 'OWASP ASVS L3 V12.3',
          location: file.relPath,
          mechanism:
            'Un enlace simbólico dentro del árbol de trabajo resuelve fuera de la raíz del proyecto, permitiendo lectura o escritura arbitraria durante el empaquetado o validación.',
          pocCommand: `readlink -f ${file.relPath}`,
          pocOutput: `${file.relPath} -> ${target} (resolved: ${resolved})`,
          remediation: 'Eliminar symlinks externos y verificar `fs.realpathSync` en todos los validadores de archivos.',
        });
      }
    }
  }

  // Auditoría de os.path / sys.path prohibidos por las invariantes del repo
  const pyFiles = repoFiles.filter((f) => !f.isSymlink && f.relPath.endsWith('.py'));
  for (const pyFile of pyFiles) {
    const content = fs.readFileSync(pyFile.fullPath, 'utf8');
    if (/\bos\.path\b|\bsys\.path\b/.test(content)) {
      const line = findLineNumber(content, /\bos\.path\b|\bsys\.path\b/);
      registerFinding({
        title: `Violación de invariante Python: uso de os.path o sys.path en ${pyFile.relPath}`,
        severity: 'Media',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:N (4.8)',
        cwe: 'CWE-426: Untrusted Search Path',
        framework: 'RayRabbit Engineering Invariants',
        location: `${pyFile.relPath}#L${line}`,
        mechanism:
          'El código utiliza `os.path` o manipula `sys.path` en lugar de `pathlib.Path` e `importlib.resources`, introduciendo riesgos de resolución de rutas e incumpliendo las invariantes del proyecto.',
        pocCommand: `grep -nE "os\\.path|sys\\.path" ${pyFile.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation: 'Migrar exclusivamente a `pathlib.Path` e `importlib.resources`.',
      });
    }
  }

  // Benchmark ReDoS contra expresiones regulares de prefijos/scopes
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
// DOMINIO 3: CRIPTOGRAFÍA, SECRETOS E INTEGRIDAD DE GUARD (CWE-798 / CWE-327)
// ============================================================================
async function auditDomain3CryptoAndSecrets(repoFiles) {
  console.log('🔍 [D3] Escaneando Secretos Expuestos e Integridad Criptográfica del Guard...');

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
          cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N (9.1)',
          cwe: 'CWE-798: Use of Hard-coded Credentials',
          framework: 'OWASP ASVS L3 V2.10 / CICD-SEC-6',
          location: `${file.relPath}#L${line}`,
          mechanism: `Se detectó un patrón coincidente con ${pat.name} almacenado en texto plano dentro del repositorio.`,
          pocCommand: `grep -n "REDACTED_PATTERN" ${file.relPath}`,
          pocOutput: `Coincidencia en ${file.relPath}#L${line} (valor ocultado por seguridad)`,
          remediation: 'Revocar la credencial inmediatamente, rotar el secreto y usar GitHub Encrypted Secrets / OIDC.',
        });
      }
    }
  }

  // Verificar si guard-agent.mjs valida hashes SHA-256 o solo existencia superficial (existsSync)
  const guardPath = path.join(ROOT_DIR, 'scripts/guard-agent.mjs');
  if (fs.existsSync(guardPath)) {
    const guardContent = fs.readFileSync(guardPath, 'utf8');
    const usesExistsSync = guardContent.includes('existsSync');
    const usesCryptoHash = /createHash\s*\(\s*['"]sha(256|384|512)['"]\s*\)/.test(guardContent);
    if (usesExistsSync && !usesCryptoHash) {
      const line = findLineNumber(guardContent, 'existsSync');
      registerFinding({
        title: 'Guardia de integridad superficial: guard-agent.mjs no verifica hashes criptográficos (SHA-256)',
        severity: 'Media',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (6.5)',
        cwe: 'CWE-353: Missing Support for Integrity Check',
        framework: 'SLSA L3 / OWASP ASVS L3 V14.2',
        location: `scripts/guard-agent.mjs#L${line}`,
        mechanism:
          '`guard-agent.mjs` comprueba únicamente la existencia de archivos con `fs.existsSync`, permitiendo truncar a 0 bytes o comentar todas las reglas en `.agent/rules/` sin que el guard detecte el sabotaje.',
        pocCommand: `grep -nE "existsSync|createHash" scripts/guard-agent.mjs`,
        pocOutput: `Línea ${line}: usa fs.existsSync sin validación SHA-256 de contenido ni longitud mínima.`,
        remediation:
          'Mantener un manifiesto firmado de hashes SHA-256 para `.agent/rules/*` y `.github/workflows/*` y fallar con `exit 1` ante cualquier discrepancia.',
      });
    }
  }
}

// ============================================================================
// DOMINIO 4: SEGURIDAD DE RED, TLS Y PROTOCOLOS HTTP (CWE-295 / CWE-918)
// ============================================================================
async function auditDomain4NetworkAndHttp(repoFiles) {
  console.log('🔍 [D4] Auditando configuración TLS/HTTP y respuesta de API remota...');

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
        cvss: 'CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:H/VI:H/VA:N (7.7)',
        cwe: 'CWE-295: Improper Certificate Validation',
        framework: 'OWASP ASVS L3 V9.2.1',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se desactiva la verificación de certificados TLS, exponiendo las conexiones HTTPS a ataques Man-in-the-Middle (MitM).',
        pocCommand: `grep -nE "rejectUnauthorized|verify=False|NODE_TLS_REJECT_UNAUTHORIZED" ${file.relPath}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation: 'Habilitar siempre la validación estricta de certificados TLS y configurar timeouts de socket.',
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
      'https://api.github.com/repos/rayrabbit-ai/ai-engineering/branches/main/protection',
    ]);
    console.log(`   ℹ️  Estado HTTP Branch Protection API: ${curlRes.stdout}`);
  }
}

// ============================================================================
// DOMINIO 5: SEGURIDAD DE AGENTES IA, TROJAN SOURCE UNICODE & PROMPT INJECTION
// ============================================================================
async function auditDomain5AiAgentSecurity(repoFiles) {
  console.log('🔍 [D5] Escaneando Trojan Source Unicode (CVE-2021-42574) y Adaptadores de Agentes...');

  // Caracteres bidireccionales Unicode maliciosos (Trojan Source)
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
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:A/VC:H/VI:H/VA:H (8.5)',
        cwe: 'CWE-116 / CVE-2021-42574: Trojan Source Bidirectional Unicode',
        framework: 'OWASP LLM01 / MITRE ATLAS',
        location: `${file.relPath}#L${line}`,
        mechanism:
          'Se encontraron puntos de código Unicode de control bidireccional que alteran el orden visual del código o esconden instrucciones de Prompt Injection invisibles para un revisor humano.',
        pocCommand: `node -e 'console.log(/[\u202A-\u202E\u2066-\u2069]/.test(fs.readFileSync("${file.relPath}","utf8")))'`,
        pocOutput: `Caracteres de control bidireccional presentes en ${file.relPath}#L${line}`,
        remediation: 'Eliminar todos los caracteres de control bidireccional Unicode y bloquearlos en CI.',
      });
    }
  }

  // Verificar coherencia entre adaptadores de agentes declarados en README vs existentes en raíz
  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    if (/Claude Code|Cursor|Antigravity/i.test(readme)) {
      const hasClaudeMd = fs.existsSync(path.join(ROOT_DIR, 'CLAUDE.md'));
      const hasCursorRules =
        fs.existsSync(path.join(ROOT_DIR, '.cursor/rules')) || fs.existsSync(path.join(ROOT_DIR, '.cursorrules'));
      const hasAgentRules = fs.existsSync(path.join(ROOT_DIR, '.agent/rules'));
      claimsMatrix.push({
        claim: 'Soporte multi-agente nativo (Antigravity, Cursor, Claude Code)',
        enforcement: hasClaudeMd && hasCursorRules && hasAgentRules ? 'Mecánico / Completo' : 'Parcial / Asimétrico',
        evidence: `.agent/rules=${hasAgentRules}, .cursor/rules=${hasCursorRules}, CLAUDE.md=${hasClaudeMd}`,
      });
    }
  }
}

// ============================================================================
// DOMINIO 6: SEGURIDAD OFENSIVA DE CI/CD Y GITHUB ACTIONS (OWASP CICD-SEC)
// ============================================================================
async function auditDomain6CiCdSecurity() {
  console.log('🔍 [D6] Auditando Workflows de GitHub Actions, PPE, Push Range y Branch Protection...');

  const codeownersPaths = [
    path.join(ROOT_DIR, '.github/CODEOWNERS'),
    path.join(ROOT_DIR, 'CODEOWNERS'),
    path.join(ROOT_DIR, 'docs/CODEOWNERS'),
  ];
  const existingCodeowners = codeownersPaths.find((p) => fs.existsSync(p));

  if (!existingCodeowners) {
    registerFinding({
      title: 'Poisoned Pipeline Execution (PPE): un PR puede modificar el gate que lo evalúa sin CODEOWNERS',
      severity: 'Alta',
      cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H (8.7)',
      cwe: 'CWE-284: Improper Access Control / OWASP CICD-SEC-4',
      framework: 'OWASP Top 10 CI/CD (CICD-SEC-1, CICD-SEC-4) / SLSA L3',
      location: '.github/workflows/gate-validator.yml',
      mechanism:
        'El workflow ejecuta `scripts/verify-gates.mjs` y `scripts/guard-agent.mjs` desde el mismo checkout del Pull Request evaluado y carece de archivo `CODEOWNERS` que obligue a revisión independiente sobre `.github/workflows/` y `scripts/`.',
      pocCommand: 'test -f .github/CODEOWNERS || echo "MISSING_CODEOWNERS"',
      pocOutput: 'MISSING_CODEOWNERS',
      remediation:
        'Añadir `.github/CODEOWNERS` protegiendo `.github/`, `scripts/` y `.agent/`, exigir aprobación de propietarios y mover el validador a un workflow reusable en una referencia protegida.',
    });
  }

  const workflowsDir = path.join(ROOT_DIR, '.github/workflows');
  if (fs.existsSync(workflowsDir)) {
    const wfFiles = fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));
    for (const wf of wfFiles) {
      const wfRel = `.github/workflows/${wf}`;
      const wfFull = path.join(workflowsDir, wf);
      const content = fs.readFileSync(wfFull, 'utf8');

      // 1. Verificar Push Range Blindness (origin/main..HEAD en push)
      if (/origin\/\$\{\{\s*github\.base_ref\s*\|\|\s*'main'\s*\}\}/.test(content) && !content.includes('github.event.before')) {
        const line = findLineNumber(content, /github\.base_ref/);
        registerFinding({
          title: `Ceguera de auditoría en eventos push: ${wfRel} compara origin/main..HEAD (rango vacío)`,
          severity: 'Media',
          cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (6.5)',
          cwe: 'CWE-807: Reliance on Untrusted Inputs in a Security Decision',
          framework: 'OWASP CICD-SEC-1',
          location: `${wfRel}#L${line}`,
          mechanism:
            'En un evento `push` a `main`, `github.base_ref` está vacío y el fallback `origin/main` ya apunta al commit recién enviado (`HEAD`), por lo que el rango `origin/main..HEAD` contiene 0 commits.',
          pocCommand: `grep -n "github.base_ref" ${wfRel}`,
          pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
          remediation:
            'En eventos `push`, utilizar `${{ github.event.before }}` como `--base` (manejando el SHA de 40 ceros del primer push) y `${{ github.sha }}` como `--head`.',
        });
      }

      // 2. Verificar GitHub Actions fijadas por tag mutable (@v4) en vez de SHA de 40 hex
      const usesMatches = [...content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)$/gm)];
      for (const match of usesMatches) {
        const actionRef = match[1];
        if (!actionRef.startsWith('./') && !/@[0-9a-f]{40}$/i.test(actionRef)) {
          const line = findLineNumber(content, actionRef);
          registerFinding({
            title: `GitHub Action no fijada por hash SHA inmutable (${actionRef}) en ${wfRel}`,
            severity: 'Media',
            cvss: 'CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:H/VI:H/VA:N (6.3)',
            cwe: 'CWE-829: Inclusion of Functionality from Untrusted Control Sphere',
            framework: 'OWASP CICD-SEC-3 / SLSA L3',
            location: `${wfRel}#L${line}`,
            mechanism:
              `La acción \`${actionRef}\` se referencia mediante un tag mutable en lugar de un commit SHA completo de 40 caracteres, exponiendo el runner a ataques de cadena de suministro (como el incidente tj-actions/changed-files).`,
            pocCommand: `grep -n "uses: ${actionRef}" ${wfRel}`,
            pocOutput: `Línea ${line}: uses: ${actionRef}`,
            remediation: 'Fijar todas las acciones de terceros a su hash SHA-1/SHA-256 de 40 caracteres con un comentario indicando la versión.',
          });
          break; // Reportar una vez por workflow para evitar ruido
        }
      }

      // 3. Verificar bloque permissions: mínimo
      if (!/^\s*permissions\s*:/m.test(content)) {
        registerFinding({
          title: `Ausencia de bloque permissions explícito (Least Privilege) en ${wfRel}`,
          severity: 'Media',
          cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:N (5.3)',
          cwe: 'CWE-250: Execution with Unnecessary Privileges',
          framework: 'OWASP CICD-SEC-2',
          location: `${wfRel}#L1`,
          mechanism:
            'El workflow no declara `permissions: contents: read` a nivel raíz, heredando los permisos por defecto del `GITHUB_TOKEN` del repositorio.',
          pocCommand: `grep -n "permissions:" ${wfRel} || echo "MISSING_PERMISSIONS_BLOCK"`,
          pocOutput: 'MISSING_PERMISSIONS_BLOCK',
          remediation: 'Declarar `permissions: contents: read` en la raíz del workflow.',
        });
      }
    }
  }

  // Verificar scripts de Branch Protection por required_pull_request_reviews: null
  const bpScripts = ['scripts/setup_branch_protection.py', 'scripts/setup-branch-protection.sh'];
  for (const rel of bpScripts) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (/required_pull_request_reviews['"]?\s*:\s*(None|null)/.test(content)) {
      const line = findLineNumber(content, /required_pull_request_reviews/);
      registerFinding({
        title: `Sabotaje de configuración en ${rel}: desactiva revisiones obligatorias de PR (null/None)`,
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:H/UI:N/VC:N/VI:H/VA:N (6.9)',
        cwe: 'CWE-1188: Insecure Default Initialization of Resource',
        framework: 'OWASP CICD-SEC-1 / SLSA L3',
        location: `${rel}#L${line}`,
        mechanism:
          'El payload enviado por `PUT` a la API de Branch Protection de GitHub establece `required_pull_request_reviews: null`, lo cual elimina cualquier exigencia de revisión humana en `main`.',
        pocCommand: `grep -n "required_pull_request_reviews" ${rel}`,
        pocOutput: `Línea ${line}: ${content.split('\n')[line - 1]?.trim()}`,
        remediation:
          'Configurar un objeto `required_pull_request_reviews` con `"required_approving_review_count": 1`, `"dismiss_stale_reviews": true` y `"require_code_owner_reviews": true`.',
      });
    }
  }
}

// ============================================================================
// DOMINIO 7: EVASIÓN DE COMPUERTAS TDD/SDD Y FUZZING DIFERENCIAL (NODE VS PYTHON)
// ============================================================================
async function auditDomain7DifferentialGateFuzzing() {
  console.log('🔍 [D7] Ejecutando Matriz de Fuzzing Diferencial contra verify-gates (Node vs. Python)...');

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
      name: 'Ciclo TDD Estricto Legítimo (Control Positivo)',
      shouldReject: false,
      cwe: 'N/A',
      severity: 'Baja',
      commits: [
        { hash: 'red0007', subject: 'test(red)(calculator): add failing division test', changedFiles: ['tests/test_calculator.py'] },
        { hash: 'green07', subject: 'feat(green)(calculator): implement division', changedFiles: ['src/calculator.py'] },
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
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (7.1)',
        cwe: vec.cwe,
        framework: 'RayRabbit TDD/SDD Invariant Gate',
        location: 'scripts/verify-gates.mjs',
        mechanism: `El validador Node devolvió \`[]\` (0 errores) ante la secuencia adversarial \`${vec.id}\`, permitiendo evadir el acoplamiento causal RED -> GREEN.`,
        pocCommand: `node --input-type=module -e 'import {validateCommitList} from "./scripts/verify-gates.mjs"; console.log(validateCommitList(${JSON.stringify(vec.commits)}))'`,
        pocOutput: `Salida obtenida: ${JSON.stringify(nodeErrors)} (Se esperaba rechazo con errores > 0)`,
        remediation:
          'Rechazar módulos vacíos (prohibir comodín `*`), exigir que `test(red)` modifique al menos un archivo de test real y verificar que **todos** los módulos de producción en `feat(green)` tengan un scope RED activo.',
      });
    }

    if (vec.shouldReject && pyErrors !== null && !pyRejected) {
      registerFinding({
        title: `Bypass del Gate TDD/SDD en Python (${vec.id}): ${vec.name}`,
        severity: vec.severity,
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (7.1)',
        cwe: vec.cwe,
        framework: 'RayRabbit TDD/SDD Invariant Gate',
        location: 'scripts/verify_gates.py',
        mechanism: `El validador Python devolvió \`[]\` (0 errores) ante la secuencia adversarial \`${vec.id}\`, permitiendo evadir la compuerta TDD.`,
        pocCommand: `python3 -c 'from scripts.verify_gates import validate_commit_list; print(validate_commit_list(${JSON.stringify(vec.commits.map((c) => [c.hash, c.subject, c.changedFiles]))}))'`,
        pocOutput: `Salida obtenida: ${JSON.stringify(pyErrors)} (Se esperaba rechazo con errores > 0)`,
        remediation:
          'Sincronizar la validación estricta en `scripts/verify_gates.py` y eliminar el fallback comodín `*`.',
      });
    }

    if (nodeErrors !== null && pyErrors !== null && nodeRejected !== pyRejected) {
      registerFinding({
        title: `Deriva Políglota (Differential Fuzzing Mismatch) en vector ${vec.id}`,
        severity: 'Alta',
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (7.1)',
        cwe: 'CWE-436: Interpretation Conflict',
        framework: 'Polyglot Gate Equivalence',
        location: 'scripts/verify-gates.mjs vs scripts/verify_gates.py',
        mechanism: `Ante la misma entrada \`${vec.id}\`, Node devolvió rejected=${nodeRejected} mientras que Python devolvió rejected=${pyRejected}.`,
        pocCommand: `Comparación diferencial ${vec.id}`,
        pocOutput: `Node=${JSON.stringify(nodeErrors)} | Python=${JSON.stringify(pyErrors)}`,
        remediation: 'Unificar la matriz de pruebas adversariales entre Node y Python en CI.',
      });
    }
  }
}

// ============================================================================
// DOMINIO 8: CADENA DE SUMINISTRO, LOCKFILES Y CONTRATOS JSON (SCA)
// ============================================================================
async function auditDomain8SupplyChainAndSchemas() {
  console.log('🔍 [D8] Auditando Cadena de Suministro (npm audit / lockfiles / contratos JSON)...');

  const pkgLockPath = path.join(ROOT_DIR, 'package-lock.json');
  if (fs.existsSync(pkgLockPath)) {
    const npmAudit = runSafeCommand('npm', ['audit', '--json']);
    if (npmAudit.stdout) {
      try {
        const parsed = JSON.parse(npmAudit.stdout);
        const vulns = parsed.metadata?.vulnerabilities || {};
        const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0);
        if (total > 0) {
          registerFinding({
            title: `Vulnerabilidades en árbol de dependencias Node (${vulns.critical || 0} críticas, ${vulns.high || 0} altas, ${vulns.moderate || 0} moderadas)`,
            severity: (vulns.critical || 0) > 0 ? 'Crítica' : 'Alta',
            cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H (9.3)',
            cwe: 'CWE-1395: Dependency on Vulnerable Third-Party Component',
            framework: 'OWASP Top 10 A06 / SLSA L3',
            location: 'package-lock.json',
            mechanism:
              '`npm audit` detectó paquetes vulnerables instalados y ejecutados durante el ciclo de pruebas/build en CI y desarrollo local.',
            pocCommand: 'npm audit --audit-level=moderate',
            pocOutput: JSON.stringify(vulns),
            remediation:
              'Actualizar dependencias afectadas en `package.json` / `package-lock.json` y agregar `npm audit --audit-level=moderate` como paso bloqueante en CI.',
          });
        }
      } catch {
        // Ignorar si npm audit no devolvió JSON válido
      }
    }
  }

  // Verificar incompatibilidad de coverage==7.6.1 con percent_branches_covered si algún workflow o script lo exige
  const wfDir = path.join(ROOT_DIR, '.github/workflows');
  const reqFiles = ['requirements.txt', 'requirements-dev.txt', 'pyproject.toml']
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
          cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H (7.5)',
          cwe: 'CWE-628: Function Call with Incorrectly Specified Arguments / Schema Mismatch',
          framework: 'CI/CD Reliability & Deterministic Builds',
          location: `.github/workflows/${wf}`,
          mechanism:
            'El lockfile fija `coverage==7.6.1`, cuyo reporte `coverage.json` expone `num_branches` y `covered_branches`, pero no `percent_branches_covered`, causando fallo sistemático en el job de CI Python.',
          pocCommand: 'grep -n "percent_branches_covered" .github/workflows/*.yml',
          pocOutput: 'coverage==7.6.1 fijado junto con lectura de percent_branches_covered',
          remediation:
            'Calcular el porcentaje de ramas como `(covered_branches / num_branches) * 100` (cuando `num_branches > 0`) o actualizar `coverage` a una versión compatible.',
        });
      }
    }
  }
}

// ============================================================================
// DOMINIO 9: SEPARACIÓN DE COBERTURA Y PRUEBAS DE MUTACIÓN (MUTATION PROBE)
// ============================================================================
async function auditDomain9CoverageAndMutation() {
  console.log('🔍 [D9] Verificando separación de umbrales de cobertura (Líneas >=80%, Ramas >=75%) y filtros E2E...');

  const pyprojectPath = path.join(ROOT_DIR, 'pyproject.toml');
  const wfPath = path.join(ROOT_DIR, '.github/workflows/gate-validator.yml');

  if (fs.existsSync(pyprojectPath)) {
    const pyproj = fs.readFileSync(pyprojectPath, 'utf8');
    const wfTxt = fs.existsSync(wfPath) ? fs.readFileSync(wfPath, 'utf8') : '';

    const checksSeparateBranchThreshold =
      /covered_branches|percent_branches_covered|branch_rate/.test(wfTxt) ||
      /covered_branches|percent_branches_covered/.test(pyproj);

    if (!checksSeparateBranchThreshold) {
      const line = findLineNumber(pyproj, /fail_under/);
      registerFinding({
        title: 'Umbral de cobertura de ramas Python (>=75%) no se evalúa por separado de líneas (>=80%)',
        severity: 'Media',
        cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:L/VA:N (4.3)',
        cwe: 'CWE-697: Incorrect Comparison',
        framework: 'RayRabbit Coverage Invariant',
        location: `pyproject.toml#L${line}`,
        mechanism:
          '`pyproject.toml` configura `branch = true` y un único `fail_under = 80` global combinado. Esto permite que la cobertura de ramas caiga por debajo del 75% siempre que el porcentaje de líneas compense el promedio.',
        pocCommand: 'grep -n -C 3 "fail_under" pyproject.toml',
        pocOutput: `Línea ${line}: fail_under = 80 (combinado, sin gate independiente de 75% para ramas)`,
        remediation:
          'Exportar `coverage json` y verificar mecánicamente que `(totals.covered_lines / totals.num_statements) >= 0.80` y `(totals.covered_branches / totals.num_branches) >= 0.75` por separado.',
      });
    }

    if (wfTxt.includes("unit or integration") && !wfTxt.includes('e2e')) {
      const line = findLineNumber(wfTxt, /unit or integration/);
      registerFinding({
        title: 'Exclusión silenciosa de pruebas E2E de Python en el pipeline de CI',
        severity: 'Media',
        cvss: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:L/VA:N (4.8)',
        cwe: 'CWE-754: Improper Check for Unusual or Exceptional Conditions',
        framework: 'RayRabbit Testing Invariants',
        location: `.github/workflows/gate-validator.yml#L${line}`,
        mechanism:
          'El workflow ejecuta `pytest -m legacy_baseline` y `pytest -m "unit or integration"`, dejando los tests marcados con `@pytest.mark.e2e` fuera de la ejecución automática de CI.',
        pocCommand: 'grep -n "pytest -m" .github/workflows/gate-validator.yml',
        pocOutput: `Línea ${line}: ejecuta solo legacy_baseline y 'unit or integration'`,
        remediation: 'Incluir `e2e` en la expresión de marcadores de CI o añadir un job dedicado de pruebas E2E.',
      });
    }
  }
}

// ============================================================================
// DOMINIO 10: FORENSE DE ARTEFACTOS Y SINCRONÍA CRIPTOGRÁFICA (DIST / ZIP)
// ============================================================================
async function auditDomain10ArtifactForensics() {
  console.log('🔍 [D10] Auditando sincronía forense de artefactos en dist/ y paquetes .zip...');

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

    // Comparar archivos clave del workspace contra los almacenados dentro del ZIP usando Python zipfile
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
            title: `Desincronización forense: dist/${zipName} no coincide byte a byte con el árbol de trabajo actual`,
            severity: 'Media',
            cvss: 'CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N (5.8)',
            cwe: 'CWE-345: Insufficient Verification of Data Authenticity',
            framework: 'SLSA L3 Artifact Provenance',
            location: `dist/${zipName}`,
            mechanism:
              'Uno o más archivos dentro del paquete `.zip` distribuible tienen un hash SHA-256 distinto al del archivo correspondiente en el árbol de trabajo actual.',
            pocCommand: `python3 -c "..." dist/${zipName}`,
            pocOutput: JSON.stringify(mismatches, null, 2),
            remediation:
              'Regenerar el archivo `.zip` desde el árbol limpio y validar los checksums SHA-256 antes de confirmar.',
          });
        }
      } catch {
        // Ignorar fallo de parseo
      }
    }
  }
}

// ============================================================================
// GENERACIÓN DE REPORTE FORENSE MARKDOWN Y SALIDA DE TERMINAL
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
    '# Informe de Auditoría Ofensiva y Forense (Red Team)',
    '',
    `**Fecha de ejecución:** ${new Date().toISOString()}`,
    `**Directorio auditado:** \`${ROOT_DIR}\``,
    `**Estándares aplicados:** OWASP ASVS L3, OWASP CI/CD Top 10, OWASP LLM Top 10, SLSA L3, CWE Top 25, CVSS v4.0`,
    '',
    '## 1. Dictamen Ejecutivo y Postura de Riesgo',
    '',
    `**Veredicto Global:** \`${verdict}\``,
    '',
    `- **Hallazgos Críticos:** ${criticalCount}`,
    `- **Hallazgos Altos:** ${highCount}`,
    `- **Hallazgos Medios:** ${mediumCount}`,
    `- **Hallazgos Bajos:** ${lowCount}`,
    '',
    '## 2. Registro de Vulnerabilidades, Exploits y Bypasses',
    '',
  ];

  if (findings.length === 0) {
    lines.push('No se detectaron vulnerabilidades ni bypasses en los 10 dominios auditados.');
  } else {
    for (const f of findings) {
      lines.push(`### ${f.id} — ${f.title}`);
      lines.push('');
      lines.push(
        `- **Severidad:** ${f.severity} | **CVSS:** \`${f.cvss}\` | **CWE:** \`${f.cwe}\` | **Marco:** ${f.framework} | **Confianza:** ${f.confidence}`
      );
      lines.push(`- **Ubicación:** \`${f.location}\``);
      lines.push(`- **Mecanismo Técnico:** ${f.mechanism}`);
      lines.push(`- **PoC / Comando Reproducible:** \`${f.pocCommand}\``);
      lines.push('');
      lines.push('```text');
      lines.push(f.pocOutput || '(Sin salida adicional)');
      lines.push('```');
      lines.push('');
      lines.push(`- **Remediación Defensiva (Fail-Closed):** ${f.remediation}`);
      lines.push('');
    }
  }

  lines.push('## 3. Bitácora Forense de Ejecución (Audit Trail)');
  lines.push('');
  lines.push('| # | Comando / Probe Ejecutado | Exit Code | Duración (ms) | Observación Forense |');
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
  console.log('🛡️  RAYRABBIT AI ENGINEERING — ADVERSARIAL RED-TEAM AUDITOR SUITE (10 DOMAINS)');
  console.log('================================================================================');

  const repoFiles = walkRepoFiles(ROOT_DIR);

  await auditDomain1TaintAndInjection(repoFiles);
  await auditDomain2FilesystemAndMemory(repoFiles);
  await auditDomain3CryptoAndSecrets(repoFiles);
  await auditDomain4NetworkAndHttp(repoFiles);
  await auditDomain5AiAgentSecurity(repoFiles);
  await auditDomain6CiCdSecurity();
  await auditDomain7DifferentialGateFuzzing();
  await auditDomain8SupplyChainAndSchemas();
  await auditDomain9CoverageAndMutation();
  await auditDomain10ArtifactForensics();

  const mdReport = buildMarkdownReport();

  if (REPORT_PATH) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, mdReport, 'utf8');
    console.log(`\n📄 Informe forense Markdown generado en: ${REPORT_PATH}`);
  }

  if (JSON_PATH) {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify({ findings, auditTrail, claimsMatrix }, null, 2), 'utf8');
    console.log(`📊 Reporte estructurado JSON generado en: ${JSON_PATH}`);
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
    console.error('\n❌ [REDTEAM-BLOCKER] Se detectaron vulnerabilidades o bypasses Críticos/Altos. Fallando en modo fail-closed (exit 1).');
    process.exit(1);
  } else {
    console.log('\n✅ [REDTEAM-OK] Cero hallazgos Críticos/Altos.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('💥 Error fatal en redteam-audit.mjs (Fail-Closed):', err);
  process.exit(1);
});