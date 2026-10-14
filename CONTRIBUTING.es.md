# Guía de Contribución — RayRabbit AI Engineering

[English](CONTRIBUTING.md) | [Español](CONTRIBUTING.es.md)

Gracias por tu interés en contribuir a **RayRabbit AI Engineering**. Este repositorio sigue una disciplina estricta de desarrollo determinista gobernada por compuertas en CI.

---

## 1. Reglas de Oro

1. **Ningún código sin especificación previa**: Todo cambio arquitectónico o nueva funcionalidad debe comenzar con una propuesta en OpenSpec (`openspec/changes/<id>/`).
2. **Causalidad TDD Estricta**: Cada Pull Request debe demostrar que cada commit `feat(green)` o `fix` está precedido por un commit `test(red)` del **mismo módulo o ámbito**.
3. **Inmutabilidad de Specs Consolidadas**: No modifiques directamente `openspec/specs/` en commits de código; utiliza deltas y sincroniza con `spec(sync):`.
4. **Cero Mocks en Código de Producción**: En `src/`, el código debe ser 100% funcional.
5. **Agnosticismo de Entorno en Python**: Usa siempre `pathlib.Path` e `importlib.resources`. Prohibido `os.path` y `sys.path`.

---

## 2. Flujo de Trabajo para Pull Requests

1. **Bifurcar y clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/ai-engineering.git
   cd ai-engineering
   ```

2. **Instalar dependencias**:
   ```bash
   # TypeScript / Node.js
   npm install

   # Python
   pip install -e .[test]
   ```

3. **Ejecutar el ciclo TDD**:
   - Crear el test en rojo: `git commit -m "test(red)(<modulo>): mensaje"`
   - Implementar código mínimo: `git commit -m "feat(green)(<modulo>): mensaje"`
   - Refactorizar manteniendo verde: `git commit -m "refactor: mensaje"`

4. **Auditoría Local Pre-Push**:
   Antes de abrir tu Pull Request, ejecuta la verificación determinista:
   ```bash
   # Validador Node.js
   npm run verify:gates

   # Validador Python
   npm run verify:gates:py

   # Autochequeo adversarial
   node scripts/verify-gates.mjs --self-test
   python scripts/verify_gates.py --self-test

   # Cobertura de pruebas (debe ser ≥ 80%)
   npm run test:ts:coverage
   npm run test:py:coverage
   ```

Si todos los checks pasan, abre tu PR. GitHub Actions validará automáticamente las compuertas.
