# INFORME DE AUDITORÍA FORENSE, PENETRACIÓN FÍSICA Y GOBERNANZA ADVERSARIAL (HISTÓRICO)

> [!NOTE]
> **Documento Histórico de Iteración Interna:** Este archivo se conserva como registro histórico de la primera iteración de pruebas internas. **No constituye una certificación formal (OWASP ASVS L3 ni SLSA L3).** Para el alcance real vigente y las auditorías forenses independientes posteriores, consulte [`docs/audit/README.md`](README.md) y [`2026-10-15-auditoria-forense-ai-engineering.es.md`](2026-10-15-auditoria-forense-ai-engineering.es.md).

**Objetivo:** `c:\Users\rayrabbit-oss-github\ai-engineering`  
**Fecha:** 15 de Octubre de 2026.

---

## 1. DICTAMEN EJECUTIVO Y POSTURA DE RIESGO

### Veredicto Global: `RECHAZADO — BLOCKER DE SEGURIDAD / INTEGRIDAD`

Se ha ejecutado la auditoría forense de penetración física, taint analysis, fuzzing diferencial de compuertas causales, pruebas de mutación semántica en memoria y verificación criptográfica sobre el repositorio y template en `c:\Users\rayrabbit-oss-github\ai-engineering`.

Aunque el proyecto exhibe un avance técnico notable respecto a plantillas convencionales —incluyendo validadores de causalidad TDD, guardián de contratos semánticos (`guard-agent.mjs`), scripts de branch protection y separación de umbrales de cobertura por líneas y ramas—, la auditoría identificó **cinco (5) vulnerabilidades Bloqueantes de severidad Crítica y Alta** y **cinco (5) debilidades de severidad Media y Baja** que impiden su certificación para push, release o producción.

### Brecha entre Garantías Declaradas y Realidad Mecánica Observada:
1. **Paper Tiger en Verificación Física de RED:** La documentación promete que ningún test en fase RED es aceptado sin comprobación física previa de fallo por aserción legítima. Sin embargo, ni `verify-red-failure.mjs` ni `verify_red_failure.py` son ejecutados en el flujo de CI (`gate-validator.yml`), ni existen hooks de git obligatorios que lo fuercen. Un commit `test(red)` con una aserción vacía pasa el pipeline sin restricciones.
2. **Evasión de Tampering de Compuertas (PPE):** El filtro `MODIFIED_GATES` en GitHub Actions (`gate-validator.yml`) está anclado al inicio de línea (`^`) y sólo revisa prefijos de raíz (`scripts/verify`, `.agent/rules/`). Cuando el proyecto reside en un subárbol (`ai-engineering/`), la verificación no captura ninguna alteración de compuertas. Además, omite archivos de ejecución crítica como `package.json` (que ejecuta hooks `prepare` en `npm ci`), `pyproject.toml`, `requirements-test.txt` y `check_python_coverage.py`.
3. **Suplantación de Ámbitos Cruzados (Cross-Directory Scope Spoofing):** La función `extractModuleName` en ambos validadores extrae únicamente el nombre base (`basename`) del archivo sin considerar la ruta jerárquica. Esto permite que un test trivial en `tests/ui/button.test.ts` (ámbito `button`) autorice modificaciones arbitrarias en archivos críticos no relacionados como `src/payments/button.ts`.
4. **Asimetría Políglota en Reconocimiento de Archivos:** `verify-gates.mjs` (Node.js) no excluye directorios de soporte cuando están precedidos por un prefijo de monorepo/carpeta (`ai-engineering/scripts/`), clasificando scripts internos como código de producción y arrojando violaciones falsas de causalidad TDD. Por el contrario, `verify_gates.py` (Python) sí reconoce `/scripts/`.
5. **Inyección de Expresiones en CI/CD:** Interpolación directa de expresiones no confiables `${{ github.base_ref }}` dentro del bloque `run: |` de GitHub Actions en lugar de mapeo seguro mediante variables de entorno `env:`.

---

## 2. MATRIZ DE VERIFICACIÓN DE GARANTÍAS (CLAIMS VS. ENFORCEMENT)

| Invariante / Garantía Declarada | Nivel de Enforcement Real | Evidencia Exacta (Archivo#Línea y Ejecución) | Estado |
| :--- | :--- | :--- | :--- |
| **Invariante 1 & 3: Causalidad TDD y Acoplamiento de Ámbito** | **Heurístico / Vulnerable** | [verify-gates.mjs#L75-L85](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L75-L85) <br> PoC demostró que `tests/ui/button.test.ts` desbloquea `src/payments/button.ts` (0 errores). | ⚠️ BYPASS CONFIRMADO |
| **Invariante 1: Verificación Física de Fallo RED** | **Solo Documental (Paper Tiger)** | [gate-validator.yml#L1-L153](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L1-L153) <br> Ni `verify-red-failure.mjs` ni `verify_red_failure.py` están presentes en los pasos del pipeline de CI. | ❌ ROTO EN CI |
| **Invariante 2: Inmutabilidad de Baseline Legacy** | **Mecánico** | [verify-gates.mjs#L250-L270](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L250-L270) <br> Requiere prefijo estricto `test(baseline): update` ante cambios en suites de caracterización. | ✅ APROBADO |
| **Invariante SDD: Integridad de Especificaciones** | **Mecánico** | [verify-gates.mjs#L271-L280](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L271-L280) <br> Bloquea modificaciones directas en `openspec/specs/` fuera de `spec(sync):`. | ✅ APROBADO |
| **Anti-Tampering de Compuertas en PRs (F-01)** | **Roto / Bypassable** | [gate-validator.yml#L40-L48](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L40-L48) <br> Regex `^(\.github|scripts/verify)` eludible en subdirectorios y omite `package.json`/`pyproject.toml`. | ❌ BYPASS CONFIRMADO |
| **Mitigación de CWE-78 en Git Refs** | **Mecánico** | [verify-gates.mjs#L97-L114](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L97-L114) <br> Validación vía `git check-ref-format` y uso de `--end-of-options`. | ✅ APROBADO |
| **Mitigación CWE-88 (Argument Injection) en Runners RED** | **Roto** | [verify-red-failure.mjs#L84-L111](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-red-failure.mjs#L84-L111) <br> Archivos de test se inyectan a `vitest` y `pytest` sin delimitador `--`. | ⚠️ VULNERABLE |
| **Cobertura Independiente: Líneas >=80%, Ramas >=75%** | **Mecánico** | [check_python_coverage.py#L82-L98](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/check_python_coverage.py#L82-L98) <br> Evaluación bifurcada física (Líneas: 87.76%, Ramas: 83.87%). | ✅ APROBADO |
| **Paridad Políglota (Node.js vs. Python)** | **Roto (Asimetría Confirmada)** | [verify-gates.mjs#L65](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L65) vs [verify_gates.py#L76-L82](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify_gates.py#L76-L82) <br> Node falla en `ai-engineering/scripts/`, Python lo maneja correctamente. | ❌ ASIMETRÍA CONFIRMADA |
| **Protección contra Trojan Source (CVE-2021-42574)** | **Mecánico** | Escaneo forense de todo el árbol confirmó 0 caracteres de control Bidi o invisibles en código fuente. | ✅ APROBADO |

---

## 3. REGISTRO DETALLADO DE VULNERABILIDADES Y EXPLOITS

### `F-01`: Evasión de Bloqueo de Alteración de Compuertas y Riesgo PPE en CI/CD
- **Severidad:** **CRÍTICA**
- **CVSS v4.0:** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H` (Score: **8.7**)
- **CWE:** `CWE-284` (Improper Access Control), `CWE-863` (Incorrect Authorization)
- **Categoría:** OWASP CI/CD Risk `CICD-SEC-2` (Poisoned Pipeline Execution), SLSA L3
- **Ubicación Exacta:** [.github/workflows/gate-validator.yml#L40-L48](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L40-L48) y [.github/CODEOWNERS#L6-L18](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/CODEOWNERS#L6-L18)
- **Mecanismo Técnico:**  
  La compuerta que bloquea modificaciones no autorizadas en Pull Requests ejecuta:
  ```bash
  MODIFIED_GATES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '^(\.github/workflows/|scripts/verify|scripts/guard|\.agent/rules/)' || true)
  ```
  1. El patrón utiliza el ancla de inicio de línea `^`. Cuando el template se aloja o ejecuta desde un subdirectorio (`ai-engineering/`), la ruta en el diff es `ai-engineering/scripts/verify-gates.mjs`, por lo que **nunca coincide con el regex**.
  2. El regex omite totalmente `package.json`, `pyproject.toml`, `requirements-test.txt`, `scripts/check_python_coverage.py` y `scripts/setup_branch_protection.py`.
  3. Dado que el paso previo ejecuta `npm ci`, el script `prepare` declarado en `package.json` (`"prepare": "node scripts/guard-agent.mjs"`) se ejecuta en el runner. Un atacante en un PR puede modificar `package.json` e inyectar un comando arbitrario o degradar los scripts de test (`"test:ts:coverage": "exit 0"`), evadiendo la revisión de maintainers y logrando la aprobación de CI.
- **PoC Reproducible en Memoria:**
  ```powershell
  python -c "
  import re
  pattern = re.compile(r'^(\.github/workflows/|scripts/verify|scripts/guard|\.agent/rules/)')
  test_paths = [
      'ai-engineering/scripts/verify-gates.mjs',
      'scripts/check_python_coverage.py',
      'package.json',
      'pyproject.toml'
  ]
  for p in test_paths:
      print(f'{p}: {\"DETECTADO\" if pattern.search(p) else \"BYPASS\"}')
  "
  # Salida:
  # ai-engineering/scripts/verify-gates.mjs: BYPASS
  # scripts/check_python_coverage.py: BYPASS
  # package.json: BYPASS
  # pyproject.toml: BYPASS
  ```
- **Remediación:**  
  Actualizar el patrón de detección para usar `(^|/)` y cubrir exhaustivamente todos los archivos de configuración y validación:
  ```yaml
  grep -E '(^|/)(\.github/workflows/|scripts/|\.agent/rules/|package\.json|package-lock\.json|pyproject\.toml|requirements)'
  ```
  Añadir asimismo `package.json`, `package-lock.json`, `pyproject.toml` y `requirements*` a `.github/CODEOWNERS`.

---

### `F-02`: Inyección de Expresiones / Comandos en Workflow de CI/CD
- **Severidad:** **ALTA**
- **CVSS v4.0:** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N` (Score: **8.5**)
- **CWE:** `CWE-78` (OS Command Injection), `CWE-94` (Code Injection)
- **Categoría:** OWASP CI/CD Risk `CICD-SEC-1` (Insufficient Flow Control), CWE Top 25
- **Ubicación Exacta:** [.github/workflows/gate-validator.yml#L42](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L42)
- **Mecanismo Técnico:**  
  La expresión `${{ github.base_ref }}` se encuentra directamente concatenada dentro del bloque `run: |` de bash:
  ```yaml
  MODIFIED_GATES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep ...)
  ```
  En GitHub Actions, cualquier expresión interpolada dentro de un script de shell se sustituye textualmente antes de invocar `/bin/bash`. Si la referencia base o el contexto evaluado contiene comillas, caracteres de salto de línea o secuencias de escape, se ejecutan comandos arbitrarios en el runner con los privilegios asignados.
- **Remediación:**  
  Mapear todas las referencias y variables de contexto a través del bloque `env:`:
  ```yaml
  env:
    BASE_REF: ${{ github.base_ref }}
  run: |
    MODIFIED_GATES=$(git diff --name-only "origin/${BASE_REF}...HEAD" | grep ...)
  ```

---

### `F-03`: Suplantación de Ámbitos por Colisión de Basename (Cross-Directory Scope Spoofing)
- **Severidad:** **ALTA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N` (Score: **8.3**)
- **CWE:** `CWE-284` (Improper Access Control), `CWE-863` (Incorrect Authorization)
- **Categoría:** MITRE ATT&CK T1036 (Masquerading), MITRE ATLAS AML.T0040
- **Ubicación Exacta:** [verify-gates.mjs#L75-L85](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L75-L85) y [verify_gates.py#L97-L106](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify_gates.py#L97-L106)
- **Mecanismo Técnico:**  
  `extractModuleName` extrae el `basename` sin considerar la ruta relativa del componente:
  ```javascript
  const fileName = parts[parts.length - 1];
  let base = fileName.replace(/\.[a-zA-Z0-9]+$/, '').replace(/(\.spec|\.test|_test)$/i, '').replace(/^test_/i, '');
  ```
  Si un desarrollador o agente crea un test inofensivo en `tests/ui/button.test.ts`, el validador registra el ámbito activo `'button'`. Posteriormente, en el commit `feat(green)`, el validador autoriza cambios sobre `src/payments/button.ts` porque su módulo derivado también es `'button'`. Se descarta toda jerarquía estructural y de privilegios de directorio.
- **PoC Reproducible en Memoria:**
  ```javascript
  // Ejecutado físicamente en Node.js y Python:
  const commits = [
    { hash: '1111111', subject: 'test(red): test button ui', changedFiles: ['tests/ui/button.test.ts'] },
    { hash: '2222222', subject: 'feat(green): payment button logic', changedFiles: ['src/payments/button.ts'] }
  ];
  const errs = validateCommitList(commits);
  console.log(errs); // Resultado obtenido: [] (0 errores, COMPUERTA BURLADA)
  ```
- **Remediación:**  
  Calcular el ámbito preservando la ruta canónica relativa respecto al directorio base (`ui/button` vs `payments/button`) o exigir que el ámbito explícito coincida con la ruta jerárquica normalizada.

---

### `F-04`: Asimetría Políglota y Falsos Positivos en Subárboles de Trabajo
- **Severidad:** **ALTA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:L/VI:H/VA:H` (Score: **8.1**)
- **CWE:** `CWE-636` (Not Failing Securely), `CWE-390` (Detection of Error Condition Without Action)
- **Categoría:** CWE Top 25
- **Ubicación Exacta:** [verify-gates.mjs#L65](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-gates.mjs#L65) frente a [verify_gates.py#L76-L82](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify_gates.py#L76-L82)
- **Mecanismo Técnico:**  
  En `scripts/verify-gates.mjs`:
  ```javascript
  if (norm.startsWith('openspec/') || norm.startsWith('docs/') || norm.startsWith('scripts/') || ...) return false;
  ```
  No comprueba `norm.includes('/scripts/')`. Cuando los archivos se encuentran en un subdirectorio como `ai-engineering/scripts/verify-gates.mjs`, la función `isProductionFile` devuelve `true` (lo considera código fuente de producción). Como consecuencia, los commits de mantenimiento o hardening (`fix(gate):`, `chore(hardening):`) son rechazados por supuesta violación de causalidad TDD en Node.js, mientras que en Python son aprobados. Esta discrepancia rompe la invariante de paridad políglota y bloquea pipelines de CI legítimos.
- **PoC Reproducible en Memoria:**
  ```powershell
  node -e "import('./scripts/verify-gates.mjs').then(m => console.log('Node:', m.isProductionFile('ai-engineering/scripts/verify-gates.mjs')));"
  # Node: true (FALSO POSITIVO)

  python -c "from scripts.verify_gates import is_production_file; print('Python:', is_production_file('ai-engineering/scripts/verify-gates.mjs'));"
  # Python: False (CORRECTO)
  ```
- **Remediación:**  
  Alinear `verify-gates.mjs` con `verify_gates.py` para usar:
  ```javascript
  if (norm.startsWith('scripts/') || norm.includes('/scripts/') || norm.startsWith('docs/') || norm.includes('/docs/') || ...) return false;
  ```

---

### `F-05`: Ausencia de Ejecución de Verificadores Físicos de RED en CI (Paper Tiger)
- **Severidad:** **ALTA**
- **CVSS v4.0:** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N` (Score: **7.1**)
- **CWE:** `CWE-693` (Protection Mechanism Failure), `CWE-358` (Inconsistently Implemented Security Design)
- **Categoría:** OWASP ASVS V1.1.2 (Security Architecture Verification)
- **Ubicación Exacta:** [.github/workflows/gate-validator.yml#L1-L153](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L1-L153)
- **Mecanismo Técnico:**  
  El repositorio cuenta con dos scripts avanzados: `scripts/verify-red-failure.mjs` y `scripts/verify_red_failure.py`, diseñados para ejecutar físicamente los tests de un commit RED y certificar que fallen por una aserción legítima. Sin embargo, **ninguno de estos scripts se encuentra incorporado en el workflow de CI (`gate-validator.yml`)**. Un agente o desarrollador puede realizar un commit `test(red)` con una prueba vacía o trivial (`expect(true).toBe(true)`), y el validador de CI lo aceptará ciegamente basándose sólo en el mensaje del commit y la presencia del archivo en `tests/`.
- **Remediación:**  
  Integrar un step obligatorio en el workflow `gate-validator.yml` o en el hook pre-push/pre-commit que invoque `node scripts/verify-red-failure.mjs` o `python scripts/verify_red_failure.py`.

---

### `F-06`: Argument Injection en Verificadores Físicos de RED (CWE-88)
- **Severidad:** **MEDIA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:N` (Score: **4.8**)
- **CWE:** `CWE-88` (Improper Neutralization of Argument Delimiters in a Command)
- **Categoría:** CWE Top 25
- **Ubicación Exacta:** [verify-red-failure.mjs#L84-L111](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify-red-failure.mjs#L84-L111) y [verify_red_failure.py#L78-L100](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/verify_red_failure.py#L78-L100)
- **Mecanismo Técnico:**  
  Ambos scripts ejecutan:
  `spawnSync('npx', ['vitest', 'run', ...tsFiles])` y `subprocess.run(["python", "-m", "pytest", *py_files])`.
  No se utiliza el delimitador de fin de opciones (`--`). Si un archivo de prueba comienza con un guión (`--config=malicious.js` o `-o=output`), el runner interpreta el nombre del archivo como una bandera CLI de configuración o ejecución.
- **Remediación:**  
  Rechazar rutas que comiencen con `-` y anteponer el delimitador `--`:
  ```javascript
  spawnSync('npx', ['vitest', 'run', '--', ...tsFiles])
  subprocess.run(["python", "-m", "pytest", "-q", "--", *py_files])
  ```

---

### `F-07`: Inyección de Parámetros y JSON en Scripts de Branch Protection
- **Severidad:** **MEDIA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:M/VA:N` (Score: **5.1**)
- **CWE:** `CWE-94` (Code/Parameter Injection), `CWE-116` (Improper Output Handling)
- **Categoría:** OWASP ASVS V5.1 (Input Validation)
- **Ubicación Exacta:** [setup-branch-protection.sh#L45](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/setup-branch-protection.sh#L45) y [setup_branch_protection.py#L75](file:///c:/Users/rayrabbit-oss-github/ai-engineering/scripts/setup_branch_protection.py#L75)
- **Mecanismo Técnico:**  
  En `setup-branch-protection.sh`, `${REVIEWS}` se interpola sin comillas dentro de un documento JSON:
  `"required_approving_review_count": ${REVIEWS}`.
  Si `${REVIEWS}` contiene `0, "enforce_admins": false`, inyecta campos no autorizados en el payload hacia la API de GitHub. Adicionalmente, `$REPO` y `$BRANCH` no se validan contra un patrón alfanumérico estricto (`^[a-zA-Z0-9_.-]+$`).
- **Remediación:**  
  Validar en Bash con `[[ "$REVIEWS" =~ ^[0-9]+$ ]]` y generar el payload mediante `jq` o Python (`json.dumps`).

---

### `F-08`: Denegación de Servicio (DoS / CPU Exhaustion) en Evaluación Numérica
- **Severidad:** **MEDIA**
- **CVSS v4.0:** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H` (Score: **6.9**)
- **CWE:** `CWE-400` (Uncontrolled Resource Consumption), `CWE-770` (Allocation of Resources Without Limits or Throttling)
- **Categoría:** OWASP ASVS V11.1 (Business Logic Security)
- **Ubicación Exacta:** [calculator.ts#L70-L86](file:///c:/Users/rayrabbit-oss-github/ai-engineering/src/calculator.ts#L70-L86) y [calculator.py#L43-L44](file:///c:/Users/rayrabbit-oss-github/ai-engineering/src/calculator.py#L43-L44)
- **Mecanismo Técnico:**  
  1. `evaluateSimple` / `evaluate_simple` no limita la longitud máxima de la cadena de entrada antes de aplicar `.split()`, permitiendo degradación por memoria (DoS).
  2. En Python, la operación `a ** b` en enteros sin límite (`power(9999, 999999)`) bloquea el hilo de ejecución por cálculo arbitrario de precisión de CPU.
- **Remediación:**  
  Establecer un límite estricto de longitud de entrada (ej. `max_len = 256` caracteres) y un límite máximo de exponente/magnitud (ej. `abs(b) <= 1000` y `abs(a) <= 1e9`).

---

### `F-09`: Mutante Sobreviviente y Vanity Coverage en Validación de Tipos (Python)
- **Severidad:** **MEDIA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:N/VI:L/VA:N` (Score: **4.1**)
- **CWE:** `CWE-398` (Indicator of Poor Code Quality), Test Suite Fragility
- **Categoría:** Mutation Testing & Real Coverage Assurance
- **Ubicación Exacta:** [test_calculator.py#L57-L66](file:///c:/Users/rayrabbit-oss-github/ai-engineering/tests/unit/test_calculator.py#L57-L66)
- **Mecanismo Técnico:**  
  Al ejecutar una prueba de mutación semántica en memoria donde se reemplazó `self._validate_number(a, b)` por `pass` en `SafeMathEngine.add`, **la suite completa de pytest continuó pasando exitosamente**.  
  La prueba unitaria `test_type_validation_raises` sólo comprueba `engine.add("10", 5)`. En Python, `'10' + 5` arroja nativamente un `TypeError` a nivel de lenguaje, enmascarando la ausencia de la validación interna del motor. La suite no comprueba que `engine.add("foo", "bar")` arroje `TypeError`, permitiendo que la concatenación de strings sobreviva sin ser detectada.
- **PoC Reproducible en Memoria:**
  `mut_3_remove_validation: SURVIVED` (Pytest exit code: 0 ante código desprovisto de validación).
- **Remediación:**  
  Fortalecer las aserciones de `test_type_validation_raises` para probar entradas del mismo tipo no numérico (ej. `engine.add("a", "b")`, `engine.add([], [])`) y validar el mensaje de error de la excepción (`match="Expected int or float"`).

---

### `F-10`: Asimetría de Contrato E2E (Invariante 15) en Stack TypeScript
- **Severidad:** **BAJA / INFORMATIVA**
- **CVSS v4.0:** `CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N` (Score: **0.0**)
- **CWE:** `CWE-1007` (Insufficient Visual Computing / Incomplete Specification)
- **Categoría:** Polyglot Architecture Consistency
- **Ubicación Exacta:** [.github/workflows/gate-validator.yml#L150-L153](file:///c:/Users/rayrabbit-oss-github/ai-engineering/.github/workflows/gate-validator.yml#L150-L153) y [package.json#L35-L39](file:///c:/Users/rayrabbit-oss-github/ai-engineering/package.json#L35-L39)
- **Mecanismo Técnico:**  
  El stack Python incluye una suite E2E dedicada (`tests/e2e/test_calculator_e2e.py`) ejecutada obligatoriamente en CI (`pytest -m e2e --tb=short`). En contraste, el stack TypeScript carece de suite `tests/ts/e2e` y el job de CI `test-typescript` no contempla paso E2E alguno.
- **Remediación:**  
  Crear `tests/ts/e2e/calculator.e2e.spec.ts` y añadir el step correspondiente en `gate-validator.yml`.

---

## 4. MÉTRICAS DE COBERTURA, MUTACIÓN, DEPENDENCIAS Y ARTEFACTOS

### Desglose de Cobertura Física Verificada:
- **TypeScript (v8 via Vitest):**
  - Statements: **85.48%** (Umbral: >= 80%) ✅
  - Ramas (Branches): **77.27%** (Umbral: >= 75%) ✅
  - Funciones: **100.00%** (Umbral: >= 80%) ✅
  - Líneas: **87.61%** (Umbral: >= 80%) ✅
- **Python (Coverage.py via Pytest):**
  - Líneas/Sentencias: **87.76%** (Umbral: >= 80.0%) ✅
  - Ramas (Branches): **83.87%** (Umbral: >= 75.0%) ✅
- **Evaluación de Mutación Semántica en Memoria:**
  - `mut_1_invert_zero_div` (Inversión división por cero): **KILLED** ✅
  - `mut_2_invert_power_neg` (Inversión exponente negativo): **KILLED** ✅
  - `mut_3_remove_validation` (Eliminación validación en `add`): **SURVIVED** ❌ (F-09)
  - `mut_4_invert_modulo_zero` (Inversión módulo por cero): **KILLED** ✅

### Seguridad de Cadena de Suministro (SCA):
- `npm audit`: **0 vulnerabilidades** reportadas. Dependencias directas e indirectas fijadas limpias.
- Python: dependencias de testing fijadas en `requirements-test.txt` (`pytest==9.0.3`, `coverage==7.16.1`, `pytest-cov==7.1.0`).

### Integridad Criptográfica de Artefactos de Distribución (`dist/`):
- Archivos compilados en `dist/` corresponden al 100% byte por byte con la salida determinista de `tsc`:
  - `dist/calculator.d.ts`: `SHA-256: F8309E8F505159B7E6F95D141EE00B2D724890185A807DC2E8329F90F15B3A75`
  - `dist/calculator.js`: `SHA-256: F64AA3FF57C0FD406A310E0C04600FD4AB83008871AEDB97A3CED52928585BE8`
  - `dist/index.d.ts`: `SHA-256: DAE2839F979363B50BE06F6E8A5B787F1EE6A5FB8C3F086DFC1E22E91406A7CD`
  - `dist/index.js`: `SHA-256: 44B78791F9F7AF6EECA54F627603B8C05F02AA680B1E21690709EEB455CE85B3`
- No existen secretos, archivos `.env`, directorios `.git` o cachés dentro de los entregables compilados.

---

## 5. BITÁCORA FORENSE DE EJECUCIÓN (AUDIT TRAIL)

| # | Comando Ejecutado | Exit Code | Observaciones Forenses |
| :-: | :--- | :-: | :--- |
| 1 | `git rev-parse --show-toplevel` | 0 | Confirmó que la raíz de Git es `C:/Users/rayrabbit-oss-github`. |
| 2 | `node scripts/verify-gates.mjs --self-test` | 0 | Self-test interno de JavaScript pasó exitosamente. |
| 3 | `python scripts/verify_gates.py --self-test` | 0 | Self-test interno de Python pasó exitosamente. |
| 4 | `node scripts/guard-agent.mjs` | 0 | Guardián verificó presencia de reglas mínimas y workflows. |
| 5 | `npm run test:ts:coverage` | 0 | Vitest ejecutó 20 tests; confirmó Cobertura: Líneas 87.61%, Ramas 77.27%. |
| 6 | `npm run test:py:coverage` | 0 | Pytest ejecutó 17 tests; confirmó Cobertura: Líneas 87.76%, Ramas 83.87%. |
| 7 | `npm audit` | 0 | SCA: 0 vulnerabilidades en dependencias NPM. |
| 8 | `npm run spec:validate` | 0 | OpenSpec: 2 especificaciones validadas contra esquema oficial. |
| 9 | `node scripts/verify-gates.mjs --allow-dirty` | 1 | Falló con falso positivo en `ai-engineering/scripts/verify-gates.mjs` (F-04). |
| 10 | `python scripts/verify_gates.py --allow-dirty` | 1 | Falló por commits históricos del repositorio principal (`rayrabbit-oss`). |
| 11 | Fuzzing PoC: Scope Basename Collision | 0 | Demostró bypass de autorización cruzada `button.test.ts` -> `button.ts` (F-03). |
| 12 | Fuzzing PoC: Empty Scope Detection | 0 | Ambos validadores rechazaron adecuadamente `tests/test_.py`. |
| 13 | Fuzzing PoC: Multi-Module Smuggling | 0 | Ambos validadores rechazaron adecuadamente el contrabando de módulos no probados. |
| 14 | Differential Path Resolution Probe | 0 | Confirmó asimetría políglota: Node devuelve `true`, Python `False` para scripts en subdirectorios (F-04). |
| 15 | Trojan Source Scan (Unicode Bidi/Zero-Width) | 0 | 0 caracteres maliciosos detectados en archivos de código o texto. |
| 16 | Semantic Mutation Testing (Python) | 0 | 3 mutantes aniquilados, 1 sobreviviente (`mut_3_remove_validation`, F-09). |
| 17 | `Get-FileHash dist/*` pre y post `npm run build` | 0 | Hashes SHA-256 coincidieron exactamente al 100%. |
| 18 | `git status --short ai-engineering` | 0 | Verificó limpieza forense absoluta; sin archivos residuales ni modificaciones espurias. |

---

## 6. PLAN DE REMEDIACIÓN PRIORIZADO

### Prioridad P0 — Bloqueantes Inmediatos (Requeridos antes de cualquier Push o Merge)
- [ ] **Remediar F-01 (PPE en CI):** Corregir el regex de detección en `.github/workflows/gate-validator.yml` para soportar subárboles (`(^|/)`) e incluir `package.json`, `pyproject.toml`, `requirements-test.txt` y `check_python_coverage.py`. Actualizar `.github/CODEOWNERS` con estos archivos.
- [ ] **Remediar F-02 (Script Injection en CI):** Eliminar la interpolación `${{ github.base_ref }}` en `run: |` y trasladarla a `env: BASE_REF`.
- [ ] **Remediar F-03 (Basename Collision):** Modificar `extractModuleName` en `verify-gates.mjs` y `verify_gates.py` para acoplar el ámbito a la ruta relativa del componente o espacio de nombres explícito, impidiendo que `tests/ui/button.test.ts` autorice `src/payments/button.ts`. Agregar caso adversarial a `--self-test`.
- [ ] **Remediar F-04 (Asimetría Políglota):** Modificar `isProductionFile` en `verify-gates.mjs` para excluir `norm.includes('/scripts/')`, `/docs/`, `/openspec/`, eliminando los falsos positivos en monorepos/subárboles.
- [ ] **Remediar F-05 (Enforcement Físico de RED):** Incorporar un paso obligatorio en `gate-validator.yml` que invoque `verify-red-failure.mjs` o `verify_red_failure.py` antes de autorizar la fase GREEN.

### Prioridad P1 — Hardening de CI y Cadena de Suministro
- [ ] **Remediar F-06 (Argument Injection):** Agregar el delimitador `--` en llamadas a `spawnSync`/`subprocess.run` en `verify-red-failure.mjs` y `verify_red_failure.py`.
- [ ] **Remediar F-07 (Inyección de Branch Protection):** Sanitizar `${REVIEWS}` y nombres de repositorio/rama con expresiones regulares estrictas en `setup-branch-protection.sh` y `setup_branch_protection.py`.
- [ ] **Remediar F-08 (DoS de Expresiones):** Fijar límite de longitud en `evaluateSimple`/`evaluate_simple` y límite de magnitud en exponentes en `power()`.

### Prioridad P2 — Robustez de Pruebas y Paridad de Arquitectura
- [ ] **Remediar F-09 (Aniquilar Mutante en Validación de Tipos):** Fortalecer `test_type_validation_raises` en `test_calculator.py` para asertar `engine.add("foo", "bar")` y comprobar el mensaje exacto de error.
- [ ] **Remediar F-10 (Paridad E2E TypeScript):** Implementar `tests/ts/e2e/calculator.e2e.spec.ts` y añadir el step correspondiente en `gate-validator.yml`.

---
**Firma:**  
*Principal Offensive Security Researcher & Adversarial Auditor*  
*RayRabbit AI Engineering Lab*
