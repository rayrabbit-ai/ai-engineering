# Informe de remediación y revisión del upstream

**Fecha:** 14 de octubre de 2026  
**Upstream revisado:** `rayrabbit-ai/ai-engineering`, rama `main`, commit `6a64827bdecfbbd55595fd927b042574163f5250`.  
**Workspace local:** parte de `be293ec7c2ac336da5c59e7f2ee074a753dee355`, con correcciones locales no publicadas.  
**Alcance:** revisión de seguridad y comportamiento de la actualización pública, más estado de la remediación local iniciada en esta instancia.

## Dictamen

**Sí, la actualización mejora la implementación respecto al estado auditado**, sobre todo en la mitigación de CWE-78, la regresión de scope vacío, el manejo explícito del commit semilla, CODEOWNERS y el nuevo verificador de fase RED. Sin embargo, la frase del commit “resolve all audit findings” no queda respaldada en su totalidad: `npm ci` y `npm audit` reproducen **7 advisories** (4 altos y 3 moderados); el gate RED nuevo no se invoca desde CI y trata cualquier fallo del runner como “RED legítimo”; branch protection continúa sin poder verificarse en GitHub.

Las pruebas funcionales del nuevo `main` pasan en este contenedor, pero eso no equivale a una auditoría limpia ni demuestra configuración remota.

## Mejoras del commit público

- `verify-gates.mjs` usa `spawnSync` con argv, valida referencias y agrega regresiones para scope vacío e inyección. Python usa `subprocess` con `shell=False` y casos equivalentes.
- Ambos validadores ahora limpian el nombre de módulo y rechazan RED sin módulo inferible ni scope explícito.
- El workflow calcula un rango distinto para PR y push; token de GitHub limitado a `contents: read`.
- Se añadió `verify-red-failure` para ejecutar tests staged y comprobar código de salida no cero.
- Se añadió `.github/CODEOWNERS` y el setup solicita review de Code Owners, una aprobación y eliminación de reviews obsoletas.
- Se añadió un gate Python separado de líneas y ramas.

## Lo que aún no está resuelto en el upstream

### Dependencias Node: 7 advisories siguen presentes

Ejecuté `npm ci` en una copia aislada del commit remoto; npm reportó **7 vulnerabilidades: 4 altas y 3 moderadas**. La cadena `@fission-ai/openspec -> fast-glob -> micromatch -> braces` sigue afectada. El override declara `braces: ^3.0.3`, y el advisory reporta vulnerables las versiones `<=3.0.3`; por tanto ese override no elimina el hallazgo. Vitest 3.2.7 también recibe advisories moderados; npm propone Vitest 5.0.4 como fix, pero requiere Node 24 en CI.

`npm ci` reproducible es una mejora, pero reproducir una instalación vulnerable no resuelve el advisory. `npm audit --omit=dev` no se usó para excusar esto: las dependencias se ejecutan en desarrollo/CI.

### F-08: el RED físico es parcial y voluntario

Los scripts `verify-red-failure.mjs` y `verify_red_failure.py` consideran legítimo **cualquier** exit code distinto de cero. Eso puede ser una aserción fallida, pero también un error de sintaxis, colección, import, runner o dependencia ausente. El workflow `gate-validator.yml` no ejecuta `verify:red` ni `verify:red:py`; aparecen como scripts de package y documentación, no como un check CI requerido.

El verificador de test busca staged y, si no encuentra archivos, cae a los tests de HEAD. No persiste una attestation del resultado ni codifica qué test/assertion falló. Es una mejora local para el flujo del agente, no evidencia CI inviolable.

### F-01: protección de reglas condicionada a GitHub

El workflow nuevo solo imprime un aviso si el PR toca workflows/scripts/reglas. La barrera efectiva depende de `require_code_owner_reviews` y de que el archivo CODEOWNERS sea reconocido. El CODEOWNERS del commit incluye `dev@rayrabbit.site` como owner; GitHub CODEOWNERS requiere nombres de usuario/equipos, no una dirección de correo como owner. Además, desde esta sesión no se pudo confirmar si existe el equipo `@rayrabbit-ai/maintainers` ni si la branch protection fue aplicada. La API pública de protección respondió HTTP 401.

El script de setup sí solicita review de Code Owners; no debe considerarse efectivo hasta comprobar la configuración y corregir/validar todos los owners del archivo.

### Claims del README siguen exagerados

El README mantiene “first deterministic”, “strict TDD causality”, “zero production code without a verified failing test”, “max 3 retries -> HITL” y bloqueo físico. Los scripts no verifican la causa semántica del fallo RED; la documentación A/B no publica artefactos para reproducir el benchmark. Hay una diferencia entre reglas del agente y controles automáticos de CI.

### Otras limitaciones

- Actions siguen referenciadas por tags (`@v4`, `@v5`), no SHA inmutables.
- Python instala rangos (`pytest>=8`, `pytest-cov>=5`) y no tiene requirements lock; no hay scan `pip-audit` en CI.
- La auditoría de modificación de gates reporta al log, pero no falla por sí misma; confía en la review de Code Owners.
- No se pudo comprobar branch protection, status checks requeridos ni el equipo de CODEOWNERS desde este entorno.

## Pruebas sobre el commit remoto

| Comprobación | Resultado |
|---|---|
| `npm ci` | Instala; audit incorporado por npm reporta 7 vulnerabilidades (4 altas, 3 moderadas). |
| `npm run verify:gates -- --self-test` | Pasa; incluye casos F-02/F-03. |
| TypeScript baseline | 3/3 pasan. |
| TypeScript coverage | 20/20 pasan; líneas 89.38%, ramas 78.48%. |
| `npm run spec:validate` | 2 válidos, 0 fallidos. |
| `npm run build` | Pasa. |
| Python self-test | Pasa, incluidos F-02/F-03. |
| Python baseline | 2/2 pasan. |
| Python `npm run test:py:coverage` | 20/20 pasan; líneas 87.76%, ramas 83.87%. La invocación no filtra marcadores, así que también ejecuta la prueba marcada E2E. |
| `pytest -m e2e --tb=short` | 1/1 pasa. |
| `npm audit` | 7 vulnerabilidades remanentes. |
| Branch protection API | HTTP 401; estado remoto no comprobable. |

Python se ejecutó con 3.14.2; el workflow remoto fija 3.11, versión no instalada en esta instancia.

## Estado de la remediación local

Además del commit público, esta instancia contiene correcciones locales sobre el checkout anterior: validadores argv seguros, scope vacío rechazado, refs normalizadas a SHA, root commit baseline, Python coverage separado, lock Python, Node 24, acciones fijadas por SHA, Dependabot, E2E explícito, branch-review de una aprobación y documentación bilingüe corregida. En la copia local `npm audit` quedó en **0 vulnerabilidades** después de fijar Vitest/coverage 5.0.4 y usar OpenSpec CLI 0.17.2; esta versión de OpenSpec pasó `list` y `validate --all` para los artefactos actuales. Es un downgrade frente a la línea 1.x del upstream y conviene decidirlo conscientemente.

**No confundas las dos copias:** el ZIP que se entrega desde este workspace contiene las correcciones locales aplicadas al checkout anterior, no el commit público `6a64827` completo (que además añade CODEOWNERS y verificador RED). No se ha hecho commit ni push.

## Recomendación

Tomar el commit público como **mejora**, no como cierre de auditoría. Prioridad siguiente:

1. Resolver o aceptar formalmente los advisories Node; probar Vitest 5/Node 24 y decidir entre OpenSpec 1.x con riesgo transitorio o 0.17.2 con downgrade.
2. Corregir y validar CODEOWNERS con owners GitHub reales; verificar branch protection con una cuenta admin y hacer que tocar reglas críticas requiera review efectiva.
3. Endurecer el verificador RED: solo contar fallos de aserción del test objetivo; fallar en errores de colección/runner; ejecutar el gate en workflow/check requerido o describirlo como local opt-in.
4. Actualizar los README y el caso A/B para separar metodología, auto-reporte y enforcement demostrable.
5. Fijar Actions por SHA y dependencias Python; incluir `pip-audit` periódico si se quiere declarar el análisis de supply chain como gate.

## Cómo descargar las correcciones de esta instancia

El enlace siguiente es un ZIP generado desde el workspace local, no el remoto de GitHub:

[Descargar ai-engineering-corregido.zip](../dist/ai-engineering-corregido.zip)

En Linux/macOS:

```bash
unzip ai-engineering-corregido.zip -d ai-engineering-corregido
cd ai-engineering-corregido
npm ci
python -m pip install -r requirements-test.txt
python -m pip install --no-deps --no-build-isolation -e .
```

La URL pública ya contiene el commit `6a64827`, pero sigue presentando los advisories Node descritos arriba. Clonar GitHub obtiene ese commit; el ZIP contiene el estado local corregido de esta instancia. Para que cualquiera de los dos estados llegue a GitHub, un propietario debe revisarlo y publicar una rama/PR.

## Comandos ejecutados para revisar el commit actualizado

```text
git ls-remote https://github.com/rayrabbit-ai/ai-engineering.git refs/heads/main
curl -fsSL 'https://api.github.com/repos/rayrabbit-ai/ai-engineering/commits/main' -H 'Accept: application/vnd.github+json' -H 'User-Agent: repo-audit-followup' | jq -r '[.sha, .commit.author.date, .commit.message, .html_url] | @tsv'
git clone --depth=1 https://github.com/rayrabbit-ai/ai-engineering.git /tmp/rayrabbit-ai-engineering-upstream
git -C /tmp/rayrabbit-ai-engineering-upstream show --stat --oneline --decorate HEAD
npm audit --json --prefix /tmp/rayrabbit-ai-engineering-upstream | jq -r '"SUMMARY " + (.metadata.vulnerabilities|tojson), (.vulnerabilities|keys[])'
npm audit --json --prefix /tmp/rayrabbit-ai-engineering-upstream | jq -r '.vulnerabilities|to_entries[]|[.key,.value.severity,.value.range,([.value.via[]|if type=="object" then (.title+" ("+.url+")") else . end]|join("; ")),(.value.fixAvailable|tojson)]|@tsv'
git -C /tmp/rayrabbit-ai-engineering-upstream grep -n -E 'verify:red|verify_red_failure|e2e|pytest -m' HEAD -- package.json .agent .github scripts README.md README.es.md
git -C /tmp/rayrabbit-ai-engineering-upstream grep -n -E 'strict TDD|all findings|physically|HITL|verified failing|zero vulnerabilities|OpenSpec|npm audit' HEAD -- README.md README.es.md docs scripts package.json .github
curl -sS -o /dev/null -w 'branch-protection-http=%{http_code}\n' 'https://api.github.com/repos/rayrabbit-ai/ai-engineering/branches/main/protection' -H 'Accept: application/vnd.github+json' -H 'User-Agent: upstream-recheck'
cd /tmp/rayrabbit-ai-engineering-upstream && npm ci && npm run verify:gates -- --self-test && npm run test:ts:baseline && npm run test:ts:coverage && npm run spec:validate && npm run build
cd /tmp/rayrabbit-ai-engineering-upstream && python -m pip install -e '.[test]' && python scripts/verify_gates.py --self-test && pytest -m legacy_baseline --tb=short && npm run test:py:coverage && pytest -m e2e --tb=short && python -m py_compile scripts/verify_gates.py scripts/verify_red_failure.py scripts/check_python_coverage.py
```

El historial detallado de la primera auditoría y sus probes previos permanece en el [informe inicial](auditoria-ai-engineering-y-vulnerabilidades.es.md).
