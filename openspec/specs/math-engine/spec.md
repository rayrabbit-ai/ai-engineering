# Math Engine Specification

## Purpose
Motor de cálculo matemático seguro y determinista con validación estricta de tipos y manejo de errores.

## Requirements

### Requirement: Operaciones Aritméticas Básicas
El sistema SHALL calcular sumas, restas, multiplicaciones y divisiones con validación de tipos numéricos.

#### Scenario: Suma y resta de enteros
- **WHEN** se invocan las operaciones `add(10, 5)` o `subtract(10, 5)`
- **THEN** el motor debe retornar `15` y `5` respectivamente

#### Scenario: División segura por cero
- **WHEN** se invoca `divide(10, 0)`
- **THEN** el sistema SHALL lanzar una excepción controlada de división por cero

### Requirement: Evaluación de Expresiones Aritméticas
El sistema SHALL interpretar y evaluar expresiones matemáticas en formato string respetando la precedencia de operadores.

#### Scenario: Precedencia de multiplicación sobre suma
- **WHEN** se evalúa la expresión `"10 + 5 * 2"`
- **THEN** el resultado debe ser `20` sin recurrir a funciones inseguras de ejecución
