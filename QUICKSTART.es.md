# Guía de Inicio Rápido: AI Engineering en 3 Minutos

[English](QUICKSTART.md) | [Español](QUICKSTART.es.md)

Bienvenido al template oficial de **RayRabbit AI Engineering**. Esta guía te muestra cómo arrancar un nuevo proyecto con desarrollo determinista asistido por agentes.

---

## Paso 1: Inicializar tu Proyecto

### Opción A: Desde GitHub
Pulsa el botón verde **"Use this template"** en [https://github.com/rayrabbit-ai/ai-engineering](https://github.com/rayrabbit-ai/ai-engineering).

### Opción B: Clonar Localmente
```bash
git clone https://github.com/rayrabbit-ai/ai-engineering.git mi-nuevo-proyecto
cd mi-nuevo-proyecto
```

---

## Paso 2: Instalar Dependencias

### TypeScript / Node.js:
```bash
npm ci
npm run test:ts:coverage
```

### Python:
```bash
python -m pip install -r requirements-test.txt
python -m pip install --no-deps --no-build-isolation -e .
npm run test:py:coverage
```

---

## Paso 3: Activar el Bloqueo Físico de Rama (1 Comando)

Las plantillas de GitHub no copian la protección de ramas por política de seguridad. Para bloquear físicamente el botón de merge y requerir las compuertas de CI en `main`:

```bash
# Opción A: Automático mediante GitHub CLI (recomendado)
npm run setup:branch-protection

# Opción B: Desde la interfaz web de GitHub
# Sigue el paso a paso detallado en docs/BRANCH_PROTECTION.es.md
```

---

## Paso 4: Tu Primer Flujo SDD + TDD con el Agente

Abre tu asistente de codificación preferido (Google Antigravity, Cursor, Claude Code, Copilot, etc.):

1. **Crear una Especificación**:
   Escribe una nueva spec en `openspec/specs/<mi-capacidad>/spec.md` con escenarios Given/When/Then.
   Valida con:
   ```bash
   npm run spec:validate
   ```

2. **Ejecutar Triage**:
   Escribe al agente:
   ```text
   /opsx-triage mi-cambio
   ```
   El agente analizará los archivos y aplicará la regla R1-R5 sin tocar código.

3. **Ejecutar Ciclo TDD**:
   Escribe al agente:
   ```text
   /opsx-apply mi-cambio
   ```
   El agente implementará mediante compuertas estrictas: RED -> GREEN -> REFACTOR -> INTEGRATION -> HARDENING, realizando commits atómicos acoplados por ámbito.

4. **Verificar Compuertas antes de Enviar**:
   Antes de abrir un Pull Request, audita las compuertas:
   ```bash
   # Validador Node.js
   npm run verify:gates

   # Validador Python
   npm run verify:gates:py

   # Suite automatizada de red team de 10 dominios
   npm run audit:redteam

   # O el workflow completo de auditoría adversarial
   /opsx-audit
   ```

Al abrir un Pull Request en GitHub, `.github/workflows/gate-validator.yml` auditará mecánicamente los commits, la cobertura separada y las especificaciones antes de que GitHub habilite el merge.
