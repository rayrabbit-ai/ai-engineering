# Guía: Experimento A/B de Calidad y Uso de Cobertura (Coverage)

> **RayRabbit AI Engineering Standard**  
> *Cómo ejecutar el experimento de contraste A/B y utilizar la cobertura de código como compuerta de calidad.*

---

## Parte 1: El Experimento de Contraste A/B (AI Engineering vs. Vibe Coding)

Este experimento reproducible demuestra empíricamente por qué la asistencia de IA sin restricciones ("vibe coding") produce regresiones silenciosas, y cómo el framework determinista las detecta y bloquea al instante.

### Línea Base (Sesión 1: Bajo Gobernanza Determinista)
En `ai-engineering`, el componente `math-engine` fue implementado bajo estricta disciplina SDD + TDD:
1. **Especificación**: Aprobada en `openspec/changes/math-engine/` y `openspec/specs/math-engine/spec.md`.
2. **Compuertas**: Commits secuenciales: `test(red)` -> `feat(green)` -> `refactor` -> `test(integration)` -> `chore(hardening)`.
3. **Legacy-Guard**: Suite de caracterización etiquetada como `@legacy-baseline` congelada en:
   - TypeScript: `tests/ts/characterization/calculator.legacy.spec.ts`
   - Python: `tests/characterization/test_calculator_legacy.py`
4. **Resultado**: 100% de tests verdes, >90% de cobertura de líneas, 0 errores de compuerta (`npm run verify:gates`).

---

### El Experimento (Sesión 2: Modo "Vibe Coding" sin Reglas)
Abre una nueva ventana o sesión de agente sin reglas activas y dale esta instrucción:
> *"Agrega el operador de módulo `%` y el de potencia `^` a la calculadora, y modifica la división para que dividir por cero devuelva `null` en lugar de lanzar error."*

#### Lo que hace el agente sin disciplina:
1. Edita `src/calculator.ts` directamente sin escribir primero un test que falle.
2. Cambia la lógica de división para devolver `null`, rompiendo el contrato preexistente.
3. Hace un único commit directo: `feat: add modulo and power operators`.
4. No escribe pruebas para casos borde o escribe tests triviales que pasan a la primera.

#### La Auditoría Forense (Volviendo a la Sesión 1):
Al ejecutar las herramientas de auditoría en la sesión gobernada:
```bash
# 1. Auditar historial de commits y causalidad TDD
npm run verify:gates
```
**Violaciones Atrapadas:**
* ❌ **Violación de Causalidad TDD (Invariantes 1 y 3)**: El commit `feat:` carece de un commit previo `test(red):` en la rama.
* ❌ **Fallo de Legacy-Guard (Invariantes 2 y 6)**: La prueba `@legacy-baseline` falla porque la división por cero ya no lanza la excepción acordada.
* ❌ **Violación de Compuerta Pre-Código (Invariante 14)**: Se alteró el contrato de la API sin un delta de spec aprobado en `openspec/`.

```bash
# 2. Verificar caída de cobertura
npm run test:ts:coverage
```
* ❌ **Caída de Cobertura (Invariante 4)**: Las nuevas ramas sin probar del operador de potencia y módulo reducen la cobertura por debajo del 80%, bloqueando la integración continua.

---

## Parte 2: Cómo se Interpreta y Utiliza la Cobertura (Coverage)

### 1. Ejecución de Pruebas con Cobertura
```bash
# TypeScript / Vitest (Istanbul / v8)
npm run test:ts:coverage

# Python (pytest-cov)
npm run test:py:coverage
```

### 2. Inspección Visual en el Navegador
Abre en tu navegador el archivo generado:
```text
file:///ruta-de-tu-repo/ai-engineering/coverage/index.html
```

#### Significado de las Métricas:
* **Statements**: Porcentaje de sentencias de código ejecutadas por las pruebas.
* **Branches**: Porcentaje de bifurcaciones (`if / else`, operadores ternarios, `switch`) evaluadas tanto en su caso verdadero como falso.
* **Functions**: Porcentaje de funciones o métodos llamados.
* **Lines**: Porcentaje de líneas de código visitadas.

#### Detección Visual de Deuda Técnica:
* **Resaltado Verde**: Código probado y cubierto.
* **Resaltado Rojo**: Código muerto, bloques de error no testeados o ramas lógicas no alcanzadas.
* **Exclusión de Archivos de Re-exportación**: Los puntos de entrada que solo re-exportan (como `src/index.ts`) se excluyen en `vitest.config.ts`:
  ```typescript
  coverage: {
    exclude: ['src/index.ts', 'dist/**'],
    lines: 80,
    branches: 75,
  }
  ```

### 3. Cobertura como Compuerta Inmutable en CI/CD
En `.github/workflows/gate-validator.yml`, la cobertura no es una sugerencia; es una compuerta dura:
* Si la cobertura de líneas cae por debajo del 80% o la de ramas por debajo del 75%, el proceso termina con código `1` y **GitHub Actions rechaza el Pull Request automáticamente**.
