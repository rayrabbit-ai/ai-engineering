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

### Si tu proyecto es TypeScript / Node.js:
```bash
npm install
npm run test:ts:coverage
```

### Si tu proyecto es Python:
```bash
pip install -e .[test]
npm run test:py:coverage
```

---

## Paso 3: Tu Primer Flujo SDD + TDD con el Agente

Abre tu asistente de codificación preferido (Google Antigravity, Cursor, Claude Code, etc.):

1. **Crear una Especificación**:
   Escribe una nueva spec en `openspec/specs/<mi-capacidad>/spec.md` con escenarios Given/When/Then.
   Valida con:
   ```bash
   npx @fission-ai/openspec validate --all
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
   El agente ejecutará las compuertas RED -> GREEN -> REFACTOR -> INTEGRATION -> HARDENING, realizando un commit atómico en cada fase con acoplamiento estricto de ámbito.

4. **Validar antes de Enviar PR**:
   Antes de hacer push, ejecuta la auditoría determinista de compuertas:
   ```bash
   # Validador Node.js
   npm run verify:gates

   # Validador Python
   npm run verify:gates:py

   # O el workflow adversarial completo
   /opsx-audit
   ```
   El validador confirmará que tus commits cumplen con la causalidad TDD por ámbito, que el baseline está intacto y que las especificaciones no fueron alteradas directamente.

¡Listo! Cuando abras un Pull Request en GitHub, el flujo `.github/workflows/gate-validator.yml` auditará el PR automáticamente.
