# Manual Operativo y Runbook de Prompts (P0 – P11)

> **RayRabbit AI Engineering Standard**  
> *Secuencias de prompts y compuertas operativas para dirigir agentes de codificación de forma determinista.*

---

## 1. Matriz de Routing y Triage (R1 – R5)

Al inicio de cualquier tarea, se ejecuta el prompt **P0 (Triage)** para clasificar el alcance:

| Regla | Condición | Flujo Destino | Modo Operativo |
|---|---|---|---|
| **R1 GREENFIELD** | Todos los archivos involucrados son nuevos | `/opsx-apply` + Ciclo TDD Fases 1 a 6 | `--suite` o puro |
| **R2 BUG** | Reporte de defecto sobre funcionalidad existente | `/opsx-bugfix` (Regression-test-first) | `--incremental` |
| **R3 STRANGLE** | Módulo legacy con deuda técnica que se reescribe | `/opsx-strangle` (Test de paridad) | Paralelo / Dual |
| **R4 LEGACY-TOUCH** | Módulo legacy SIN tests de caracterización | `/opsx-characterize` primero y luego `/opsx-apply` | `--incremental` + Legacy-Guard |
| **R5 LEGACY-COVERED** | Módulo legacy YA protegido con tests baseline | `/opsx-apply` directo | `--incremental` + Legacy-Guard |

---

## 2. Secuencia de Prompts Operativos (P0 a P11)

Copia y pega estos prompts en tu chat con el agente según la fase de trabajo:

### P0 — Triage
```text
Procede con /opsx-triage sobre el cambio en curso.
Resuelve tú el change o usa openspec list --json.
Devuélveme la tabla de routing (archivo -> nuevo/legacy -> caracterizado? -> deuda técnica) aplicando las reglas R1 a R5, el workflow destino y el modo (--incremental o puro).
PROHIBIDO editar código o tests en este paso.
```

### P1 — Characterize (Congelar Legacy)
```text
Procede con /opsx-characterize sobre los módulos legacy marcados sin baseline en el triage.
Inventaría el comportamiento observable ACTUAL sin modificar código de producción. Crea tests con tag @legacy-baseline y @known-bug:<id>. Ejecútalos en terminal mostrando que son 100% VERDES contra el código intocado. Haz un commit exclusivo "test(baseline): characterization <modulo>".
```

### P2 — Apply + RED (Compuerta RED)
```text
Procede con /opsx-apply sobre el change del triage aplicando estrictamente el skill tdd-workflows-tdd-cycle.
Compuerta Fase 2 (RED): crea primero los tests, ejecútalos en terminal y muéstrame el fallo legítimo antes de tocar producción. La suite @legacy-baseline debe seguir verde. Realiza el commit "test(red): <tarea>". Luego STOP y repórtame.
```

### P3 — GREEN (Implementación Mínima)
```text
Confirmo compuerta RED. Procede con Fase 3 (GREEN) del change en curso.
Implementa el código MÍNIMO estricto para hacer pasar los tests en rojo, sin añadir features extra. Ejecuta la suite completa en terminal: debe estar 100% verde con reporte de cobertura (≥80% líneas / ≥75% ramas). Legacy-guard sobre los módulos caracterizados verificado. Commit "feat(green): <tarea>". Luego STOP y repórtame.
```

### P4 — REFACTOR (Calidad con Suite Verde)
```text
Procede con Fase 4 (REFACTOR) sobre el change en curso.
Aplica principios SOLID, elimina duplicaciones (>3 líneas), descompón métodos (>20 líneas) y reduce complejidad ciclomática (<10). Ejecuta la suite tras CADA modificación asegurando que continúe 100% verde. Refactoriza también los tests sin bajar cobertura. Commit "refactor: <modulo>". STOP y repórtame.
```

### P5 — Integración (Contratos de Módulo)
```text
Procede con Fase 5 (INTEGRATION) sobre el change en curso.
Tests de integración que FALLEN primero modelando la interacción entre componentes y contratos de interfaz. Muestra el fallo legítimo en terminal. Luego implementa la integración mínima hasta pasar la suite completa. Commit "test(integration): <modulo>". STOP y repórtame.
```

### P6 — Hardening (Resiliencia y Revisión)
```text
Procede con Fase 6 (HARDENING) sobre el change en curso.
Añade pruebas de boundary, stress y error recovery según los riesgos del change. Realiza una revisión arquitectónica final. Aplica sugerencias críticas manteniendo verde. Commit "chore(hardening): <modulo>". STOP y repórtame.
```

### P7 — Gate E2E (Runtime Real)
```text
Procede con /opsx-e2e sobre el change en curso.
Ejecuta la suite en runtime real (pytest -m e2e / vitest).
- Verde -> Cierre OK.
- Rojo -> Bucle de autocorrección (máximo 3 reintentos).
- Si supera los 3 intentos o toca seguridad crítica -> STOP y consúltame (HITL).
```

### P8 — Cierre Formal y Sincronización
```text
Cierra el change en curso: /opsx-sync y luego /opsx-archive SOLO si la DoD está completa (suites verdes, cobertura alcanzada, fases 4-6 completas, commits por compuerta verificados). Si algo falla NO archives y avísame.
```

### P9 — Corrección de Defectos (Bugfix)
```text
Procede con /opsx-bugfix sobre el siguiente reporte: [PEGA AQUÍ EL BUG EN LENGUAJE NATURAL].
Test de regresión primero, muestra el fallo legítimo en terminal antes de tocar producción; fix mínimo; suite completa + @legacy-baseline verde; commit "fix: <descripcion>"; métrica escape +1.
```

### P10 — Actualización de Especificación
```text
Procede con /opsx-update sobre el change en curso con esta revisión: [TEXTO LIBRE].
Actualiza proposal.md, design.md y specs/ antes de escribir cualquier código. Confirma los cambios conmigo.
```

### P11 — Failure Recovery (Vuelta a la Calma)
```text
Failure Recovery sobre el change en curso: STOP.
Identifica qué fase se violó, realiza rollback al último commit de compuerta válido (git log --oneline), retoma desde la fase correcta con el prompt correspondiente y documenta la lección aprendida.
```
